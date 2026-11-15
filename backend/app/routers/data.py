from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Alarm, CemsRaw, Device
from app.utils.deps import get_current_user, get_db
from app.models import ReplayState
from app.services.excel_replay import current_cursor

router = APIRouter(prefix='/api/data', tags=['data'], dependencies=[Depends(get_current_user)])
POLLUTANTS = ('pm', 'so2', 'nox', 'co', 'hcl')
FIELDS = ('furnace_temp', 'flow') + tuple(field for p in POLLUTANTS for field in (p + '_std', p + '_limit'))

def row_dict(row):
    return {c.name: getattr(row, c.name) for c in CemsRaw.__table__.columns}

@router.get('/devices')
def devices(db: Session = Depends(get_db)):
    latest = dict(db.query(CemsRaw.device_id, func.max(CemsRaw.ts)).group_by(CemsRaw.device_id).all())
    names = {d.code: d.name for d in db.query(Device).all()}
    return [{'device_id': code, 'name': names.get(code, code), 'last_ts': current_cursor(db, code) or ts} for code, ts in latest.items()]

@router.get('/latest')
def latest(device_id: str, as_of: Optional[datetime] = None, db: Session = Depends(get_db)):
    cursor = current_cursor(db, device_id)
    if cursor and (as_of is None or as_of > cursor):
        as_of = cursor
    q = db.query(CemsRaw).filter(CemsRaw.device_id == device_id)
    if as_of:
        q = q.filter(CemsRaw.ts <= as_of)
    row = q.order_by(CemsRaw.ts.desc(), CemsRaw.id.desc()).first()
    if row is None:
        raise HTTPException(404, '未找到监测数据')
    return row_dict(row)

@router.get('/history')
def history(device_id: str, start: datetime, end: datetime, interval: str = Query('raw', pattern='^(raw|hour|day)$'), db: Session = Depends(get_db)):
    if end <= start or end - start > timedelta(days=31):
        raise HTTPException(400, '时间范围必须为 1 到 31 天')
    cursor = current_cursor(db, device_id)
    if cursor:
        end = min(end, cursor + timedelta(microseconds=1))
    rows = db.query(CemsRaw).filter(CemsRaw.device_id == device_id, CemsRaw.ts >= start, CemsRaw.ts < end).order_by(CemsRaw.ts, CemsRaw.id).all()
    if interval == 'raw':
        return {'items': [row_dict(r) for r in rows], 'total': len(rows)}
    buckets = {}
    for row in rows:
        ts = row.ts.replace(minute=0, second=0, microsecond=0)
        if interval == 'day':
            ts = ts.replace(hour=0)
        buckets.setdefault(ts, []).append(row)
    items = []
    for ts, group in buckets.items():
        item = {'ts': ts, 'condition_flag': group[-1].condition_flag}
        for field in FIELDS:
            vals = [getattr(r, field) for r in group if r.report_flag == 1 and getattr(r, field) is not None]
            item[field] = sum(vals) / len(vals) if vals else None
        items.append(item)
    return {'items': items, 'total': len(items)}

@router.get('/overview')
def overview(device_id: str, date: date, db: Session = Depends(get_db)):
    start = datetime.combine(date, datetime.min.time())
    end = start + timedelta(days=1)
    cursor = current_cursor(db, device_id)
    if cursor:
        end = min(end, cursor + timedelta(microseconds=1))
    rows = db.query(CemsRaw).filter(CemsRaw.device_id == device_id, CemsRaw.ts >= start, CemsRaw.ts < end).all()
    stats = {}
    for p in POLLUTANTS:
        valid = [r for r in rows if r.report_flag == 1 and r.condition_flag != 'shutdown' and getattr(r, p + '_std') is not None]
        values = [getattr(r, p + '_std') for r in valid]
        stats[p] = {'max': max(values) if values else None, 'avg': sum(values)/len(values) if values else None,
                    'exceed_count': sum(getattr(r, p + '_limit') is not None and getattr(r, p + '_std') >= getattr(r, p + '_limit') for r in valid)}
    alarm_count = db.query(Alarm).filter(Alarm.device_id == device_id, Alarm.ts >= start, Alarm.ts < end).count()
    return {'pollutants': stats, 'alarm_count': alarm_count}

@router.get('/replay')
def replay(device_id: str, db: Session = Depends(get_db)):
    state = db.query(ReplayState).filter(ReplayState.device_id == device_id).first()
    if not state:
        raise HTTPException(404, '设备没有回放数据')
    return {'device_id': device_id, 'source_start': state.source_start, 'source_end': state.source_end,
            'cursor': current_cursor(db, device_id), 'speed': state.speed, 'mode': 'historical_replay'}
