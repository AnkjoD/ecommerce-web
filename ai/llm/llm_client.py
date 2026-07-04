"""

llm_client.py — Abstract LLM Provider cho Homura Shop AI.

Switch provider bằng env var: LLM_PROVIDER=ollama|openai|gemini

Hỗ trợ:
  - Text completion (generate)
  - Chat completion (messages list)
  - Function/Tool calling (tools list)

Đọc API key từ env:
  OPENAI_API_KEY, GEMINI_API_KEY

Cách dùng:
    from llm_client import get_llm_client, LLMMessage

    client = get_llm_client()
    response = client.chat(
        messages=[LLMMessage(role="user", content="Xin chào")],
        tools=TOOLS,   # Optional
    )
    # response.content    → text
    # response.tool_calls → list[ToolCall] nếu có
"""
import json
import logging
import os
import re
import itertools
import threading
from dataclasses import dataclass, field
from typing import Optional, List

# Load .env trước khi đọc os.getenv — cần thiết khi chạy standalone (test, script)
try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    _load_dotenv(_env_path, override=False)   # override=False: env system > .env
except ImportError:
    pass  # dotenv không bắt buộc (Docker inject env trực tiếp)

logger = logging.getLogger("homura.llm_client")

# ─── Config từ env ────────────────────────────────────────────────────────────
LLM_PROVIDER    = os.getenv("LLM_PROVIDER", "ollama").lower()   # ollama | openai | gemini | groq
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL    = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL    = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
# Router có thể dùng key riêng (fallback về key generation nếu không set)
ROUTER_LLM_PROVIDER   = os.getenv("ROUTER_LLM_PROVIDER", "gemini").lower()
ROUTER_GEMINI_API_KEY = os.getenv("ROUTER_GEMINI_API_KEY") or GEMINI_API_KEY
ROUTER_OPENAI_API_KEY = os.getenv("ROUTER_OPENAI_API_KEY") or OPENAI_API_KEY
ROUTER_GROQ_API_KEY   = os.getenv("ROUTER_GROQ_API_KEY")   or GROQ_API_KEY
ROUTER_GEMINI_MODEL   = os.getenv("ROUTER_GEMINI_MODEL", "gemini-2.0-flash")
LLM_TIMEOUT     = int(os.getenv("LLM_TIMEOUT", "120"))

# ─── Key Pool — hỗ trợ nhiều API key, tự động rotate ────────────────────────
class KeyPool:
    """
    Quản lý pool nhiều API key, tự rotate khi gặp rate limit.

    Cách dùng trong .env (ngăn cách bằng dấu phẩy):
        GEMINI_API_KEY=key_acc1,key_acc2,key_acc3
        GROQ_API_KEY=key_acc1,key_acc2
        ROUTER_GEMINI_API_KEY=key_router_acc1,key_router_acc2
    """
    # HTTP status / message pattern của rate limit ở các provider
    RATE_LIMIT_SIGNALS = {
        "429", "rate limit", "quota", "resource_exhausted",
        "too many requests", "rateLimitExceeded",
    }

    def __init__(self, raw_key_string: str):
        """
        raw_key_string: giá trị từ env (có thể là 1 key hoặc nhiều key cách nhau bằng dấu phẩy).
        """
        self._keys: List[str] = [
            k.strip() for k in (raw_key_string or "").split(",") if k.strip()
        ]
        self._lock   = threading.Lock()
        self._cycle  = itertools.cycle(self._keys) if self._keys else iter([])
        self._current: Optional[str] = self._keys[0] if self._keys else None

    def __bool__(self) -> bool:
        return bool(self._keys)

    def __len__(self) -> int:
        return len(self._keys)

    def current(self) -> Optional[str]:
        """Trả về key hiện tại (không rotate)."""
        return self._current

    def rotate(self) -> Optional[str]:
        """Sang key tiếp theo trong pool (round-robin, thread-safe)."""
        with self._lock:
            try:
                self._current = next(self._cycle)
                logger.info(f"[KeyPool] Rotated to key #{self._keys.index(self._current) + 1}/{len(self._keys)}")
            except StopIteration:
                pass
        return self._current

    def is_rate_limit_error(self, error: Exception) -> bool:
        """Kiểm tra lỗi có phải rate limit không."""
        err_str = str(error).lower()
        return any(sig.lower() in err_str for sig in self.RATE_LIMIT_SIGNALS)

    @classmethod
    def from_env(cls, env_var: str) -> "KeyPool":
        """Tạo KeyPool từ env variable. Dùng: KeyPool.from_env('GEMINI_API_KEY')"""
        return cls(os.getenv(env_var, ""))


