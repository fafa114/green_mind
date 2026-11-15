"""生成演示数据：4 个账号、2 台设备、30 天 CEMS 数据（含超标/中断/停运/掉温场景）。

用法（在 backend 目录下）：python scripts/seed_demo.py
"""
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import Base, SessionLocal, engine  # noqa: E402
import app.models  # noqa: F401,E402
from app.models import CemsRaw, Device, User  # noqa: E402
from app.utils.security import hash_password  # noqa: E402

random.seed(20261114)

LIMITS = {"pm": 20.0, "so2": 80.0, "nox": 250.0, "co": 100.0, "hcl": 10.0}


def value_of(pollutant, factor=1.0):
    limit = LIMITS[pollutant]
    std = limit * 0.4 * factor + random.uniform(-limit * 0.05, limit * 0.05)
    std = max(0.0, std)
    real = std * random.uniform(0.93, 0.97)
    return real, std, limit


def make_row(device_id, ts):
    row = CemsRaw(
        ts=ts,
        device_id=device_id,
        furnace_temp=940 + random.uniform(-40, 30),
        flow=62000 + random.uniform(-4000, 4000),
        o2=8.0 + random.uniform(-1.5, 1.5),
        flue_temp=130 + random.uniform(-10, 10),
        flue_pressure=-2000 + random.uniform(-200, 200),
        flue_velocity=12 + random.uniform(-1, 1),
        flue_humidity=8 + random.uniform(-2, 2),
    )
    for p in LIMITS:
        real, std, limit = value_of(p)
        setattr(row, "%s_real" % p, round(real, 2))
        setattr(row, "%s_std" % p, round(std, 2))
        setattr(row, "%s_limit" % p, limit)
    return row


def apply_scenario(row, ts, day_offset, hour, minute):
    """按窗口注入场景，命中返回说明字符串。"""
    local = (ts + timedelta(hours=8))  # 数据时间近似按本地时间安排场景
    day = (datetime.utcnow() - local).days
    hm = local.hour * 60 + local.minute
    # 1) 通讯中断：第 -25 天 10:00-12:00
    if day == 25 and 10 * 60 <= hm < 12 * 60:
        row.comm_flag = 1
        return "comm"
    # 2) 停运：第 -22 天 00:00-06:00
    if day == 22 and hm < 6 * 60:
        row.condition_flag = "shutdown"
        for p in LIMITS:
            setattr(row, "%s_real" % p, 0.0)
            setattr(row, "%s_std" % p, 0.0)
        row.flow = 0.0
        row.furnace_temp = 60.0
        row.zero_flag = 1
        return "shutdown"
    # 3) 橙色超标 SO2：第 -20 天 14:00-14:40
    if day == 20 and 14 * 60 <= hm < 14 * 60 + 40:
        row.so2_std = round(LIMITS["so2"] * 1.2, 2)
        row.so2_real = round(row.so2_std * 0.95, 2)
        row.exceed_flag = 1
        return "so2_orange"
    # 4) 红色超标 PM：第 -15 天 09:00-09:20
    if day == 15 and 9 * 60 <= hm < 9 * 60 + 20:
        row.pm_std = round(LIMITS["pm"] * 1.75, 2)
        row.pm_real = round(row.pm_std * 0.95, 2)
        row.exceed_flag = 1
        return "pm_red"
    # 5) 炉温低于 850：第 -12 天 08:00-08:15
    if day == 12 and 8 * 60 <= hm < 8 * 60 + 15:
        row.furnace_temp = 810.0
        return "furnace"
    # 6) 橙色超标 CO：第 -10 天 16:00-16:30
    if day == 10 and 16 * 60 <= hm < 16 * 60 + 30:
        row.co_std = round(LIMITS["co"] * 1.3, 2)
        row.co_real = round(row.co_std * 0.95, 2)
        row.exceed_flag = 1
        return "co_orange"
    return None


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("已有数据，跳过（如需重建请删除 greenmind.db / 清空数据库）")
            return

        db.add_all([
            User(username="admin", password_hash=hash_password("123456"), real_name="管理员", role="admin"),
            User(username="engineer1", password_hash=hash_password("123456"), real_name="张工", role="engineer"),
            User(username="engineer2", password_hash=hash_password("123456"), real_name="李工", role="engineer"),
            User(username="viewer", password_hash=hash_password("123456"), real_name="访客", role="viewer"),
        ])
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        db.add_all([
            Device(code="CEMS-01", name="1# 焚烧线 CEMS", type="炉排炉",
                   install_date=today - timedelta(days=1825), design_life_years=10,
                   last_calibration_date=today - timedelta(days=400), calibration_cycle_days=365,
                   status="running"),
            Device(code="CEMS-02", name="2# 焚烧线 CEMS", type="流化床",
                   install_date=today - timedelta(days=500), design_life_years=10,
                   last_calibration_date=today - timedelta(days=100), calibration_cycle_days=365,
                   status="running"),
        ])
        db.commit()

        now = datetime.utcnow().replace(second=0, microsecond=0)
        start = now - timedelta(days=30)
        ts = start
        rows = []
        scenarios = {}
        while ts <= now:
            for device_id in ("CEMS-01", "CEMS-02"):
                row = make_row(device_id, ts)
                tag = apply_scenario(row, ts, 0, 0, 0)
                if tag:
                    scenarios[tag] = scenarios.get(tag, 0) + 1
                rows.append(row)
            ts += timedelta(minutes=5)
        for i in range(0, len(rows), 2000):
            db.add_all(rows[i:i + 2000])
            db.commit()
        print("用户：admin/engineer1/engineer2/viewer（密码均 123456）")
        print("设备：CEMS-01、CEMS-02")
        print("CEMS 数据：%d 行（30 天 × 5 分钟 × 2 设备）" % len(rows))
        print("场景：%s" % scenarios)
    finally:
        db.close()


if __name__ == "__main__":
    main()
