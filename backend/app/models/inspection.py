from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from app.db import Base


class Inspection(Base):
    __tablename__ = "inspection"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), nullable=False)
    inspector_id = Column(Integer, nullable=False)
    checkin_time = Column(DateTime, nullable=False)
    checklist = Column(JSON)
    photos = Column(JSON)
    signature_path = Column(String(255))
    abnormal_desc = Column(Text)
    workorder_id = Column(Integer)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