# Các pool cố định — tạo 1 lần khi module load
GEMINI_KEY_POOL = KeyPool.from_env("GEMINI_API_KEY")
OPENAI_KEY_POOL = KeyPool.from_env("OPENAI_API_KEY")
GROQ_KEY_POOL   = KeyPool.from_env("GROQ_API_KEY")
# Router pools (fallback về generation pool nếu không có key riêng)
ROUTER_GEMINI_POOL = KeyPool.from_env("ROUTER_GEMINI_API_KEY") or GEMINI_KEY_POOL
ROUTER_OPENAI_POOL = KeyPool.from_env("ROUTER_OPENAI_API_KEY") or OPENAI_KEY_POOL
ROUTER_GROQ_POOL   = KeyPool.from_env("ROUTER_GROQ_API_KEY")   or GROQ_KEY_POOL

# ─── Data classes ─────────────────────────────────────────────────────────────
@dataclass
class LLMMessage:
    role: str       # "system" | "user" | "assistant" | "tool"
    content: str
    tool_call_id: Optional[str] = None   # Dùng khi role="tool"
    name: Optional[str] = None           # Tên tool (optional cho một số provider)


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class LLMResponse:
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    finish_reason: str = "stop"     # "stop" | "tool_calls" | "length"
    provider: str = ""


# ─── Base class ───────────────────────────────────────────────────────────────
class BaseLLMClient:
    """Interface chung cho tất cả providers."""

    def chat(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        raise NotImplementedError

    def generate(
        self,
        prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 256,
    ) -> str:
        """Simple text completion — dùng cho routing/classification."""
        resp = self.chat(
            messages=[LLMMessage(role="user", content=prompt)],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.content


# ─── Ollama Provider ──────────────────────────────────────────────────────────
class OllamaClient(BaseLLMClient):
    """Gọi Ollama /api/chat với hỗ trợ tool calling."""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "qwen2.5:7b"):
        import requests as _req
        self._req = _req
        self.base_url = base_url.rstrip("/")
        self.model = model

    def chat(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        payload: dict = {
            "model": self.model,
            "messages": [self._to_ollama_msg(m) for m in messages],
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "required"  # Force Ollama to call a tool
            logger.debug(f"[Ollama] Sending {len(tools)} tools to model: {[t['function']['name'] for t in tools]}")

        try:
            resp = self._req.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=LLM_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"[Ollama] chat error: {e}")
            return LLMResponse(content="", provider="ollama")

        msg = data.get("message", {})
        content = msg.get("content") or ""
        raw_tool_calls = msg.get("tool_calls") or []
        finish_reason = "tool_calls" if raw_tool_calls else data.get("done_reason", "stop")

        # ── Debug logging ───────────────────────────────────────────────────
        if tools and not raw_tool_calls:
            # Model nhận tools nhưng không gọi bất kỳ cái nào
            logger.warning(
                f"[Ollama] NO tool_calls in response despite {len(tools)} tools offered. "
                f"finish_reason={finish_reason!r} "
                f"content_preview={content[:120]!r}"
            )
        elif raw_tool_calls:
            logger.debug(
                f"[Ollama] Received {len(raw_tool_calls)} tool_call(s): "
                f"{[tc.get('function', {}).get('name') for tc in raw_tool_calls]}"
            )
        # ────────────────────────────────────────────────────────────

        tool_calls = []
        for tc in raw_tool_calls:
            fn = tc.get("function", {})
            args = fn.get("arguments", {})
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except Exception:
                    args = {}
            tool_calls.append(ToolCall(
                id=tc.get("id", f"call_{len(tool_calls)}"),
                name=fn.get("name", ""),
                arguments=args,
            ))

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=finish_reason,
            provider="ollama",
        )

    def generate(self, prompt: str, temperature: float = 0.0, max_tokens: int = 256) -> str:
        """Dùng /api/generate cho single-turn completion (faster cho routing)."""
        try:
            resp = self._req.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature, "num_predict": max_tokens},
                },
                timeout=LLM_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
        except Exception as e:
            logger.error(f"[Ollama] generate error: {e}")
            return ""

    @staticmethod
    def _to_ollama_msg(m: LLMMessage) -> dict:
        d: dict = {"role": m.role, "content": m.content}
        if m.name:
            d["name"] = m.name
        return d


