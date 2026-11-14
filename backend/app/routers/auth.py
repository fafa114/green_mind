from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models import User
from app.schemas.auth import LoginIn, TokenOut, UserCreate, UserOut, UserUpdate, ROLES
from app.utils.deps import get_db, require_role
from app.utils.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
users_router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"token": create_token(user), "user": UserOut.model_validate(user)}


@users_router.get("")
def list_users(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    q = db.query(User)
    total = q.count()
    items = q.order_by(User.id).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [UserOut.model_validate(u) for u in items], "total": total, "page": page, "page_size": page_size}


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="role 必须是 admin/engineer/viewer")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        real_name=body.real_name,
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@users_router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if body.role is not None:
        if body.role not in ROLES:
            raise HTTPException(status_code=400, detail="role 必须是 admin/engineer/viewer")
        user.role = body.role
    if body.real_name is not None:
        user.real_name = body.real_name
    if body.password:
        user.password_hash = hash_password(body.password)
    db.commit()
    db.refresh(user)
    return user


@users_router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), cur: User = Depends(require_role("admin"))):
    if user_id == cur.id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"detail": "已删除"}
