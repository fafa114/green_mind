from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

PRIORITY_ORDER = ("low", "medium", "high", "urgent")
WO_STATUS = ("pending", "processing", "accepting", "closed")


class WorkOrderCreate(BaseModel):
    device_id: str = Field(max_length=32)
    title: str = Field(min_length=1, max_length=128)
    description: Optional[str] = None
    priority: str = "medium"


class CompleteIn(BaseModel):
    finish_note: Optional[str] = None


class ApproveIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    passed: bool = Field(alias="pass")
    accept_note: Optional[str] = None


class WorkOrderOut(BaseModel):
    id: int
    alarm_id: Optional[int] = None
    device_id: str
    title: str
    description: Optional[str] = None
    priority: str
    status: str
    assignee_id: int
    sla_deadline: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    finish_note: Optional[str] = None
    accept_note: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
