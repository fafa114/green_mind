"""Run an idempotent import and reset the replay cursor to source start."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.models
from app.config import settings
from app.db import Base, engine
from app.services.excel_replay import initialize

if not settings.cems_excel_path:
    raise SystemExit('Set CEMS_EXCEL_PATH to the source .xls file')
Base.metadata.create_all(bind=engine)
print(initialize())
