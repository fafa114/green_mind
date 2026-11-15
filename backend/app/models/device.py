from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Enum, Integer, String

from app.db import Base


class Device(Base):
    __tablename__ = "device"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(32), unique=True, nullable=False)
    name = Column(String(64), nullable=False)
    type = Column(String(32))
    install_date = Column(Date)
    design_life_years = Column(Integer)
    last_calibration_date = Column(Date)
    calibration_cycle_days = Column(Integer, nullable=False, default=365)
    status = Column(Enum("running", "stopped", "maintenance", name="device_status"), nullable=False, default="running")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
