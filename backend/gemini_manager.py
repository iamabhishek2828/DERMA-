"""
Gemini API key manager with environment-driven fallback support.
"""

import logging
import os
import threading
import time
from functools import wraps
from typing import Any, Dict, List, Tuple

import google.generativeai as genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENV_KEY_NAMES = (
    "GEMINI_API_KEY",
    "GEMINI_API_KEY_FALLBACK",
    "GEMINI_API_KEY_2",
    "GEMINI_API_KEY_3",
    "GEMINI_API_KEY_4",
)


class GeminiAPIManager:
    """Manage Gemini API keys with basic rotation and cooldown handling."""

    def __init__(self, api_keys: List[str] | None = None):
        self.api_keys = self._normalize_keys(api_keys or self._load_api_keys_from_env())
        self.current_key_index = 0
        self.key_failures = {i: 0 for i in range(len(self.api_keys))}
        self.key_last_used = {i: 0 for i in range(len(self.api_keys))}
        self.key_cooldown = {i: 0 for i in range(len(self.api_keys))}
        self.lock = threading.Lock()

        if self.api_keys:
            self._configure_genai(self.api_keys[0])
            logger.info("Initialized GeminiAPIManager with %s key(s)", len(self.api_keys))
        else:
            logger.warning("Gemini API keys are not configured; Gemini-backed features are disabled")

    @staticmethod
    def _normalize_keys(keys: List[str]) -> List[str]:
        cleaned: List[str] = []
        seen = set()

        for key in keys:
            normalized = (key or "").strip()
            if normalized and normalized not in seen:
                cleaned.append(normalized)
                seen.add(normalized)

        return cleaned

    @staticmethod
    def _load_api_keys_from_env() -> List[str]:
        keys: List[str] = []

        for env_name in ENV_KEY_NAMES:
            value = os.getenv(env_name)
            if value:
                keys.append(value)

        combined_keys = os.getenv("GEMINI_API_KEYS")
        if combined_keys:
            for raw_key in combined_keys.replace("\n", ",").split(","):
                if raw_key.strip():
                    keys.append(raw_key.strip())

        return keys

    def is_configured(self) -> bool:
        return bool(self.api_keys)

    def _ensure_configured(self) -> None:
        if not self.is_configured():
            raise RuntimeError("No Gemini API keys configured")

    def _configure_genai(self, api_key: str) -> None:
        genai.configure(api_key=api_key)

    def _get_next_key(self) -> Tuple[str, int]:
        self._ensure_configured()

        with self.lock:
            current_time = time.time()
            available_keys = [
                (key, index)
                for index, key in enumerate(self.api_keys)
                if current_time > self.key_cooldown[index]
            ]

            if not available_keys:
                selected_index = min(self.key_cooldown, key=self.key_cooldown.get)
                logger.warning("All Gemini keys are cooling down; reusing the soonest available key")
                return self.api_keys[selected_index], selected_index

            available_keys.sort(
                key=lambda item: (
                    self.key_failures[item[1]],
                    self.key_last_used[item[1]],
                )
            )

            selected_key, selected_index = available_keys[0]
            self.current_key_index = selected_index
            self.key_last_used[selected_index] = current_time
            return selected_key, selected_index

    def _mark_key_failed(self, key_index: int, cooldown_seconds: int = 300) -> None:
        with self.lock:
            self.key_failures[key_index] += 1
            self.key_cooldown[key_index] = time.time() + cooldown_seconds
            logger.warning(
                "Gemini key %s marked as failed for %ss",
                key_index + 1,
                cooldown_seconds,
            )

    def _reset_key_failures(self, key_index: int) -> None:
        with self.lock:
            if self.key_failures[key_index] > 0:
                self.key_failures[key_index] = max(0, self.key_failures[key_index] - 1)

    def generate_content(
        self,
        prompt: str,
        model_name: str = "gemini-2.0-flash-exp",
        max_retries: int | None = None,
    ) -> str:
        self._ensure_configured()

        retries = max_retries or len(self.api_keys)
        last_exception = None

        for attempt in range(retries):
            key_index = None
            try:
                api_key, key_index = self._get_next_key()
                self._configure_genai(api_key)

                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)

                if response and response.text:
                    self._reset_key_failures(key_index)
                    logger.info("Gemini content generated with key %s", key_index + 1)
                    return response.text

                raise RuntimeError("Empty response from Gemini API")
            except Exception as exc:
                last_exception = exc
                if key_index is not None:
                    self._mark_key_failed(key_index, self._cooldown_for_error(str(exc)))

                if attempt < retries - 1:
                    time.sleep(min(2**attempt, 10))

        raise RuntimeError(
            f"All {len(self.api_keys)} Gemini API keys failed. Last error: {last_exception}"
        )

    def generate_embeddings(
        self,
        text: str,
        model_name: str = "models/text-embedding-004",
        max_retries: int | None = None,
    ) -> List[float]:
        self._ensure_configured()

        retries = max_retries or len(self.api_keys)
        last_exception = None

        for attempt in range(retries):
            key_index = None
            try:
                api_key, key_index = self._get_next_key()
                self._configure_genai(api_key)

                response = genai.embed_content(
                    model=model_name,
                    content=text,
                    task_type="retrieval_document",
                )

                if response and "embedding" in response:
                    self._reset_key_failures(key_index)
                    logger.info("Gemini embeddings generated with key %s", key_index + 1)
                    return response["embedding"]

                raise RuntimeError("Empty embedding response from Gemini API")
            except Exception as exc:
                last_exception = exc
                if key_index is not None:
                    self._mark_key_failed(key_index, self._cooldown_for_error(str(exc)))

                if attempt < retries - 1:
                    time.sleep(min(2**attempt, 10))

        raise RuntimeError(f"All Gemini embedding requests failed. Last error: {last_exception}")

    @staticmethod
    def _cooldown_for_error(error_message: str) -> int:
        normalized = error_message.lower()
        if "quota" in normalized or "rate limit" in normalized:
            return 600
        if "invalid" in normalized or "unauthorized" in normalized:
            return 1800
        return 300

    def get_key_status(self) -> Dict[str, Any]:
        current_time = time.time()
        keys_status = []

        for index, key in enumerate(self.api_keys):
            keys_status.append(
                {
                    "key_number": index + 1,
                    "key_preview": f"{key[:6]}...",
                    "failures": self.key_failures[index],
                    "in_cooldown": current_time < self.key_cooldown[index],
                    "cooldown_remaining": max(
                        0, int(self.key_cooldown[index] - current_time)
                    ),
                    "last_used": (
                        int(current_time - self.key_last_used[index])
                        if self.key_last_used[index] > 0
                        else None
                    ),
                }
            )

        return {
            "configured": self.is_configured(),
            "total_keys": len(self.api_keys),
            "current_key": self.current_key_index + 1 if self.api_keys else None,
            "keys": keys_status,
        }


gemini_manager = GeminiAPIManager()


def with_gemini_fallback(max_retries: int | None = None):
    """Decorator placeholder for Gemini-backed call sites."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                logger.error("Function %s failed: %s", func.__name__, exc)
                raise

        return wrapper

    return decorator
