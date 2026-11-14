from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.dialects.mysql import MEDIUMTEXT

from app.db import Base


class ChatSession(Base):
    __tablename__ = "chat_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    title = Column(String(128))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, nullable=False)
    role = Column(Enum("user", "assistant", "tool", name="chat_role"), nullable=False)
    content = Column(String(65535).with_variant(MEDIUMTEXT(), "mysql"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
