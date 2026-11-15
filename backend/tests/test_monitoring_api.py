from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.db import Base, SessionLocal, engine
import app.models
from app.main import app
from app.models import Alarm, CemsRaw, Device, User
from app.routers.alarm import scan
from app.utils.security import hash_password

Base.metadata.create_all(engine)
client = TestClient(app)

def setup_module():
    db = SessionLocal()
    db.add_all([User(username='apiadmin', real_name='Admin', role='admin', password_hash=hash_password('testpass')),
                User(username='apiviewer', real_name='Viewer', role='viewer', password_hash=hash_password('testpass')),
                Device(code='TEST-01', name='Test device'),
                CemsRaw(device_id='TEST-01', ts=datetime(2026, 1, 1, 0), condition_flag='normal', report_flag=1,
                        pm_std=30, pm_limit=20, so2_std=2, so2_limit=80, furnace_temp=940),
                CemsRaw(device_id='TEST-01', ts=datetime(2026, 1, 1, 0, 1), condition_flag='shutdown', report_flag=1,
                        pm_std=50, pm_limit=20, furnace_temp=60)])
    db.commit(); db.close()

def auth(name):
    r = client.post('/api/auth/login', json={'username': name, 'password': 'testpass'})
    assert r.status_code == 200
    return {'Authorization': 'Bearer ' + r.json()['token']}

def test_data_and_alarm_dedup():
    h = auth('apiadmin')
    assert client.get('/api/data/latest?device_id=TEST-01&as_of=2026-01-01T00:00:30', headers=h).json()['pm_std'] == 30
    assert client.get('/api/data/overview?device_id=TEST-01&date=2026-01-01', headers=h).json()['pollutants']['pm']['exceed_count'] == 1
    db = SessionLocal()
    try:
        assert len(scan(db, datetime(2026, 1, 1))) == 1
        assert len(scan(db, datetime(2026, 1, 1))) == 0
        assert db.query(Alarm).count() == 1
    finally:
        db.close()
    assert client.get('/api/alarms', headers=h).json()['total'] == 1

def test_viewer_cannot_ack_or_refresh():
    h = auth('apiviewer')
    assert client.post('/api/alarms/1/ack', headers=h).status_code == 403
    assert client.post('/api/predictions/refresh', headers=h, json={'device_id': 'TEST-01'}).status_code == 403

def test_session_isolation():
    admin = auth('apiadmin'); viewer = auth('apiviewer')
    sid = client.post('/api/assistant/sessions', headers=admin, json={'title': 'mine'}).json()['id']
    assert client.get(f'/api/assistant/sessions/{sid}/messages', headers=viewer).status_code == 404
    assert client.delete(f'/api/assistant/sessions/{sid}', headers=viewer).status_code == 404

def test_assistant_stream_and_history(monkeypatch):
    from app.routers import assistant
    async def fake_chat(messages, **kwargs):
        assert 'pollutant_max' in messages[-1]['content']
        return '已查询设备数据。'
    monkeypatch.setattr(assistant.llm.settings, 'llm_api_key', 'test-key')
    monkeypatch.setattr(assistant.llm, 'chat', fake_chat)
    h = auth('apiadmin')
    sid = client.post('/api/assistant/sessions', headers=h, json={'title': 'stream'}).json()['id']
    result = client.post('/api/assistant/chat', headers=h, json={'session_id': sid, 'message': '数据如何？'})
    assert result.status_code == 200
    assert 'event: token' in result.text and 'event: done' in result.text
    history = client.get(f'/api/assistant/sessions/{sid}/messages', headers=h).json()
    assert [m['role'] for m in history] == ['user', 'assistant']
