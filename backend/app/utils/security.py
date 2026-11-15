from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_token(user) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": str(user.id), "username": user.username, "role": user.role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)
