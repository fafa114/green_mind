import json
from datetime import date, datetime, timedelta
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Alarm, CemsRaw, Device, HealthScore
from app.services import llm, prompts


def build_stats(db: Session, device: Device) -> Dict[str, Any]:
    since = datetime.utcnow() - timedelta(days=30)
    base = db.query(CemsRaw).filter(CemsRaw.device_id == device.code, CemsRaw.ts >= since)
    total = base.count()
    comm_interrupt_count = base.filter(CemsRaw.comm_flag == 1).count()
    abnormal = base.filter(or_(CemsRaw.exceed_flag == 1, CemsRaw.zero_flag == 1)).count()
    alarm_count = db.query(Alarm).filter(Alarm.device_id == device.code, Alarm.created_at >= since).count()

    calibration_overdue_days = 0
    if device.last_calibration_date:
        calibration_overdue_days = max(
            0, (date.today() - device.last_calibration_date).days - device.calibration_cycle_days,
        )
    age_years = 0.0
    if device.install_date:
        age_years = round((date.today() - device.install_date).days / 365.25, 1)

    return {
        "comm_interrupt_count": comm_interrupt_count,
        "abnormal_ratio": round(abnormal / total, 4) if total else 0.0,
        "alarm_count": alarm_count,
        "calibration_overdue_days": calibration_overdue_days,
        "age_years": age_years,
        "sample_rows": total,
    }


async def refresh(db: Session, device: Device) -> HealthScore:
    stats = build_stats(db, device)
    device_info = {"code": device.code, "name": device.name, "type": device.type, "status": device.status}
    user_content = "近30天统计: %s；设备信息: %s" % (
        json.dumps(stats, ensure_ascii=False), json.dumps(device_info, ensure_ascii=False),
    )
    try:
        content = await llm.chat(
            [{"role": "system", "content": prompts.HEALTH_SYSTEM}, {"role": "user", "content": user_content}],
            json_mode=True,
        )
        data = llm.parse_json(content)
    except llm.LLMNotConfigured:
        raise HTTPException(status_code=503, detail="LLM 未配置（LLM_API_KEY）")
    except llm.LLMError:
        raise HTTPException(status_code=502, detail="LLM 返回格式异常，请重试")

    try:
        score = int(data.get("score", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=502, detail="LLM 返回的 score 不是数字")
    score = max(0, min(100, score))

    hs = HealthScore(
        device_id=device.code,
        score=score,
        factors=data.get("factors", []),
        suggestion=data.get("suggestion", ""),
        scored_at=datetime.utcnow(),
    )
    db.add(hs)
    db.commit()
    db.refresh(hs)
    return hs
