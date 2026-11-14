from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportGenerateIn(BaseModel):
    period: str = Field(pattern=r"^\d{4}-\d{2}$")


class ReportOut(BaseModel):
    id: int
    period: str
    stats: Optional[dict] = None
    content_md: Optional[str] = None
    generated_at: datetime
    model_config = ConfigDict(from_attributes=True)
