from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Float, Integer, JSON, String

from app.db import Base


class Alarm(Base):
    __tablename__ = "alarm"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), nullable=False)
    ts = Column(DateTime, nullable=False)
    level = Column(Enum("yellow", "orange", "red", name="alarm_level"), nullable=False)
    pollutant = Column(String(16), nullable=False)
    value = Column(Float, nullable=False)
    limit_val = Column(Float, nullable=False)
    reason = Column(String(255))
    status = Column(Enum("pending", "acked", "closed", name="alarm_status"), nullable=False, default="pending")
    diagnosis = Column(JSON)
    workorder_id = Column(Integer)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
