from typing import Optional
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Alarm, CemsRaw, ChatMessage, ChatSession, Device, HealthScore, User
from app.services import llm
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix='/api/assistant', tags=['assistant'])

class SessionBody(BaseModel):
    title: Optional[str] = Field(default=None, max_length=128)

class ChatBody(BaseModel):
    session_id: int
    message: str = Field(min_length=1, max_length=2000)

def own(db, session_id, user_id):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(404, '会话不存在')
    return session

@router.get('/sessions')
def sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [{'id': s.id, 'title': s.title, 'created_at': s.created_at} for s in db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.id.desc()).all()]

@router.post('/sessions')
def create(body: SessionBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = ChatSession(user_id=user.id, title=body.title or '新会话')
    db.add(session); db.commit(); db.refresh(session)
    return {'id': session.id}

@router.get('/sessions/{session_id}/messages')
def messages(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    own(db, session_id, user.id)
    return [{'id': m.id, 'session_id': m.session_id, 'role': m.role, 'content': m.content, 'created_at': m.created_at}
            for m in db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id).all()]

@router.delete('/sessions/{session_id}')
def delete(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = own(db, session_id, user.id)
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session); db.commit()
    return {'ok': True}

def context(db):
    end = datetime.utcnow(); start = end - timedelta(days=30)
    devices = [x[0] for x in db.query(Device.code).all()]
    result = {'period_start': start.isoformat(), 'period_end': end.isoformat(), 'devices': devices,
              'alarm_count': db.query(Alarm).filter(Alarm.ts >= start, Alarm.ts < end).count(), 'pollutant_max': {}, 'health': {}}
    for device_id in devices:
        rows = db.query(CemsRaw).filter(CemsRaw.device_id == device_id, CemsRaw.ts >= start, CemsRaw.ts < end,
            CemsRaw.condition_flag == 'normal', CemsRaw.report_flag == 1).all()
        result['pollutant_max'][device_id] = {}
        for p in ('pm', 'so2', 'nox', 'co', 'hcl'):
            valid = [r for r in rows if getattr(r, p+'_std') is not None]
            if valid:
                max_row = max(valid, key=lambda r: getattr(r, p+'_std'))
                result['pollutant_max'][device_id][p] = {'value': getattr(max_row, p+'_std'), 'ts': max_row.ts.isoformat(), 'unit': 'mg/m³'}
        score = db.query(HealthScore).filter(HealthScore.device_id == device_id).order_by(HealthScore.id.desc()).first()
        if score:
            result['health'][device_id] = {'score': score.score, 'suggestion': score.suggestion}
    return result

@router.post('/chat')
async def chat(body: ChatBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    own(db, body.session_id, user.id)
    if not llm.settings.llm_api_key:
        raise HTTPException(503, 'LLM 未配置')
    evidence = context(db)
    user_message = ChatMessage(session_id=body.session_id, role='user', content=body.message)
    db.add(user_message); db.commit()
    prompt = [{'role': 'system', 'content': '你是 GreenMind 智能助手。仅依据提供的查询结果回答；说明时间范围和设备编号；没有证据时说不知道。不得编造数据。'},
              {'role': 'user', 'content': '查询结果: '+json.dumps(evidence, ensure_ascii=False)+'\n问题: '+body.message}]
    async def events():
        try:
            chunks = await llm.chat(prompt, stream=True)
            answer_parts = []
            async for token in chunks:
                answer_parts.append(token)
                yield 'event: token\ndata: '+json.dumps({'text': token}, ensure_ascii=False)+'\n\n'
            answer = ''.join(answer_parts)
            if not answer:
                raise llm.LLMError('LLM 未返回文本')
            session = SessionLocal()
            try:
                reply = ChatMessage(session_id=body.session_id, role='assistant', content=answer)
                session.add(reply); session.commit(); session.refresh(reply)
                yield 'event: done\ndata: '+json.dumps({'message_id': reply.id})+'\n\n'
            finally:
                session.close()
        except Exception:
            yield 'event: error\ndata: '+json.dumps({'detail': '助手暂不可用'}, ensure_ascii=False)+'\n\n'
    return StreamingResponse(events(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
