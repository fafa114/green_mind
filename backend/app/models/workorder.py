from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String, Text

from app.db import Base


class WorkOrder(Base):
    __tablename__ = "work_order"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alarm_id = Column(Integer)
    device_id = Column(String(32), nullable=False)
    title = Column(String(128), nullable=False)
    description = Column(Text)
    priority = Column(Enum("low", "medium", "high", "urgent", name="wo_priority"), nullable=False, default="medium")
    status = Column(Enum("pending", "processing", "accepting", "closed", name="wo_status"), nullable=False, default="pending")
    assignee_id = Column(Integer, nullable=False)
    sla_deadline = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    accepted_at = Column(DateTime)
    finished_at = Column(DateTime)
    closed_at = Column(DateTime)
    finish_note = Column(Text)
    accept_note = Column(Text)
