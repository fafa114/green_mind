from fastapi import Request
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.db import SessionLocal
from app.models import OperationLog


class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            try:
                self._write(request)
            except Exception:
                pass
        return response

    @staticmethod
    def _write(request: Request) -> None:
        user_id = None
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = jwt.decode(auth[7:], settings.jwt_secret, algorithms=["HS256"])
                user_id = int(payload.get("sub", 0))
            except (JWTError, TypeError, ValueError):
                user_id = None
        detail = dict(request.query_params) or None
        db = SessionLocal()
        try:
            db.add(OperationLog(
                user_id=user_id,
                action="%s %s" % (request.method, request.url.path),
                target=request.url.path,
                detail=detail,
            ))
            db.commit()
        finally:
            db.close()