# ─── OpenAI Provider ──────────────────────────────────────────────────────────
class OpenAIClient(BaseLLMClient):
    """Gọi OpenAI API với tool calling (gpt-4o-mini mặc định)."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        try:
            from openai import OpenAI
            self._client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        except ImportError:
            raise ImportError("openai package không được cài. Chạy: pip install openai")
        self.model = model

    def chat(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        oai_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
        ]
        # OpenAI dùng role="tool" + tool_call_id
        for i, m in enumerate(messages):
            if m.role == "tool" and m.tool_call_id:
                oai_messages[i] = {
                    "role": "tool",
                    "tool_call_id": m.tool_call_id,
                    "content": m.content,
                }

        kwargs: dict = {
            "model": self.model,
            "messages": oai_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            resp = self._client.chat.completions.create(**kwargs)
        except Exception as e:
            logger.error(f"[OpenAI] chat error: {e}")
            return LLMResponse(content="", provider="openai")

        choice = resp.choices[0]
        msg = choice.message
        content = msg.content or ""
        finish_reason = choice.finish_reason or "stop"

        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except Exception:
                    args = {}
                tool_calls.append(ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=args,
                ))

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=finish_reason,
            provider="openai",
        )


# ─── Gemini Provider (google-genai SDK mới) ──────────────────────────────────────
class GeminiClient(BaseLLMClient):
    """
    Gọi Google Gemini API dùng SDK mới: google-genai.
    Cài: pip install google-genai
    Model gợi ý:
      gemini-1.5-flash   ← free tier rộng, nhanh, ổn định
      gemini-1.5-pro     ← chất lượng cao hơn
      gemini-2.0-flash   ← cần billing được bật
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-1.5-flash"):
        try:
            from google import genai
            self._client = genai.Client(api_key=api_key or os.getenv("GEMINI_API_KEY"))
        except ImportError:
            raise ImportError("google-genai không được cài. Chạy: pip install google-genai")
        # SDK tự xử lý model name — không cần thêm prefix
        self.model_name = model

    def chat(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        from google.genai import types

        # Xây dựng contents và tách system prompt
        system_instruction = None
        contents = []
        for m in messages:
            if m.role == "system":
                system_instruction = m.content
            else:
                role = "model" if m.role == "assistant" else "user"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=m.content)],
                ))

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )
        except Exception as e:
            logger.error(f"[Gemini] chat error: {e}")
            return LLMResponse(content="", provider="gemini")

        # Safe parse — tránh crash khi response rỗng (safety filter / quota)
        try:
            content    = response.text or ""
            tool_calls = []
            if response.candidates:
                for part in (response.candidates[0].content.parts or []):
                    if hasattr(part, "function_call") and part.function_call:
                        fc = part.function_call
                        tool_calls.append(ToolCall(
                            id=f"gemini_{fc.name}",
                            name=fc.name,
                            arguments=dict(fc.args or {}),
                        ))
            finish_reason = "tool_calls" if tool_calls else "stop"
        except Exception as parse_err:
            logger.warning(f"[Gemini] response parse error: {parse_err}")
            content, tool_calls, finish_reason = "", [], "stop"

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=finish_reason,
            provider="gemini",
        )



