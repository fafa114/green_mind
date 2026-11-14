from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String

from app.db import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(32), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    real_name = Column(String(32))
    role = Column(Enum("admin", "engineer", "viewer", name="user_role"), nullable=False, default="viewer")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
