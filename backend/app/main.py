from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401 注册全部表
from app.config import settings
from app.db import Base, engine
from app.routers import alarm, assistant, auth, data, device, inspection, prediction, report, workorder
from app.services.jobs import scheduler
from app.services.excel_replay import initialize as initialize_replay
from app.utils.oplog import LogMiddleware

Base.metadata.create_all(bind=engine)
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="GreenMind API", version="0.1.0")

app.add_middleware(LogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(alarm.router)
app.include_router(prediction.router)
app.include_router(assistant.router)
app.include_router(auth.users_router)
app.include_router(workorder.router)
app.include_router(device.router)
app.include_router(inspection.router)
app.include_router(inspection.upload_router)
app.include_router(report.router)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.on_event("startup")
def start_scheduler():
    initialize_replay()
    if not scheduler.running:
        scheduler.start()


@app.on_event("shutdown")
def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
