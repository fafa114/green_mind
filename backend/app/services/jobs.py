import asyncio
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler

from app.db import SessionLocal
from app.services import report_svc, workorder_svc
from app.services.health_svc import refresh as refresh_health


def check_sla() -> int:
    db = SessionLocal()
    try:
        return workorder_svc.escalate_overdue(db)
    finally:
        db.close()


async def _refresh_all_health_async() -> int:
    from app.models import Device

    db = SessionLocal()
    try:
        devices = db.query(Device).all()
        count = 0
        for device in devices:
            try:
                await refresh_health(db, device)
                count += 1
            except Exception:
                continue
        return count
    finally:
        db.close()


def refresh_all_health() -> int:
    return asyncio.run(_refresh_all_health_async())


async def _generate_report_async(period: str) -> int:
    db = SessionLocal()
    try:
        report = await report_svc.generate(db, period)
        return report.id
    finally:
        db.close()


def generate_monthly_report() -> Optional[int]:
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = first_of_month - timedelta(days=1)
    period = prev_month_end.strftime("%Y-%m")
    return asyncio.run(_generate_report_async(period))


scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(check_sla, "interval", minutes=5, id="sla_check")
scheduler.add_job(refresh_all_health, "cron", day=1, hour=1, id="health_refresh")
scheduler.add_job(generate_monthly_report, "cron", day=1, hour=2, id="report_generate")


def scan_alarms():
    from app.routers.alarm import scan
    db = SessionLocal()
    try:
        scan(db)
    finally:
        db.close()


def refresh_predictions():
    from app.models import CemsRaw
    from app.routers.prediction import POLLUTANTS, make_prediction
    db = SessionLocal()
    try:
        device_ids = [x[0] for x in db.query(CemsRaw.device_id).distinct().all()]
        for device_id in device_ids:
            for pollutant in POLLUTANTS:
                try:
                    make_prediction(db, device_id, pollutant)
                except Exception:
                    db.rollback()
    finally:
        db.close()


scheduler.add_job(scan_alarms, 'interval', seconds=5, id='alarm_scan', max_instances=1)
scheduler.add_job(refresh_predictions, 'interval', hours=1, id='prediction_refresh', max_instances=1)
