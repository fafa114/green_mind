from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String

from app.db import Base


class Prediction(Base):
    __tablename__ = "prediction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), nullable=False)
    pollutant = Column(String(16), nullable=False)
    base_ts = Column(DateTime, nullable=False)
    result = Column(JSON)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
