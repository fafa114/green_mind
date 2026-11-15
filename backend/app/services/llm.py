import asyncio
import json
import time
from typing import Any, AsyncIterator, Dict, List, Optional, Union

import httpx

from app.config import settings
from app.db import SessionLocal
from app.models import OperationLog


class LLMError(RuntimeError):
    pass


class LLMNotConfigured(LLMError):
    pass


class _Retryable(Exception):
    pass


def _log_call(model: str, usage: Dict[str, Any], duration: float) -> None:
    try:
        db = SessionLocal()
        try:
            db.add(OperationLog(
                user_id=None,
                action="llm_call",
                target=model,
                detail={
                    "prompt_tokens": usage.get("prompt_tokens"),
                    "completion_tokens": usage.get("completion_tokens"),
                    "duration_ms": int(duration * 1000),
                },
            ))
            db.commit()
        finally:
            db.close()
    except Exception:
        pass


def parse_json(content: str) -> Dict[str, Any]:
    text = (content or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMError("LLM 未返回 JSON：" + content[:200])
    try:
        return json.loads(text[start:end + 1])
    except ValueError:
        raise LLMError("LLM 返回的 JSON 无法解析：" + text[start:start + 200])


async def _stream_once(client: httpx.AsyncClient, url, headers, payload, model, t0) -> AsyncIterator[str]:
    usage = {}
    async with client.stream("POST", url, json=payload, headers=headers) as resp:
        if resp.status_code == 429 or resp.status_code >= 500:
            raise _Retryable("HTTP %d" % resp.status_code)
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line.startswith("data:"):
                continue
            chunk = line[5:].strip()
            if chunk == "[DONE]":
                break
            try:
                obj = json.loads(chunk)
            except ValueError:
                continue
            usage = obj.get("usage") or usage
            choices = obj.get("choices") or []
            if choices:
                delta = choices[0].get("delta", {}).get("content")
                if delta:
                    yield delta
    _log_call(model, usage, time.time() - t0)


async def _stream_with_retries(url, headers, payload, attempts) -> AsyncIterator[str]:
    last_error: Optional[Exception] = None
    for model, delay in attempts:
        if delay:
            await asyncio.sleep(delay)
        request_payload = {**payload, "model": model}
        emitted = False
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async for token in _stream_once(client, url, headers, request_payload, model, time.time()):
                    emitted = True
                    yield token
            return
        except (_Retryable, httpx.TimeoutException, httpx.TransportError) as exc:
            if emitted:
                raise LLMError("LLM 流式响应中断") from exc
            last_error = exc
    raise LLMError("LLM 调用失败：%s" % last_error)


async def chat(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    stream: bool = False,
    json_mode: bool = False,
) -> Union[str, AsyncIterator[str]]:
    """统一 LLM 调用入口：超时 60s，超时/5xx 重试（退避 1s/3s），429 或重试失败切备用模型。"""
    if not settings.llm_api_key:
        raise LLMNotConfigured("LLM_API_KEY 未配置")

    url = settings.llm_base_url.rstrip("/") + "/v1/chat/completions"
    headers = {"Authorization": "Bearer " + settings.llm_api_key}
    payload = {"messages": messages, "stream": stream}
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    if tools:
        payload["tools"] = tools

    attempts = [
        (settings.llm_model, 0),
        (settings.llm_model, 1),
        (settings.llm_fallback_model, 3),
    ]
    if stream:
        return _stream_with_retries(url, headers, payload, attempts)
    last_error: Optional[Exception] = None
    for model, delay in attempts:
        if delay:
            await asyncio.sleep(delay)
        payload["model"] = model
        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.post(url, json=payload, headers=headers)
                if r.status_code == 429 or r.status_code >= 500:
                    raise _Retryable("HTTP %d" % r.status_code)
                r.raise_for_status()
                data = r.json()
                _log_call(model, data.get("usage") or {}, time.time() - t0)
                return data["choices"][0]["message"]["content"]
        except (_Retryable, httpx.TimeoutException) as e:
            last_error = e
    raise LLMError("LLM 调用失败：%s" % last_error)
