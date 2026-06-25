import os
import re
import time
import hashlib
import json
import logging
import requests
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


from core.embedding_engine import PhoBertEmbeddingEngine, CrossEncoderReranker
from core.prompt_builder import build_rag_prompt, build_fallback_response
from core.agentic_rag import run_deterministic_chat

# ─── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":%(message)s}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("homura.ai")

# ─── Khởi tạo ─────────────────────────────────────────────────────────────────
from config import settings

embedding_engine = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
reranker_engine = CrossEncoderReranker()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2:7b")

# 3I: tăng lên 500
MAX_MESSAGE_LENGTH = int(os.getenv("AI_MAX_MSG_LEN", "500"))
USE_LLM_REWRITE = os.getenv("AI_USE_LLM_REWRITE", "0") == "1"

# ─── Redis cache ───────────────────────────────────────────────────────────────
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = int(os.getenv("AI_CACHE_TTL", "600"))

try:
    _redis = redis.from_url(REDIS_URL, decode_responses=True)
    _redis.ping()
    logger.info('"Redis connected"')
except Exception as _e:
    _redis = None
    logger.warning(f'"Redis unavailable — cache disabled: {_e}"')


def _cache_key(prefix: str, text: str) -> str:
    return f"homura:{prefix}:{hashlib.sha256(text.lower().strip().encode()).hexdigest()[:16]}"


def cache_get(key: str):
    if not _redis:
        return None
    try:
        val = _redis.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


def cache_set(key: str, value, ttl: int = CACHE_TTL):
    if not _redis:
        return
    try:
        _redis.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


# ─── 3H. PII masking ──────────────────────────────────────────────────────────
def mask_pii(text: str) -> str:
    text = re.sub(r'\d{10,11}', '[PHONE]', text)
    text = re.sub(r'[\w.-]+@[\w.-]+', '[EMAIL]', text)
    return text


# ─── 3G. Rate limiter ─────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Homura Shop AI Sidecar",
    description="RAG Engine: Vietnamese-SBERT Embeddings + pgvector + Ollama LLM",
    version="4.0.0",
)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Quá nhiều yêu cầu, thử lại sau 1 phút."})


# ─── 3B. CategoryMatcher startup ──────────────────────────────────────────────
from core.retrieval import CategoryMatcher
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_db_engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=_db_engine)

category_matcher: Optional[CategoryMatcher] = None


@app.on_event("startup")
async def startup():
    global category_matcher
    with Session() as session:
        category_matcher = CategoryMatcher(session, embedding_engine)


# ─── Schemas ───────────────────────────────────────────────────────────────────
class EmbeddingRequest(BaseModel):
    text: str


class BatchEmbeddingRequest(BaseModel):
    texts: List[str]


class ChatRequest(BaseModel):
    message: str
    context_products: List[dict] = []
    chat_history: Optional[List[dict]] = []
    stream: bool = False
    # user_id chỉ được NestJS gán sau khi verify JWT — KHÔNG nhận từ user input trực tiếp
    user_id: Optional[str] = None


class SyncProductRequest(BaseModel):
    product_id: str


# ─── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Homura Shop AI Sidecar",
        "version": "4.0.0",
        "models": {
            "embedding": settings.EMBEDDING_MODEL,
            "llm": f"Ollama ({OLLAMA_MODEL})",
        },
    }


@app.get("/health")
async def health_check():
    ollama_status = "disconnected"
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            ollama_status = f"connected ({', '.join(models[:2]) or 'no models'})"
    except Exception:
        pass

    cache_status = "connected" if _redis else "disabled"
    return {
        "status": "healthy",
        "embedding_engine": f"{settings.EMBEDDING_MODEL} loaded",
        "ollama": ollama_status,
        "cache": cache_status,
    }


# ─── Embedding Endpoints ───────────────────────────────────────────────────────
@app.post("/embeddings/create")
async def create_embedding(req: EmbeddingRequest):
    """Biến văn bản thành vector bằng Vietnamese-SBERT. Có cache."""
    cache_key = _cache_key("emb", req.text)
    cached = cache_get(cache_key)
    if cached:
        return {"vector": cached, "dimensions": len(cached), "cached": True}
    try:
        vector = embedding_engine.get_embedding(req.text)
        cache_set(cache_key, vector, ttl=3600)
        return {"vector": vector, "dimensions": len(vector), "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embeddings/batch")
