"""Create the first administrator without inserting sample monitoring data.

Run with GREENMIND_ADMIN_PASSWORD set in the environment.
"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app.models
from app.db import Base, SessionLocal, engine
from app.models import User
from app.utils.security import hash_password

password = os.environ.get('GREENMIND_ADMIN_PASSWORD')
if not password or len(password) < 6:
    raise SystemExit('GREENMIND_ADMIN_PASSWORD must have at least 6 characters')
Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    if not db.query(User.id).filter(User.username == 'admin').first():
        db.add(User(username='admin', real_name='管理员', role='admin', password_hash=hash_password(password)))
        db.commit()
        print('Admin account created')
    else:
        print('Admin account already exists')
finally:
    db.close()
