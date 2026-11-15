from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.db import Base


class OperationLog(Base):
    __tablename__ = "operation_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer)
    action = Column(String(64), nullable=False)
    target = Column(String(128))
    detail = Column(JSON)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
