"""Prompt orchestration with validated outputs and explicit evidence boundaries."""
import json
import re
from datetime import datetime, timedelta
from math import isfinite
from . import prompts
from .llm_client import LLMClient, LLMError

def _content(result: dict) -> str:
    try:
        return result['choices'][0]['message']['content']
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError('LLM response has no message content') from exc

def _json(result: dict) -> dict:
    try:
        value = json.loads(_content(result))
    except (ValueError, TypeError) as exc:
        raise LLMError('Invalid LLM JSON output') from exc
    if not isinstance(value, dict):
        raise LLMError('LLM JSON output must be an object')
    return value

def _messages(system: str, user: str) -> list[dict]:
    return [{'role': 'system', 'content': system}, {'role': 'user', 'content': user}]

def _number(value: object, minimum: float | None = None, maximum: float | None = None) -> bool:
    return (type(value) in (float, int) and isfinite(value)
            and (minimum is None or value >= minimum)
            and (maximum is None or value <= maximum))

async def diagnose(alarm: dict, stats: dict, device: dict, client: LLMClient) -> dict:
    user = f'告警信息: {json.dumps(alarm, ensure_ascii=False)}；近2小时统计: {json.dumps(stats, ensure_ascii=False)}；设备信息: {json.dumps(device, ensure_ascii=False)}'
    result = _json(await client.chat(_messages(prompts.DIAGNOSIS, user), json_mode=True))
    causes = result.get('root_causes')
    if not isinstance(causes, list) or len(causes) > 3 or any(
        not isinstance(c, dict) or not isinstance(c.get('cause'), str) or not _number(c.get('confidence'), 0, 1)
        for c in causes
    ):
        raise LLMError('Invalid diagnosis causes')
    if not isinstance(result.get('measures'), list) or any(not isinstance(x, str) for x in result['measures']):
        raise LLMError('Invalid diagnosis measures')
    if not isinstance(result.get('summary'), str) or len(result['summary']) > 200:
        raise LLMError('Invalid diagnosis summary')
    minutes = result.get('estimated_recovery_minutes')
    if minutes is not None and (type(minutes) is not int or minutes < 0):
        raise LLMError('Invalid recovery estimate')
    return result

async def analyze_trend(series: list[dict], pollutant: str, limit: float,
                        client: LLMClient, base_ts: datetime) -> dict:
    """LLM scenario output. No statistical confidence claim is inferred from it."""
    if not series or not _number(limit, 0):
        raise ValueError('A non-empty series and non-negative limit are required')
    user = f'过去24小时逐时数据: {json.dumps(series, ensure_ascii=False)}；污染物: {pollutant}；标准值: {limit}'
    result = _json(await client.chat(_messages(prompts.TREND, user), json_mode=True))
    hours = result.get('hours')
    if not isinstance(hours, list) or len(hours) != 6:
        raise LLMError('Trend must contain six hours')
    for index, item in enumerate(hours, 1):
        if not isinstance(item, dict) or not _number(item.get('value'), 0) or not _number(item.get('exceed_prob'), 0, 1):
            raise LLMError('Invalid trend value or probability')
        try:
            ts = datetime.fromisoformat(item['ts'])
        except (KeyError, TypeError, ValueError) as exc:
            raise LLMError('Invalid trend timestamp') from exc
        if ts != base_ts + timedelta(hours=index):
            raise LLMError('Trend hours must be consecutive after base_ts')
    if not isinstance(result.get('drivers'), list) or any(not isinstance(x, str) for x in result['drivers']):
        raise LLMError('Invalid trend drivers')
    if not _number(result.get('confidence'), 0, 1):
        raise LLMError('Invalid trend confidence')
    result['experimental'] = True
    result['notice'] = '模型生成的情景参考，概率和置信度未经校准，不用于合规判定'
    return result

async def assess_health(stats: dict, device: dict, client: LLMClient) -> dict:
    user = f'近30天统计: {json.dumps(stats, ensure_ascii=False)}；设备信息: {json.dumps(device, ensure_ascii=False)}'
    result = _json(await client.chat(_messages(prompts.HEALTH, user), json_mode=True))
    if type(result.get('score')) is not int or not 0 <= result['score'] <= 100:
        raise LLMError('Invalid health score')
    factors = result.get('factors')
    if not isinstance(factors, list) or any(not isinstance(x, dict) or not isinstance(x.get('name'), str) or not isinstance(x.get('impact'), str) for x in factors):
        raise LLMError('Invalid health factors')
    if not isinstance(result.get('suggestion'), str) or len(result['suggestion']) > 300:
        raise LLMError('Invalid health suggestion')
    result['experimental'] = True
    return result

async def draft_report(stats: dict, period: str, client: LLMClient) -> str:
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period):
        raise ValueError('period must be YYYY-MM')
    result = await client.chat(_messages(prompts.REPORT,
        f'月度统计: {json.dumps(stats, ensure_ascii=False)}；报告期: {period}'))
    content = _content(result)
    if not isinstance(content, str) or not content.strip():
        raise LLMError('Empty report')
    headings = ('一、数据概述', '二、超标事件说明', '三、设备运行情况', '四、改进建议')
    if not all(h in content for h in headings):
        raise LLMError('Report is missing required sections')
    return content
