"""Prompt orchestration with strict output validation."""
import json
from typing import Any
from . import prompts
from .llm import LLMClient, LLMError

def _content(result: dict) -> str:
    return result['choices'][0]['message']['content']

def _json(result: dict) -> dict:
    try:
        value = json.loads(_content(result))
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise LLMError('Invalid LLM JSON output') from exc
    if not isinstance(value, dict):
        raise LLMError('LLM JSON output must be an object')
    return value

async def diagnose(alarm: dict, stats: dict, device: dict, client: LLMClient) -> dict:
    user = f'告警信息: {json.dumps(alarm, ensure_ascii=False)}；近2小时统计: {json.dumps(stats, ensure_ascii=False)}；设备信息: {json.dumps(device, ensure_ascii=False)}'
    result = _json(await client.chat([{'role':'system','content':prompts.DIAGNOSIS},{'role':'user','content':user}], json_mode=True))
    causes = result.get('root_causes')
    if not isinstance(causes, list) or len(causes) > 3 or any(not isinstance(c, dict) or not isinstance(c.get('cause'), str) or not isinstance(c.get('confidence'), (int,float)) or not 0 <= c['confidence'] <= 1 for c in causes):
        raise LLMError('Invalid diagnosis causes')
    if not isinstance(result.get('measures'), list) or any(not isinstance(x,str) for x in result['measures']):
        raise LLMError('Invalid diagnosis measures')
    if not isinstance(result.get('summary'), str) or len(result['summary']) > 200:
        raise LLMError('Invalid diagnosis summary')
    minutes = result.get('estimated_recovery_minutes')
    if minutes is not None and (not isinstance(minutes, int) or minutes < 0):
        raise LLMError('Invalid recovery estimate')
    return result

async def draft_report(stats: dict, period: str, client: LLMClient) -> str:
    result = await client.chat([{'role':'system','content':prompts.REPORT},
        {'role':'user','content':f'月度统计: {json.dumps(stats, ensure_ascii=False)}；报告期: {period}'}])
    content = _content(result)
    if not isinstance(content, str) or not content.strip():
        raise LLMError('Empty report')
    return content
