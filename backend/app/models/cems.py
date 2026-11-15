from sqlalchemy import Column, DateTime, Float, Index, Integer, SmallInteger, String

from app.db import Base


class CemsRaw(Base):
    __tablename__ = "cems_raw"
    __table_args__ = (Index("idx_device_ts", "device_id", "ts"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, nullable=False)
    device_id = Column(String(32), nullable=False)
    furnace_temp = Column(Float)
    flow = Column(Float)
    o2 = Column(Float)
    flue_temp = Column(Float)
    flue_pressure = Column(Float)
    flue_velocity = Column(Float)
    flue_humidity = Column(Float)
    pm_real = Column(Float)
    pm_std = Column(Float)
    pm_limit = Column(Float)
    so2_real = Column(Float)
    so2_std = Column(Float)
    so2_limit = Column(Float)
    nox_real = Column(Float)
    nox_std = Column(Float)
    nox_limit = Column(Float)
    co_real = Column(Float)
    co_std = Column(Float)
    co_limit = Column(Float)
    hcl_real = Column(Float)
    hcl_std = Column(Float)
    hcl_limit = Column(Float)
    condition_flag = Column(String(16), nullable=False, default="normal")
    report_flag = Column(SmallInteger, nullable=False, default=1)
    comm_flag = Column(SmallInteger, nullable=False, default=0)
    exceed_flag = Column(SmallInteger, nullable=False, default=0)
    zero_flag = Column(SmallInteger, nullable=False, default=0)
