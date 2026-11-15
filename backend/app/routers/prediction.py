from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models import CemsRaw, Device, Prediction
from app.utils.deps import get_current_user, get_db, require_role

router = APIRouter(prefix='/api/predictions', tags=['predictions'], dependencies=[Depends(get_current_user)])
POLLUTANTS = ('pm', 'so2', 'nox', 'co', 'hcl')

class RefreshBody(BaseModel):
    device_id: str

def pred_dict(p):
    return {c.name: getattr(p, c.name) for c in Prediction.__table__.columns}

def make_prediction(db: Session, device_id: str, pollutant: str):
    latest = db.query(CemsRaw.ts).filter(CemsRaw.device_id == device_id).order_by(CemsRaw.ts.desc()).first()
    if not latest:
        raise HTTPException(404, '监测数据不存在')
    base = latest[0].replace(minute=0, second=0, microsecond=0)
    rows = db.query(CemsRaw).filter(CemsRaw.device_id == device_id, CemsRaw.ts > latest[0]-timedelta(hours=24),
        CemsRaw.ts <= latest[0], CemsRaw.condition_flag == 'normal', CemsRaw.report_flag == 1).order_by(CemsRaw.ts).all()
    values = [getattr(r, pollutant + '_std') for r in rows if getattr(r, pollutant + '_std') is not None]
    if len(values) < 6:
        raise HTTPException(422, '有效样本不足，无法生成趋势参考')
    baseline = sum(values[-min(12, len(values)):]) / min(12, len(values))
    result = {'hours': [{'ts': (base+timedelta(hours=i)).isoformat(), 'value': round(baseline, 3), 'exceed_prob': 0.0} for i in range(1,7)],
              'drivers': ['最近有效样本均值基线；超标概率尚未校准'], 'confidence': 0.0,
              'experimental': True, 'notice': '仅供趋势参考，不用于合规判定'}
    row = Prediction(device_id=device_id, pollutant=pollutant, base_ts=latest[0], result=result)
    db.add(row); db.commit(); db.refresh(row)
    return row

@router.get('/latest')
def latest(device_id: str, pollutant: str, db: Session = Depends(get_db)):
    if pollutant not in POLLUTANTS:
        raise HTTPException(400, '未知污染物')
    row = db.query(Prediction).filter(Prediction.device_id == device_id, Prediction.pollutant == pollutant).order_by(Prediction.id.desc()).first()
    if not row:
        row = make_prediction(db, device_id, pollutant)
    return pred_dict(row)

@router.get('')
def history(device_id: str, pollutant: str, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    if pollutant not in POLLUTANTS:
        raise HTTPException(400, '未知污染物')
    q = db.query(Prediction).filter(Prediction.device_id == device_id, Prediction.pollutant == pollutant)
    return {'items': [pred_dict(x) for x in q.order_by(Prediction.id.desc()).offset((page-1)*page_size).limit(page_size)],
            'total': q.count(), 'page': page, 'page_size': page_size}

@router.post('/refresh')
def refresh(body: RefreshBody, db: Session = Depends(get_db), user=Depends(require_role('admin'))):
    if not db.query(Device.id).filter(Device.code == body.device_id).first():
        raise HTTPException(404, '设备不存在')
    return {'items': [pred_dict(make_prediction(db, body.device_id, p)) for p in POLLUTANTS]}
