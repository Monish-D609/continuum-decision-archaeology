"""
OpenRouter LLM client with Cloudflare Workers AI as primary and OpenRouter as fallback.

Call order:
  1. Cloudflare Workers AI (Llama 3.1 8B) — primary, no rate limits, 128k ctx
  2. google/gemma-4-31b-it:free    (OpenRouter fallback)
  3. nvidia/nemotron-3-super-120b-a12b:free
  4. openrouter/free (auto-router)
  5. Local Ollama    (best-effort last resort)
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

import httpx

from continuum.config import (
    CF_ACCOUNT_ID,
    CF_API_TOKEN,
    CF_MODEL,
    CF_BASE_URL,
    OPENROUTER_BASE_URL,
    OPENROUTER_HEADERS,
    OPENROUTER_MODELS,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    INITIAL_BACKOFF_SECONDS,
)

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when all models in the fallback chain fail."""
    pass


class LLMClient:
    """
    Sends chat-completion requests through:
      1. Cloudflare Workers AI (primary — free, no rate limits, 128k ctx)
      2. OpenRouter free-tier fallback chain
      3. Local Ollama (last resort)
    """

    def __init__(self, timeout: float = 120.0):
        self.timeout = timeout
        self._client = httpx.Client(timeout=timeout)

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        response_format: Optional[dict] = None,
        require_json: bool = False,
    ) -> str:
        """
        Send a chat completion through the fallback chain.
        Returns the assistant's message content as a string.
        Raises LLMError if all models fail.

        require_json: if True, append a JSON reminder to the last user message
                      and pass response_format to models that support it.
        """
        errors: list[str] = []

        # Optionally enforce JSON output at the prompt level
        effective_messages = messages
        if require_json:
            effective_messages = _inject_json_reminder(messages)

        # 1. Try Cloudflare Workers AI first
        if CF_ACCOUNT_ID and CF_API_TOKEN:
            try:
                result = self._call_cloudflare(
                    messages=effective_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                logger.info("LLM call succeeded with Cloudflare Llama 3.1 8B")
                return result
            except Exception as e:
                error_msg = f"Cloudflare Llama 3.1 8B: {e}"
                logger.warning(f"LLM fallback — {error_msg}")
                errors.append(error_msg)
        else:
            logger.warning("CF_ACCOUNT_ID or CF_API_TOKEN not set — skipping Cloudflare")

        # 2. Try each OpenRouter model in the fallback chain
        for model in OPENROUTER_MODELS:
            try:
                result = self._call_openrouter(
                    model_id=model.model_id,
                    messages=effective_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format if require_json else None,
                )
                logger.info(f"LLM call succeeded with {model.label}")
                return result
            except Exception as e:
                error_msg = f"{model.label}: {e}"
                logger.warning(f"LLM fallback — {error_msg}")
                errors.append(error_msg)

        # 3. Last resort: try local Ollama
        try:
            result = self._call_ollama(
                messages=effective_messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            logger.info("LLM call succeeded with local Ollama")
            return result
        except Exception as e:
            error_msg = f"Ollama ({OLLAMA_MODEL}): {e}"
            logger.warning(f"LLM fallback — {error_msg}")
            errors.append(error_msg)

        raise LLMError(
            f"All models in the fallback chain failed:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Cloudflare Workers AI
    # ─────────────────────────────────────────────────────────────────────────

    def _call_cloudflare(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Call Cloudflare Workers AI (Llama 3.1 8B)."""
        url = f"{CF_BASE_URL}/{CF_MODEL}"
        payload: dict[str, Any] = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        response = self._client.post(
            url,
            headers={
                "Authorization": f"Bearer {CF_API_TOKEN}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if response.status_code != 200:
            raise httpx.HTTPStatusError(
                f"HTTP {response.status_code}: {response.text[:300]}",
                request=response.request,
                response=response,
            )

        data = response.json()
        if not data.get("success", True) or "errors" in data and data["errors"]:
            raise ValueError(f"Cloudflare error: {data}")

        # Cloudflare returns OpenAI-compatible format
        choices = data.get("result", {}).get("choices", [])
        if choices:
            content = choices[0].get("message", {}).get("content", "")
            if content:
                return content

        raise ValueError(f"Empty Cloudflare response: {data}")

    # ─────────────────────────────────────────────────────────────────────────
    # OpenRouter
    # ─────────────────────────────────────────────────────────────────────────

    def _call_openrouter(
        self,
        model_id: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[dict] = None,
        max_429_retries: int = 1,
    ) -> str:
        """Call an OpenRouter model with limited retry on 429."""
        payload: dict[str, Any] = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(1, max_429_retries + 2):
            response = self._client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=OPENROUTER_HEADERS,
                json=payload,
            )

            if response.status_code == 200:
                data = response.json()
                # Guard against error payloads inside a 200
                if "error" in data:
                    raise ValueError(f"Error in 200 response from {model_id}: {data['error']}")
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    if content:
                        return content
                raise ValueError(f"Empty response from {model_id}: {data}")

            if response.status_code == 429:
                if attempt > max_429_retries:
                    raise TimeoutError(
                        f"Exhausted {max_429_retries} retries on 429 for {model_id}"
                    )
                retry_after = response.headers.get("Retry-After")
                wait = float(retry_after) if retry_after else INITIAL_BACKOFF_SECONDS
                logger.warning(
                    f"429 rate limit from {model_id}, "
                    f"attempt {attempt}/{max_429_retries + 1}, "
                    f"waiting {wait:.1f}s"
                )
                time.sleep(wait)
                continue

            raise httpx.HTTPStatusError(
                f"HTTP {response.status_code}: {response.text[:500]}",
                request=response.request,
                response=response,
            )

        raise TimeoutError(f"Exhausted retries for {model_id}")

    # ─────────────────────────────────────────────────────────────────────────
    # Ollama
    # ─────────────────────────────────────────────────────────────────────────

    def _call_ollama(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Call local Ollama as a last-resort fallback."""
        try:
            response = self._client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
                timeout=180.0,
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "")
            if content:
                return content
            raise ValueError(f"Empty Ollama response: {data}")
        except httpx.ConnectError:
            raise ConnectionError(
                "Ollama is not running. Start it with 'ollama serve' "
                f"and pull the model with 'ollama pull {OLLAMA_MODEL}'"
            )

    def close(self):
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _inject_json_reminder(messages: list[dict]) -> list[dict]:
    """
    Append a JSON reminder to the last user message to coerce structured output
    on models that don't support response_format natively.
    """
    if not messages:
        return messages
    msgs = [m.copy() for m in messages]
    last = msgs[-1]
    if last.get("role") == "user":
        last["content"] = (
            last["content"].rstrip()
            + "\n\nIMPORTANT: Your response MUST be valid JSON only. "
              "Do not include any prose, markdown, or code fences — just the raw JSON object or array."
        )
    return msgs