# ─── Groq Provider (OpenAI-compatible API) ────────────────────────────────────
class GroqClient(BaseLLMClient):
    """
    Gọi Groq API — OpenAI-compatible, cực nhanh (LPU inference).
    Dùng openai SDK với base_url=https://api.groq.com/openai/v1.

    Model phổ biến:
      llama-3.1-8b-instant   ← nhanh nhất, phù hợp router
      llama-3.1-70b-versatile ← mạnh hơn, cho generation
      mixtral-8x7b-32768     ← context dài
      gemma2-9b-it           ← Google Gemma 2
    """

    GROQ_BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.1-8b-instant"):
        try:
            from openai import OpenAI
            self._client = OpenAI(
                api_key=api_key or os.getenv("GROQ_API_KEY"),
                base_url=self.GROQ_BASE_URL,
            )
        except ImportError:
            raise ImportError("openai package không được cài. Chạy: pip install openai")
        self.model = model

    def chat(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        oai_messages = [{"role": m.role, "content": m.content} for m in messages]
        for i, m in enumerate(messages):
            if m.role == "tool" and m.tool_call_id:
                oai_messages[i] = {
                    "role": "tool",
                    "tool_call_id": m.tool_call_id,
                    "content": m.content,
                }

        kwargs: dict = {
            "model": self.model,
            "messages": oai_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            resp = self._client.chat.completions.create(**kwargs)
        except Exception as e:
            logger.error(f"[Groq] chat error: {e}")
            return LLMResponse(content="", provider="groq")

        choice = resp.choices[0]
        msg    = choice.message
        content = msg.content or ""
        finish_reason = choice.finish_reason or "stop"

        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except Exception:
                    args = {}
                tool_calls.append(ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=args,
                ))

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=finish_reason,
            provider="groq",
        )


def build_client(
    provider: str,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    ollama_url: Optional[str] = None,
) -> BaseLLMClient:
    """Tạo client theo provider."""
    p = provider.lower()

    if p == "ollama":
        m = model or OLLAMA_MODEL
        url = ollama_url or OLLAMA_BASE_URL
        logger.info(f"[build_client] Ollama ({m} @ {url})")
        return OllamaClient(base_url=url, model=m)

    if p == "openai":
        key = api_key or OPENAI_KEY_POOL.current() or OPENAI_API_KEY
        m   = model or OPENAI_MODEL
        if not key:
            logger.warning("[build_client] OPENAI_API_KEY chưa set, fallback Ollama")
            return OllamaClient()
        logger.info(f"[build_client] OpenAI ({m})")
        return OpenAIClient(api_key=key, model=m)

    if p == "gemini":
        key = api_key or GEMINI_KEY_POOL.current() or GEMINI_API_KEY
        m   = model or GEMINI_MODEL
        if not key:
            logger.warning("[build_client] GEMINI_API_KEY chưa set, fallback Ollama")
            return OllamaClient()
        logger.info(f"[build_client] Gemini ({m})")
        return GeminiClient(api_key=key, model=m)

    if p == "groq":
        key = api_key or GROQ_KEY_POOL.current() or GROQ_API_KEY
        m   = model or GROQ_MODEL
        if not key:
            logger.warning("[build_client] GROQ_API_KEY chưa set, fallback Ollama")
            return OllamaClient()
        logger.info(f"[build_client] Groq ({m})")
        return GroqClient(api_key=key, model=m)

    logger.warning(f"[build_client] Provider không rõ '{provider}', fallback Ollama")
    return OllamaClient()


_router_client: Optional[BaseLLMClient] = None
_generate_client: Optional[BaseLLMClient] = None

def get_router_client() -> BaseLLMClient:
    """Dùng router provider định nghĩa trong .env (mặc định gemini)."""
    global _router_client
    if _router_client is None:
        p = ROUTER_LLM_PROVIDER
        if p == "gemini":
            _router_client = build_client(provider=p, model=ROUTER_GEMINI_MODEL, api_key=ROUTER_GEMINI_POOL.current())
        elif p == "openai":
            _router_client = build_client(provider=p, api_key=ROUTER_OPENAI_POOL.current())
        elif p == "groq":
            _router_client = build_client(provider=p, api_key=ROUTER_GROQ_POOL.current())
        else:
            _router_client = build_client(provider=p)
    return _router_client

def get_generate_client() -> BaseLLMClient:
    """Dùng generation provider định nghĩa trong .env (mặc định ollama)."""
    global _generate_client
    if _generate_client is None:
        _generate_client = build_client(provider=LLM_PROVIDER)
    return _generate_client

