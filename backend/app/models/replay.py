from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String
from app.db import Base


class ReplayState(Base):
    __tablename__ = 'replay_state'
    id = Column(Integer, primary_key=True)
    device_id = Column(String(32), nullable=False, unique=True)
    source_start = Column(DateTime, nullable=False)
    source_end = Column(DateTime, nullable=False)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    speed = Column(Float, nullable=False, default=60.0)
