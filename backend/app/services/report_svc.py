import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Alarm, CemsRaw, Device, HealthScore, Inspection, Report, WorkOrder
from app.services import llm, prompts

POLLUTANTS = [
    ("pm", "pm_std", "pm_limit"),
    ("so2", "so2_std", "so2_limit"),
    ("nox", "nox_std", "nox_limit"),
    ("co", "co_std", "co_limit"),
    ("hcl", "hcl_std", "hcl_limit"),
]


def _period_range(period: str):
    start = datetime.strptime(period + "-01", "%Y-%m-%d")
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def build_stats(db: Session, period: str) -> Dict[str, Any]:
    start, end = _period_range(period)

    base = db.query(CemsRaw).filter(CemsRaw.ts >= start, CemsRaw.ts < end)
    row_minutes = 5
    pollutants: Dict[str, Any] = {}
    for name, std_col, limit_col in POLLUTANTS:
        std = getattr(CemsRaw, std_col)
        limit = getattr(CemsRaw, limit_col)
        agg = base.with_entities(func.max(std), func.avg(std)).one()
        exceed_rows = base.filter(std > limit).count()
        pollutants[name] = {
            "max": round(agg[0], 2) if agg[0] is not None else None,
            "avg": round(float(agg[1]), 2) if agg[1] is not None else None,
            "exceed_hours": round(exceed_rows * row_minutes / 60, 1),
        }

    alarm_q = db.query(Alarm).filter(Alarm.created_at >= start, Alarm.created_at < end)
    alarm_by_level = {
        "yellow": alarm_q.filter(Alarm.level == "yellow").count(),
        "orange": alarm_q.filter(Alarm.level == "orange").count(),
        "red": alarm_q.filter(Alarm.level == "red").count(),
    }

    wo_q = db.query(WorkOrder).filter(WorkOrder.created_at >= start, WorkOrder.created_at < end)
    total = wo_q.count()
    completed = db.query(WorkOrder).filter(
        WorkOrder.closed_at >= start, WorkOrder.closed_at < end,
    ).count()
    on_time = db.query(WorkOrder).filter(
        WorkOrder.closed_at >= start, WorkOrder.closed_at < end, WorkOrder.closed_at <= WorkOrder.sla_deadline,
    ).count()
    workorder = {
        "total": total,
        "completed": completed,
        "on_time_rate": round(on_time / completed, 4) if completed else None,
    }

    inspection_count = db.query(Inspection).filter(
        Inspection.checkin_time >= start, Inspection.checkin_time < end,
    ).count()

    scores = []
    for device in db.query(Device).all():
        latest = (
            db.query(HealthScore)
            .filter(HealthScore.device_id == device.code)
            .order_by(HealthScore.scored_at.desc(), HealthScore.id.desc())
            .first()
        )
        if latest:
            scores.append(latest.score)
    avg_health = round(sum(scores) / len(scores), 1) if scores else None

    return {
        "period": period,
        "pollutants": pollutants,
        "alarm_by_level": alarm_by_level,
        "workorder": workorder,
        "inspection_count": inspection_count,
        "avg_health": avg_health,
    }


def _strip_fences(content: str) -> str:
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()


async def generate(db: Session, period: str) -> Report:
    try:
        _datetime_check = datetime.strptime(period + "-01", "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="period 格式必须是 YYYY-MM")

    stats = build_stats(db, period)
    user_content = "月度统计: %s；报告期: %s" % (json.dumps(stats, ensure_ascii=False), period)
    try:
        content = await llm.chat(
            [{"role": "system", "content": prompts.REPORT_SYSTEM}, {"role": "user", "content": user_content}],
        )
    except llm.LLMNotConfigured:
        raise HTTPException(status_code=503, detail="LLM 未配置（LLM_API_KEY）")
    except llm.LLMError:
        raise HTTPException(status_code=502, detail="LLM 调用失败，请重试")
    content_md = _strip_fences(content)

    report = db.query(Report).filter(Report.period == period).first()
    if report:
        report.stats = stats
        report.content_md = content_md
        report.generated_at = datetime.utcnow()
    else:
        report = Report(period=period, stats=stats, content_md=content_md, generated_at=datetime.utcnow())
        db.add(report)
    db.commit()
    db.refresh(report)
    return report