async def create_batch_embeddings(req: BatchEmbeddingRequest):
    """Tạo vector cho nhiều văn bản cùng lúc."""
    try:
        results = [embedding_engine.get_embedding(t) for t in req.texts]
        return {"vectors": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Chat (Agentic RAG) Endpoint ──────────────────────────────────────────────
@app.post("/chat/completions")
@limiter.limit("20/minute")
async def chat_completion(request: Request, req: ChatRequest):
    """
    Agentic RAG Endpoint:
      1. LLM Router (llm_router.py) extract intent + filters
      2. Agentic loop: LLM tự gọi tools (search_products, check_stock, get_price, ...)
      3. Tổng hợp kết quả → trả về response

    user_id chỉ được truyền từ NestJS sau khi verify JWT — không từ user input.
    """
    t_start = time.time()

    # Cắt input dài
    original_len = len(req.message)
    if original_len > MAX_MESSAGE_LENGTH:
        req.message = req.message[:MAX_MESSAGE_LENGTH]
        logger.warning(
            f'"input_truncated", "original_len": {original_len}, '
            f'"truncated_to": {MAX_MESSAGE_LENGTH}'
        )

    safe_message = mask_pii(req.message)

    # Cache check (chỉ cache khi không có user_id — tránh cache lệch user)
    cache_key = _cache_key("chat", req.message) if not req.user_id else None
    if cache_key:
        cached = cache_get(cache_key)
        if cached:
            logger.info(f'"cache_hit", "query": "{safe_message[:80]}"')
            return {**cached, "cached": True}

    logger.info(f'\"agentic_request\", \"query\": \"{safe_message[:80]}\", \"has_user_id\": {bool(req.user_id)}, \"user_id\": \"{req.user_id}\"')

    with Session() as session:
        agentic_result = run_deterministic_chat(
            query=req.message,
            session=session,
            embedding_engine=embedding_engine,
            reranker_engine=reranker_engine,
            category_matcher=category_matcher,
            user_id=req.user_id,
            chat_history=req.chat_history,
            top_k=int(os.getenv("RAG_TOP_K", "5")),
        )
    total_ms = round((time.time() - t_start) * 1000)
    
    # 3. Guard rail cuối cùng ở cấp API
    final_resp_text = agentic_result["response"]
    products_used = len(agentic_result["products"])
    # run_deterministic_chat trả về: response, products, latencies, router_result, mode
    # Không có tools_called và turns — đặt giá trị mặc định
    tools_called = []   # deterministic flow không dùng tools
    turns        = 1    # luôn là 1 turn

    logger.info(
        f'"agentic_response", "mode": "{agentic_result["mode"]}", '
        f'"turns": {turns}, '
        f'"tools": {tools_called}, '
        f'"total_ms": {total_ms}'
    )

    result = {
        "response":      final_resp_text,
        "mode":          agentic_result["mode"],
        "turns":         turns,
        "tools_called":  tools_called,
        "products_used": products_used,
        "products":      agentic_result["products"],
        "router":        agentic_result.get("router_result", {}),
        "total_ms":      total_ms,
    }

    # Cache result (chỉ khi không có user context)
    if cache_key and agentic_result["mode"] not in ("offtopic", "chitchat"):
        cache_set(cache_key, result)

    return result


# ─── 3C. Webhook reload categories ────────────────────────────────────────────
@app.post("/webhook/reload-categories")
async def reload_categories(request: Request):
    """Admin gọi sau khi thêm category mới."""
    secret = request.headers.get("X-Webhook-Secret", "")
    if secret != os.getenv("WEBHOOK_SECRET", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    with Session() as session:
        category_matcher.reload(session)
    logger.info('"webhook_reload_categories"')
    return {"status": "reloaded"}


# ─── 3D. Webhook sync product (có secret check) ────────────────────────────────
@app.post("/webhook/sync-product/{product_id}")
async def webhook_sync_product(product_id: str, request: Request, background_tasks: BackgroundTasks):
    """NestJS gọi sau khi tạo/update sản phẩm. Re-embed trong background."""
    secret = request.headers.get("X-Webhook-Secret", "")
    if secret != os.getenv("WEBHOOK_SECRET", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    background_tasks.add_task(_sync_single_product, product_id)
    logger.info(f'"webhook_sync", "product_id": "{product_id}"')
    return {"status": "accepted", "product_id": product_id, "message": "Re-embedding queued"}


def _sync_single_product(product_id: str):
    """Background task: re-embed 1 sản phẩm khi có thay đổi."""
    try:
        from sqlalchemy import text as _text

        with Session() as session:
            row = session.execute(_text("""
                SELECT
                    p.id, p.name, p.brand, p.tags, p.description, p.attributes,
                    c.name AS category_name,
                    MIN(pv.price) FILTER (WHERE pv.is_active AND pv.stock_quantity > 0) AS min_price,
                    MAX(pv.price) FILTER (WHERE pv.is_active AND pv.stock_quantity > 0) AS max_price,
                    ARRAY_AGG(DISTINCT pv.size ORDER BY pv.size)
                        FILTER (WHERE pv.is_active AND pv.stock_quantity > 0 AND pv.size IS NOT NULL)
                        AS available_sizes,
                    ARRAY_AGG(DISTINCT pv.color ORDER BY pv.color)
                        FILTER (WHERE pv.is_active AND pv.stock_quantity > 0 AND pv.color IS NOT NULL)
                        AS available_colors
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN product_variants pv ON pv.product_id = p.id
                WHERE p.id = :pid AND p.status = 'active'
                GROUP BY p.id, p.name, p.brand, p.tags, p.description, p.attributes, c.name
            """), {"pid": product_id}).mappings().first()

            if not row:
                logger.warning(f'"webhook_sync_skip", "product_id": "{product_id}", "reason": "not found or inactive"')
                return

            from sync_products import build_fields
            product_dict = dict(row)
            fields = build_fields(product_dict)

            for field_name, field_text in fields.items():
                vector = embedding_engine.get_embedding(field_text)
                vector_str = "[" + ",".join(map(str, vector)) + "]"
                session.execute(_text("""
                    INSERT INTO product_embeddings
                        (id, product_id, field_name, embedding, embedding_text, updated_at)
                    VALUES
                        (gen_random_uuid(), :pid, :field, :emb, :txt, NOW())
                    ON CONFLICT (product_id, field_name) DO UPDATE
                    SET embedding = EXCLUDED.embedding,
                        embedding_text = EXCLUDED.embedding_text,
                        updated_at = NOW()
                """), {"pid": product_id, "field": field_name, "emb": vector_str, "txt": field_text})

            session.commit()

            if _redis:
                try:
                    _redis.delete(_cache_key("emb", product_dict.get("name", "")))
                except Exception:
                    pass

        logger.info(f'"webhook_sync_done", "product_id": "{product_id}", "fields": {list(fields.keys())}')

    except Exception as e:
        logger.error(f'"webhook_sync_error", "product_id": "{product_id}", "error": "{e}"')
