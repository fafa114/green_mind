import asyncio
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.db import SessionLocal
from app.models import Alarm, CemsRaw, User
from app.services import workorder_svc
from app.utils.deps import get_current_user, get_db, require_role

router = APIRouter(prefix='/api/alarms', tags=['alarms'])
POLLUTANTS = ('pm', 'so2', 'nox', 'co', 'hcl')

def alarm_dict(a):
    return {c.name: getattr(a, c.name) for c in Alarm.__table__.columns}

def scan(db: Session, since: datetime | None = None):
    cutoff = since or (datetime.utcnow() - timedelta(minutes=10))
    rows = db.query(CemsRaw).filter(CemsRaw.ts >= cutoff, CemsRaw.condition_flag != 'shutdown').order_by(CemsRaw.ts).all()
    created = []
    for row in rows:
        candidates = []
        for p in POLLUTANTS:
            value, limit = getattr(row, p + '_std'), getattr(row, p + '_limit')
            if row.report_flag != 1 or value is None or limit is None or limit <= 0:
                continue
            level = 'red' if value >= 1.5 * limit else 'orange' if value >= limit else 'yellow' if value >= .8 * limit else None
            if level:
                candidates.append((p, value, limit, level))
        if row.comm_flag:
            candidates.append(('comm', 1, 0, 'yellow'))
        if row.furnace_temp is not None and row.furnace_temp < 900:
            candidates.append(('furnace_temp', row.furnace_temp, 900, 'red' if row.furnace_temp < 850 else 'yellow'))
        for pollutant, value, limit, level in candidates:
            exists = db.query(Alarm.id).filter(Alarm.device_id == row.device_id, Alarm.pollutant == pollutant,
                Alarm.level == level, Alarm.ts >= row.ts - timedelta(minutes=30), Alarm.ts <= row.ts).first()
            if exists:
                continue
            alarm = Alarm(device_id=row.device_id, ts=row.ts, level=level, pollutant=pollutant,
                          value=value, limit_val=limit, reason='规则触发，待人工核实')
            db.add(alarm)
            db.commit()
            db.refresh(alarm)
            created.append(alarm)
            if level in ('red', 'orange'):
                try:
                    workorder_svc.create_from_alarm(db, alarm)
                except HTTPException:
                    pass
    return created

@router.get('/stream')
async def stream(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=['HS256'])
        if not db.get(User, int(payload.get('sub', 0))):
            raise ValueError()
    except (JWTError, ValueError):
        raise HTTPException(401, '未登录')
    latest = db.query(Alarm.id).order_by(Alarm.id.desc()).first()
    async def events():
        last_id = latest[0] if latest else 0
        while True:
            session = SessionLocal()
            try:
                rows = session.query(Alarm).filter(Alarm.id > last_id).order_by(Alarm.id).limit(100).all()
                for alarm in rows:
                    last_id = alarm.id
                    data = {k: getattr(alarm, k) for k in ('id', 'level', 'device_id', 'pollutant', 'value')}
                    data['summary'] = alarm.reason or ''
                    yield 'event: alarm\ndata: ' + json.dumps(data, ensure_ascii=False) + '\n\n'
            finally:
                session.close()
            await asyncio.sleep(2)
    return StreamingResponse(events(), media_type='text/event-stream')

@router.get('')
def list_alarms(level: str | None = None, status: str | None = None, device_id: str | None = None,
                start: datetime | None = None, end: datetime | None = None, page: int = Query(1, ge=1),
                page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Alarm)
    for column, value in ((Alarm.level, level), (Alarm.status, status), (Alarm.device_id, device_id)):
        if value:
            q = q.filter(column == value)
    if start:
        q = q.filter(Alarm.ts >= start)
    if end:
        q = q.filter(Alarm.ts < end)
    total = q.count()
    return {'items': [alarm_dict(a) for a in q.order_by(Alarm.ts.desc(), Alarm.id.desc()).offset((page-1)*page_size).limit(page_size)],
            'total': total, 'page': page, 'page_size': page_size}

@router.post('/scan')
def scan_now(db: Session = Depends(get_db), user: User = Depends(require_role('admin'))):
    return {'created': len(scan(db))}

@router.get('/{alarm_id}')
def detail(alarm_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    alarm = db.get(Alarm, alarm_id)
    if not alarm:
        raise HTTPException(404, '告警不存在')
    return alarm_dict(alarm)

@router.post('/{alarm_id}/ack')
def ack(alarm_id: int, db: Session = Depends(get_db), user: User = Depends(require_role('admin', 'engineer'))):
    alarm = db.get(Alarm, alarm_id)
    if not alarm:
        raise HTTPException(404, '告警不存在')
    if alarm.status == 'pending':
        alarm.status = 'acked'
        db.commit()
    return alarm_dict(alarm)

