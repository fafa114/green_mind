from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT

from app.db import Base


class Report(Base):
    __tablename__ = "report"

    id = Column(Integer, primary_key=True, autoincrement=True)
    period = Column(String(7), unique=True, nullable=False)
    stats = Column(JSON)
    content_md = Column(Text().with_variant(MEDIUMTEXT(), "mysql"))
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
