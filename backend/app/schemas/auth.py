from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

ROLES = ("admin", "engineer", "viewer")


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    real_name: Optional[str] = None
    role: str
    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    token: str
    user: UserOut


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=32)
    password: str = Field(min_length=6, max_length=64)
    real_name: Optional[str] = Field(default=None, max_length=32)
    role: str = "viewer"


class UserUpdate(BaseModel):
    real_name: Optional[str] = Field(default=None, max_length=32)
    role: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=64)
