import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Device, Inspection, User
from app.schemas.inspection import InspectionCreate, InspectionOut
from app.services import workorder_svc
from app.utils.deps import get_current_user, get_db, require_role

router = APIRouter(prefix="/api/inspections", tags=["inspections"])
upload_router = APIRouter(prefix="/api", tags=["files"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


@upload_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(require_role("engineer", "admin")),
):
    ext = Path(file.filename or "").suffix.lower()
    if file.content_type not in ("image/jpeg", "image/png") or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 jpg/png 图片")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="图片不能超过 5MB")
    if not data:
        raise HTTPException(status_code=400, detail="文件为空")
    name = "%s_%s%s" % (datetime.utcnow().strftime("%Y%m%d"), uuid.uuid4().hex[:8], ext)
    (Path(settings.upload_dir) / name).write_bytes(data)
    return {"path": "/uploads/%s" % name}


@router.post("", status_code=201)
def create_inspection(
    body: InspectionCreate,
    db: Session = Depends(get_db),
    cur: User = Depends(require_role("engineer", "admin")),
):
    device = db.query(Device).filter(Device.code == body.device_code).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    if not body.checklist:
        raise HTTPException(status_code=400, detail="检查清单不能为空")

    abnormal_items = [i for i in body.checklist if not i.ok]
    abnormal = bool(body.abnormal_desc) or bool(abnormal_items)
    workorder_id = None
    if abnormal:
        parts = [i.note or "异常" for i in abnormal_items]
        if body.abnormal_desc:
            parts.insert(0, body.abnormal_desc)
        description = "；".join(parts)
        wo = workorder_svc.create(
            db, device_id=device.code,
            title="巡检异常：%s" % device.code,
            description=description, priority="medium",
        )
        workorder_id = wo.id

    inspection = Inspection(
        device_id=device.code,
        inspector_id=cur.id,
        checkin_time=datetime.utcnow(),
        checklist=[i.model_dump() for i in body.checklist],
        photos=body.photos,
        signature_path=body.signature_path,
        abnormal_desc=body.abnormal_desc,
        workorder_id=workorder_id,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return {"id": inspection.id, "workorder_id": workorder_id}


@router.get("")
def list_inspections(
    device_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    q = db.query(Inspection)
    if device_id:
        q = q.filter(Inspection.device_id == device_id)
    total = q.count()
    items = q.order_by(Inspection.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [InspectionOut.model_validate(i) for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{inspection_id}", response_model=InspectionOut)
def get_inspection(inspection_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    inspection = db.get(Inspection, inspection_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="巡检记录不存在")
    return inspection
