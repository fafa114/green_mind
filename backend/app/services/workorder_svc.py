from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Alarm, OperationLog, User, WorkOrder

SLA_HOURS = {"low": 72, "medium": 24, "high": 8, "urgent": 2}
PRIORITY_ORDER = ["low", "medium", "high", "urgent"]


def auto_assign(db: Session) -> User:
    engineers = db.query(User).filter(User.role == "engineer").order_by(User.id).all()
    if not engineers:
        raise HTTPException(status_code=400, detail="系统没有工程师账号，无法派单")

    def open_count(uid: int) -> int:
        return db.query(WorkOrder).filter(WorkOrder.assignee_id == uid, WorkOrder.status != "closed").count()

    return min(engineers, key=lambda e: (open_count(e.id), e.id))


def create(
    db: Session,
    device_id: str,
    title: str,
    description: Optional[str] = None,
    priority: str = "medium",
    alarm_id: Optional[int] = None,
) -> WorkOrder:
    if priority not in SLA_HOURS:
        raise HTTPException(status_code=400, detail="priority 必须是 low/medium/high/urgent")
    assignee = auto_assign(db)
    wo = WorkOrder(
        alarm_id=alarm_id,
        device_id=device_id,
        title=title,
        description=description,
        priority=priority,
        assignee_id=assignee.id,
        sla_deadline=datetime.utcnow() + timedelta(hours=SLA_HOURS[priority]),
    )
    db.add(wo)
    db.flush()
    if alarm_id:
        alarm = db.get(Alarm, alarm_id)
        if alarm is not None:
            alarm.workorder_id = wo.id
    db.commit()
    db.refresh(wo)
    return wo


def create_from_alarm(db: Session, alarm: Alarm) -> WorkOrder:
    level_name = "红色" if alarm.level == "red" else "橙色"
    priority = "urgent" if alarm.level == "red" else "high"
    summary = ""
    if isinstance(alarm.diagnosis, dict):
        summary = alarm.diagnosis.get("summary", "") or ""
    title = "【%s】%s %s超标" % (level_name, alarm.device_id, alarm.pollutant)
    description = "%s %s %s=%s（标准 %s）\nAI 诊断摘要：%s" % (
        alarm.ts, alarm.device_id, alarm.pollutant, alarm.value, alarm.limit_val, summary or "待生成",
    )
    return create(db, alarm.device_id, title, description, priority, alarm_id=alarm.id)


def escalate_overdue(db: Session) -> int:
    now = datetime.utcnow()
    overdue = db.query(WorkOrder).filter(
        WorkOrder.status != "closed", WorkOrder.sla_deadline < now,
    ).all()
    bumped = 0
    for wo in overdue:
        idx = PRIORITY_ORDER.index(wo.priority)
        if idx < len(PRIORITY_ORDER) - 1:
            wo.priority = PRIORITY_ORDER[idx + 1]
            db.add(OperationLog(
                user_id=None,
                action="sla_escalate",
                target="work_order:%d" % wo.id,
                detail={"priority": wo.priority},
            ))
            bumped += 1
    db.commit()
    return bumped
