"""

Query Rewriting Module for Homura Shop RAG.

Kỹ thuật được giữ lại:
1. Conversational Expansion — giải quyết đại từ từ lịch sử chat (không cần LLM)

Kỹ thuật đã xóa (dùng Ollama, timeout cao, không ổn định):
- HyDE (hyde_rewrite)
- Multi-Query (multi_query_rewrite)
- Sub-Query Decomposition (sub_query_decompose)
"""
import re
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

# ─── Conversational Expansion ─────────────────────────────────────────────────
PRONOUN_PATTERNS = re.compile(
    r'\b(nó|đôi đó|cái đó|cái kia|loại đó|loại này|đôi này|sản phẩm đó|mẫu đó|mẫu này|chúng|chúng nó)\b',
    re.IGNORECASE,
)


def conversational_expansion(query: str, chat_history: list, session: Optional[Session] = None) -> str:
    """
    Thay thế đại từ trong câu hỏi bằng thực thể cụ thể từ lịch sử chat.

    Ví dụ:
        Lịch sử: "Cho xem Nike Pegasus 40"
        Query: "Nó có màu đen không?"
        Output: "Nike Pegasus 40 có màu đen không?"

    6B: brand_keywords query từ DB thay vì hardcode.
    """
    if not PRONOUN_PATTERNS.search(query):
        return query

    recent_context = " ".join(
        msg.get("content", "") for msg in chat_history[-6:]
        if msg.get("role") in ("user", "assistant")
    )

    # 6B: lấy brands từ DB
    brand_keywords: list[str] = []
    if session:
        try:
            brands = session.execute(
                text(
                    "SELECT DISTINCT brand FROM products "
                    "WHERE status = 'active' AND brand IS NOT NULL "
                    "LIMIT 100"
                )
            ).scalars().all()
            brand_keywords = [b for b in brands if b]
        except Exception:
            pass

    found_entities = []

    for brand in brand_keywords:
        if brand.lower() in recent_context.lower():
            pattern = rf'{re.escape(brand)}[\w\s"\']+?(?=\.|,|\s{{2}}|$)'
            matches = re.findall(pattern, recent_context, re.IGNORECASE)
            if matches:
                found_entities.extend(matches[:1])

    for msg in reversed(chat_history):
        if msg.get("products"):
            for p in msg["products"][:1]:
                found_entities.insert(0, p.get("name", ""))
            break

    if found_entities:
        replacement = found_entities[0].strip()
        return PRONOUN_PATTERNS.sub(replacement, query)

    return query


# ─── Pipeline tổng hợp ────────────────────────────────────────────────────────
def rewrite_query(
    query: str,
    chat_history: list,
    session: Optional[Session] = None,
    # Kept for backward compatibility, ignored:
    ollama_model: str = "qwen2:7b",
    use_hyde: bool = False,
    use_multi_query: bool = False,
) -> dict:
    """
    Pipeline Query Rewriting — chỉ giữ conversational_expansion.

    Returns dict:
        {
            "primary": str,
            "variants": list[str],
            "sub_queries": list[str],
            "was_expanded": bool,
            "was_hyded": bool,
        }
    """
    result = {
        "primary": query,
        "variants": [],
        "sub_queries": [],
        "was_expanded": False,
        "was_hyded": False,
    }

    # Bước 1: Conversational Expansion (luôn chạy)
    expanded = conversational_expansion(query, chat_history, session)
    if expanded != query:
        result["primary"] = expanded
        result["was_expanded"] = True

    return result
