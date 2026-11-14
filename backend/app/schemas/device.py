from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

DEVICE_STATUS = ("running", "stopped", "maintenance")


class DeviceCreate(BaseModel):
    code: str
    name: str
    type: Optional[str] = None
    install_date: Optional[date] = None
    design_life_years: Optional[int] = None
    last_calibration_date: Optional[date] = None
    calibration_cycle_days: int = 365
    status: str = "running"


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    install_date: Optional[date] = None
    design_life_years: Optional[int] = None
    last_calibration_date: Optional[date] = None
    calibration_cycle_days: Optional[int] = None
    status: Optional[str] = None


class DeviceOut(BaseModel):
    id: int
    code: str
    name: str
    type: Optional[str] = None
    install_date: Optional[date] = None
    design_life_years: Optional[int] = None
    last_calibration_date: Optional[date] = None
    calibration_cycle_days: int
    status: str
    created_at: datetime
    latest_health: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class HealthOut(BaseModel):
    id: int
    device_id: str
    score: int
    factors: Optional[list] = None
    suggestion: Optional[str] = None
    scored_at: datetime
    model_config = ConfigDict(from_attributes=True)


class HealthStats(BaseModel):
    comm_interrupt_count: int
    abnormal_ratio: float
    alarm_count: int
    calibration_overdue_days: int
    age_years: float
    sample_rows: int
