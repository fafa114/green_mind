from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models import User, WorkOrder
from app.schemas.workorder import ApproveIn, CompleteIn, PRIORITY_ORDER, WO_STATUS, WorkOrderCreate, WorkOrderOut
from app.services import workorder_svc
from app.utils.deps import get_current_user, get_db, require_role

router = APIRouter(prefix="/api/workorders", tags=["workorders"])


@router.get("")
def list_workorders(
    status: Optional[str] = None,
    assignee_id: Optional[int] = None,
    device_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    q = db.query(WorkOrder)
    if status:
        if status not in WO_STATUS:
            raise HTTPException(status_code=400, detail="status 必须是 pending/processing/accepting/closed")
        q = q.filter(WorkOrder.status == status)
    if assignee_id is not None:
        q = q.filter(WorkOrder.assignee_id == assignee_id)
    if device_id:
        q = q.filter(WorkOrder.device_id == device_id)
    total = q.count()
    items = q.order_by(WorkOrder.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [WorkOrderOut.model_validate(w) for w in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/stats")
def workorder_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    by_status = {s: db.query(WorkOrder).filter(WorkOrder.status == s).count() for s in WO_STATUS}
    engineers = db.query(User).filter(User.role == "engineer").order_by(User.id).all()
    engineer_load = []
    for e in engineers:
        open_count = db.query(WorkOrder).filter(WorkOrder.assignee_id == e.id, WorkOrder.status != "closed").count()
        engineer_load.append({"user_id": e.id, "real_name": e.real_name or e.username, "open_count": open_count})
    return {"by_status": by_status, "engineer_load": engineer_load}


@router.get("/{wo_id}", response_model=WorkOrderOut)
def get_workorder(wo_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")
    return wo


@router.post("", response_model=WorkOrderOut, status_code=201)
def create_workorder(
    body: WorkOrderCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("engineer", "admin")),
):
    if body.priority not in PRIORITY_ORDER:
        raise HTTPException(status_code=400, detail="priority 必须是 low/medium/high/urgent")
    return workorder_svc.create(
        db, device_id=body.device_id, title=body.title,
        description=body.description, priority=body.priority,
    )


@router.post("/{wo_id}/accept", response_model=WorkOrderOut)
def accept_workorder(wo_id: int, db: Session = Depends(get_db), cur: User = Depends(get_current_user)):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")
    if cur.role != "admin" and cur.id != wo.assignee_id:
        raise HTTPException(status_code=403, detail="只有负责人或管理员可以接单")
    if wo.status != "pending":
        raise HTTPException(status_code=400, detail="当前状态不能接单")
    wo.status = "processing"
    wo.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)
    return wo


@router.post("/{wo_id}/complete", response_model=WorkOrderOut)
def complete_workorder(
    wo_id: int,
    body: CompleteIn,
    db: Session = Depends(get_db),
    cur: User = Depends(get_current_user),
):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")
    if cur.id != wo.assignee_id:
        raise HTTPException(status_code=403, detail="只有负责人可以提交完工")
    if wo.status != "processing":
        raise HTTPException(status_code=400, detail="当前状态不能提交完工")
    wo.status = "accepting"
    wo.finished_at = datetime.utcnow()
    wo.finish_note = body.finish_note
    db.commit()
    db.refresh(wo)
    return wo


@router.post("/{wo_id}/approve", response_model=WorkOrderOut)
def approve_workorder(
    wo_id: int,
    body: ApproveIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")
    if wo.status != "accepting":
        raise HTTPException(status_code=400, detail="只有待验收状态可以验收")
    wo.accept_note = body.accept_note
    if body.passed:
        wo.status = "closed"
        wo.closed_at = datetime.utcnow()
    else:
        wo.status = "processing"
    db.commit()
    db.refresh(wo)
    return wo
