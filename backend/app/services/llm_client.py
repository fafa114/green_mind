"""Shared DeepSeek-compatible chat client. The API key is read from environment only."""
import asyncio
import json
import os
from typing import Any
import httpx

class LLMError(RuntimeError):
    pass

class LLMClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None,
                 model: str | None = None, fallback_model: str | None = None,
                 transport: httpx.AsyncBaseTransport | None = None):
        self.api_key = api_key or os.getenv('LLM_API_KEY', '')
        self.base_url = (base_url or os.getenv('LLM_BASE_URL', 'https://api.deepseek.com')).rstrip('/')
        self.model = model or os.getenv('LLM_MODEL', 'deepseek-chat')
        self.fallback_model = fallback_model or os.getenv('LLM_FALLBACK_MODEL', '')
        self.transport = transport
        if not self.api_key:
            raise LLMError('LLM_API_KEY is required')

    async def chat(self, messages: list[dict[str, Any]], tools: list[dict] | None = None,
                   stream: bool = False, json_mode: bool = False) -> dict | Any:
        if stream:
            raise LLMError('Use stream_chat for streaming responses')
        payload = {'model': self.model, 'messages': messages, 'stream': False}
        if tools is not None:
            payload['tools'] = tools
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}
        async with httpx.AsyncClient(timeout=60, transport=self.transport) as client:
            models = [self.model] + ([self.fallback_model] if self.fallback_model and self.fallback_model != self.model else [])
            for model in models:
                payload['model'] = model
                for attempt in range(3):
                    try:
                        response = await client.post(self.base_url + '/v1/chat/completions', json=payload,
                            headers={'Authorization': f'Bearer {self.api_key}'})
                        if response.status_code == 429:
                            break
                        response.raise_for_status()
                        result = response.json()
                        if not result.get('choices'):
                            raise LLMError('LLM returned no choices')
                        return result
                    except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as exc:
                        retryable = not isinstance(exc, httpx.HTTPStatusError) or exc.response.status_code >= 500
                        if not retryable or attempt == 2:
                            if not retryable:
                                raise LLMError(f'LLM request failed: {exc}') from exc
                            break
                        await asyncio.sleep((1, 3)[attempt])
        raise LLMError('LLM unavailable after retries and fallback')

    async def stream_chat(self, messages: list[dict[str, Any]]):
        payload = {'model': self.model, 'messages': messages, 'stream': True}
        async with httpx.AsyncClient(timeout=60, transport=self.transport) as client:
            async with client.stream('POST', self.base_url + '/v1/chat/completions', json=payload,
                                     headers={'Authorization': f'Bearer {self.api_key}'}) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith('data: '):
                        continue
                    data = line[6:]
                    if data == '[DONE]':
                        return
                    try:
                        delta = json.loads(data)['choices'][0]['delta'].get('content')
                    except (ValueError, KeyError, IndexError, TypeError):
                        continue
                    if delta:
                        yield delta
