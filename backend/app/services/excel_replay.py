"""Import one CEMS .xls source and expose a repeatable replay clock."""
from datetime import datetime, timedelta
from pathlib import Path
import re
import xlrd
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.config import settings
from app.db import SessionLocal
from app.models import CemsRaw, Device, ReplayState

POLLUTANTS = {'pm': 7, 'so2': 11, 'nox': 15, 'co': 19, 'hcl': 23}
STATE_MAP = {'正常': 'normal', '停运': 'shutdown', '启炉': 'startup', '烘炉(炉内耐火材料修复或改造)': 'startup'}
NUMERIC = re.compile(r'^\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+))')

def number(value):
    if value is None or value == '':
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = NUMERIC.match(str(value))
    return float(match.group(1)) if match else None

def timestamp(value, book):
    if isinstance(value, (float, int)):
        return xlrd.xldate_as_datetime(value, book.datemode)
    return datetime.strptime(str(value).strip(), '%Y-%m-%d %H:%M:%S')

def parse_row(values, book, device_id):
    ts = timestamp(values[0], book)
    state_raw = str(values[1]).strip()
    if state_raw not in STATE_MAP:
        raise ValueError(f'未知工况 {state_raw!r}，时间 {ts}')
    flags = [str(values[i]).strip() for i in (6, 10, 14, 18, 22, 26, 28, 30, 32, 34, 36)]
    row = CemsRaw(ts=ts, device_id=device_id, condition_flag=STATE_MAP[state_raw],
        report_flag=int(all(flag == '数据有效' for flag in flags)),
        comm_flag=int(str(values[2]).strip() not in ('', '-', '0', '无', '否')),
        exceed_flag=int(any('(超)' in str(v) for v in values)),
        zero_flag=int(any('(零)' in str(v) for v in values)),
        furnace_temp=number(values[3]),
        flow=(number(values[5]) * 3600 if number(values[5]) is not None else None),
        o2=number(values[27]), flue_velocity=number(values[29]),
        flue_temp=number(values[31]), flue_humidity=number(values[33]),
        flue_pressure=(number(values[35]) * 1000 if number(values[35]) is not None else None))
    for name, index in POLLUTANTS.items():
        setattr(row, name + '_real', number(values[index]))
        setattr(row, name + '_std', number(values[index + 1]))
        setattr(row, name + '_limit', number(values[index + 2]))
    return row

def import_excel(db: Session, path: str, device_id: str):
    source = Path(path).expanduser()
    if not source.is_file():
        raise FileNotFoundError(source)
    book = xlrd.open_workbook(str(source), on_demand=True)
    sheet = book.sheet_by_index(0)
    if sheet.ncols != 37 or sheet.cell_value(3, 0) != '监控时间':
        raise ValueError('Excel 表头与预期的 37 列 CEMS 格式不符')
    existing = db.query(CemsRaw.id).filter(CemsRaw.device_id == device_id).first()
    if not existing:
        rows = []
        previous = None
        for source_row in range(4, sheet.nrows):
            values = sheet.row_values(source_row)
            row = parse_row(values, book, device_id)
            if previous is not None and row.ts <= previous:
                raise ValueError(f'第 {source_row + 1} 行时间不递增')
            previous = row.ts
            rows.append(row)
        if not rows:
            raise ValueError('Excel 没有监测记录')
        db.add_all(rows)
        db.flush()
    boundaries = db.query(func.min(CemsRaw.ts), func.max(CemsRaw.ts)).filter(CemsRaw.device_id == device_id).one()
    if not db.query(Device.id).filter(Device.code == device_id).first():
        db.add(Device(code=device_id, name='翔安厂3#排放口', type='CEMS'))
    replay = db.query(ReplayState).filter(ReplayState.device_id == device_id).first()
    if not replay:
        replay = ReplayState(id=1, device_id=device_id, source_start=boundaries[0], source_end=boundaries[1])
        db.add(replay)
    replay.source_start, replay.source_end = boundaries
    replay.started_at = datetime.utcnow()
    replay.speed = settings.replay_speed
    db.commit()
    return {'rows': sheet.nrows - 4, 'start': boundaries[0], 'end': boundaries[1]}

def initialize():
    if not settings.cems_excel_path:
        return None
    db = SessionLocal()
    try:
        return import_excel(db, settings.cems_excel_path, settings.cems_device_id)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def current_cursor(db: Session, device_id: str, now: datetime | None = None):
    replay = db.query(ReplayState).filter(ReplayState.device_id == device_id).first()
    if not replay:
        return None
    span = (replay.source_end - replay.source_start).total_seconds() + 60
    elapsed = max(0, ((now or datetime.utcnow()) - replay.started_at).total_seconds()) * replay.speed
    return replay.source_start + timedelta(seconds=elapsed % span)
