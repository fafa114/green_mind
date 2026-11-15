from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import app.models
from app.db import Base
from app.models import CemsRaw, ReplayState
from app.services import excel_replay

class Sheet:
    ncols = 37
    nrows = 6
    def cell_value(self, row, col):
        return '监控时间' if (row, col) == (3, 0) else ''
    def row_values(self, row):
        values = [''] * 37
        values[0] = f'2026-07-21 00:0{row-4}:00'
        values[1] = '停运' if row == 4 else '正常'
        values[2] = '-'
        values[3], values[5] = '31.75', '1.1'
        values[7:10] = ['2.97', '74.25(超)' if row == 4 else '0(零)', '20.0']
        values[27], values[35] = '20.6', '0.065'
        for i in (6, 10, 14, 18, 22, 26, 28, 30, 32, 34, 36):
            values[i] = '数据有效'
        return values

class Book:
    datemode = 0
    def sheet_by_index(self, index):
        return Sheet()

def test_import_is_idempotent_and_clock_loops(monkeypatch, tmp_path):
    source = tmp_path / 'sample.xls'
    source.write_bytes(b'fixture')
    monkeypatch.setattr(excel_replay.xlrd, 'open_workbook', lambda *a, **kw: Book())
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        excel_replay.import_excel(db, str(source), 'XA-3')
        excel_replay.import_excel(db, str(source), 'XA-3')
        assert db.query(CemsRaw).count() == 2
        first = db.query(CemsRaw).order_by(CemsRaw.ts).first()
        assert first.condition_flag == 'shutdown'
        assert first.pm_std == 74.25 and first.exceed_flag == 1
        assert first.flow == 3960.0000000000005 and first.flue_pressure == 65.0
        second = db.query(CemsRaw).order_by(CemsRaw.ts.desc()).first()
        assert second.zero_flag == 1 and second.pm_std == 0
        state = db.query(ReplayState).one()
        state.started_at = datetime(2026, 11, 15)
        state.speed = 60
        db.commit()
        assert excel_replay.current_cursor(db, 'XA-3', datetime(2026, 11, 15, 0, 0, 1)) == first.ts + timedelta(minutes=1)
        assert excel_replay.current_cursor(db, 'XA-3', datetime(2026, 11, 15, 0, 0, 2)) == first.ts

def test_prediction_uses_only_replayed_rows():
    from fastapi import HTTPException
    from app.routers.prediction import make_prediction
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    start = datetime(2026, 7, 21)
    with Session(engine) as db:
        db.add(ReplayState(id=1, device_id='XA-3', source_start=start,
                           source_end=start + timedelta(minutes=10),
                           started_at=datetime.utcnow() - timedelta(seconds=1), speed=60))
        db.add_all(CemsRaw(device_id='XA-3', ts=start + timedelta(minutes=i),
                           condition_flag='normal', report_flag=1, so2_std=float(i), so2_limit=50)
                   for i in range(10))
        db.commit()
        # At one real second only the first two source rows are visible.
        try:
            make_prediction(db, 'XA-3', 'so2')
            assert False, 'future observations were used'
        except HTTPException as exc:
            assert exc.status_code == 422
