from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from app.db import Base


class HealthScore(Base):
    __tablename__ = "health_score"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(32), nullable=False)
    score = Column(Integer, nullable=False)
    factors = Column(JSON)
    suggestion = Column(Text)
    scored_at = Column(DateTime, nullable=False, default=datetime.utcnow)
