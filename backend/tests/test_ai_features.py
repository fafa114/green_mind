import json
from datetime import datetime, timedelta
import httpx
import pytest
from app.services.ai_features import analyze_trend, assess_health, draft_report
from app.services.llm import LLMClient, LLMError

def client_for(value):
    def handler(request):
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(value, ensure_ascii=False)}}]})
    return LLMClient(api_key='test', transport=httpx.MockTransport(handler))

@pytest.mark.asyncio
async def test_health_score_and_factors_are_validated():
    result = await assess_health({}, {}, client_for({'score': 80, 'factors': [{'name': '维护', 'impact': '待核实'}], 'suggestion': '检查设备'}))
    assert result['experimental'] is True
    with pytest.raises(LLMError):
        await assess_health({}, {}, client_for({'score': True, 'factors': [], 'suggestion': 'x'}))

@pytest.mark.asyncio
async def test_trend_hours_are_checked():
    base = datetime(2026, 7, 25, 12)
    hours = [{'ts': (base + timedelta(hours=i)).isoformat(), 'value': 1.0, 'exceed_prob': 0.1} for i in range(1, 7)]
    result = await analyze_trend([{'value': 1}], 'so2', 50, client_for({'hours': hours, 'drivers': [], 'confidence': 0.5}), base)
    assert result['experimental'] is True
    hours[2]['ts'] = base.isoformat()
    with pytest.raises(LLMError):
        await analyze_trend([{'value': 1}], 'so2', 50, client_for({'hours': hours, 'drivers': [], 'confidence': 0.5}), base)

@pytest.mark.asyncio
async def test_report_requires_four_sections():
    with pytest.raises(LLMError):
        await draft_report({}, '2026-07', client_for('一、数据概述'))
