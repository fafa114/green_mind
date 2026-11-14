from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChecklistItem(BaseModel):
    item: str
    ok: bool
    note: Optional[str] = None


class InspectionCreate(BaseModel):
    device_code: str
    checklist: List[ChecklistItem]
    photos: List[str] = Field(default_factory=list)
    signature_path: str
    abnormal_desc: Optional[str] = None


class InspectionOut(BaseModel):
    id: int
    device_id: str
    inspector_id: int
    checkin_time: datetime
    checklist: Optional[list] = None
    photos: Optional[list] = None
    signature_path: Optional[str] = None
    abnormal_desc: Optional[str] = None
    workorder_id: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
