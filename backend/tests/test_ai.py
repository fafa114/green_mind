import json
import httpx
import pytest
from app.services.llm import LLMClient, LLMError
from app.services.ai_features import diagnose

@pytest.mark.asyncio
async def test_json_request_and_diagnosis():
    def handler(request):
        assert request.headers['authorization'] == 'Bearer test'
        body = json.loads(request.content)
        assert body['response_format'] == {'type':'json_object'}
        return httpx.Response(200, json={'choices':[{'message':{'content':json.dumps({'root_causes':[{'cause':'待排查','confidence':0.3}],'measures':['现场复核'],'estimated_recovery_minutes':None,'summary':'证据不足'})}}]})
    client = LLMClient(api_key='test', transport=httpx.MockTransport(handler))
    assert (await diagnose({}, {}, {}, client))['summary'] == '证据不足'

@pytest.mark.asyncio
async def test_fallback_on_rate_limit():
    seen=[]
    def handler(request):
        model=json.loads(request.content)['model']; seen.append(model)
        return httpx.Response(429 if model=='primary' else 200,json={'choices':[{'message':{'content':'ok'}}]})
    client=LLMClient(api_key='test',model='primary',fallback_model='backup',transport=httpx.MockTransport(handler))
    assert (await client.chat([{'role':'user','content':'hi'}]))['choices'][0]['message']['content']=='ok'
    assert seen==['primary','backup']

@pytest.mark.asyncio
async def test_rejects_unbounded_confidence():
    def handler(request):
        return httpx.Response(200,json={'choices':[{'message':{'content':json.dumps({'root_causes':[{'cause':'x','confidence':2}],'measures':[],'summary':'x'})}}]})
    with pytest.raises(LLMError):
        await diagnose({}, {}, {}, LLMClient(api_key='test',transport=httpx.MockTransport(handler)))
