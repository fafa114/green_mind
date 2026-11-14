from io import BytesIO
from pathlib import Path

import markdown
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session
from xhtml2pdf import pisa

from app.config import settings
from app.models import Report, User
from app.schemas.report import ReportGenerateIn, ReportOut
from app.services import report_svc
from app.utils.deps import get_current_user, get_db, require_role

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("")
def list_reports(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    q = db.query(Report)
    total = q.count()
    items = q.order_by(Report.period.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {"id": r.id, "period": r.period, "generated_at": r.generated_at} for r in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报表不存在")
    return report


@router.post("/generate", response_model=ReportOut)
async def generate_report(
    body: ReportGenerateIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return await report_svc.generate(db, body.period)


def _pdf_font_css() -> str:
    font = Path(settings.pdf_font_path)
    if font.exists():
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from xhtml2pdf import default as xdefault

        try:
            pdfmetrics.registerFont(TTFont("cjk", str(font)))
            xdefault.DEFAULT_FONT["cjk"] = "cjk"
            return "body { font-family: cjk; font-size: 12px; }"
        except Exception:
            pass
    return "body { font-size: 12px; }"


def _export_pdf(report: Report) -> StreamingResponse:
    body = markdown.markdown(report.content_md or "", extensions=["tables"])
    font_css = _pdf_font_css()
    html = (
        "<html><head><meta charset='utf-8'/><style>%s</style></head>"
        "<body><h1>GreenMind 月报 %s</h1>%s</body></html>" % (font_css, report.period, body)
    )
    buf = BytesIO()
    result = pisa.CreatePDF(html, dest=buf, encoding="utf-8")
    if result.err:
        raise HTTPException(status_code=500, detail="PDF 生成失败")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=report_%s.pdf" % report.period},
    )


def _export_excel(report: Report) -> StreamingResponse:
    stats = report.stats or {}
    wb = Workbook()
    ws = wb.active
    ws.title = "统计"
    ws.append(["污染物", "最大值", "平均值", "超标小时数"])
    for name, s in (stats.get("pollutants") or {}).items():
        ws.append([name, s.get("max"), s.get("avg"), s.get("exceed_hours")])
    ws.append([])
    ws.append(["告警级别", "数量"])
    for level, count in (stats.get("alarm_by_level") or {}).items():
        ws.append([level, count])
    ws.append([])
    workorder = stats.get("workorder") or {}
    ws.append(["工单总数", workorder.get("total")])
    ws.append(["已完结", workorder.get("completed")])
    ws.append(["按时完成率", workorder.get("on_time_rate")])
    ws.append([])
    ws.append(["巡检次数", stats.get("inspection_count")])
    ws.append(["设备平均健康分", stats.get("avg_health")])

    ws2 = wb.create_sheet("报告")
    ws2["A1"] = "GreenMind 月报 %s" % report.period
    ws2["A2"] = report.content_md or ""
    ws2.column_dimensions["A"].width = 100

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=report_%s.xlsx" % report.period},
    )


@router.get("/{report_id}/export")
def export_report(
    report_id: int,
    format: str = "pdf",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报表不存在")
    if format == "pdf":
        return _export_pdf(report)
    if format == "excel":
        return _export_excel(report)
    raise HTTPException(status_code=400, detail="format 仅支持 pdf/excel")
