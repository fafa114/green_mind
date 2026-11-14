from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models import Device, HealthScore, User
from app.schemas.device import DEVICE_STATUS, DeviceCreate, DeviceOut, DeviceUpdate, HealthOut
from app.services import health_svc
from app.utils.deps import get_current_user, get_db, require_role

router = APIRouter(prefix="/api/devices", tags=["devices"])


def _latest_health(db: Session, code: str) -> Optional[int]:
    latest = (
        db.query(HealthScore)
        .filter(HealthScore.device_id == code)
        .order_by(HealthScore.scored_at.desc(), HealthScore.id.desc())
        .first()
    )
    return latest.score if latest else None


def _to_out(db: Session, device: Device) -> DeviceOut:
    out = DeviceOut.model_validate(device)
    out.latest_health = _latest_health(db, device.code)
    return out


@router.get("")
def list_devices(
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    q = db.query(Device)
    if status:
        if status not in DEVICE_STATUS:
            raise HTTPException(status_code=400, detail="status 必须是 running/stopped/maintenance")
        q = q.filter(Device.status == status)
    total = q.count()
    items = q.order_by(Device.id).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [_to_out(db, d) for d in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=DeviceOut, status_code=201)
def create_device(body: DeviceCreate, db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    if body.status not in DEVICE_STATUS:
        raise HTTPException(status_code=400, detail="status 必须是 running/stopped/maintenance")
    if db.query(Device).filter(Device.code == body.code).first():
        raise HTTPException(status_code=400, detail="设备编号已存在")
    device = Device(**body.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return _to_out(db, device)


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return _to_out(db, device)


@router.put("/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: int,
    body: DeviceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in DEVICE_STATUS:
        raise HTTPException(status_code=400, detail="status 必须是 running/stopped/maintenance")
    for key, value in data.items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return _to_out(db, device)


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    db.delete(device)
    db.commit()
    return {"detail": "已删除"}


@router.get("/{device_id}/health", response_model=HealthOut)
def get_device_health(device_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    latest = (
        db.query(HealthScore)
        .filter(HealthScore.device_id == device.code)
        .order_by(HealthScore.scored_at.desc(), HealthScore.id.desc())
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail="尚无健康度评分，请先刷新")
    return latest


@router.post("/{device_id}/health/refresh", response_model=HealthOut)
async def refresh_device_health(device_id: int, db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return await health_svc.refresh(db, device)
