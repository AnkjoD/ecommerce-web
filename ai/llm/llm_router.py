"""
llm_router.py — Bộ định tuyến (Intent Router) dùng LLM cho Homura Shop RAG.

Module này đảm nhiệm:
1. Phân loại ý định của khách hàng (Intent classification).
2. Rút trích bộ lọc (Filter extraction) như brand, color, size, max_price, sort.
3. Viết lại câu hỏi (Query rewriting) để sửa lỗi chính tả và lọc ra ý chính.
"""
import re
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Optional

# Load .env từ thư mục gốc (Web-ban-hang/.env) trước khi os.getenv được gọi
try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    _load_dotenv(_env_path, override=False)
except ImportError:
    pass

logger = logging.getLogger("homura.router")

# ─── Extractor Prompt ─────────────────────────────────────────────────────────
EXTRACTOR_PROMPT_TEMPLATE = """Bạn là trợ lý trích xuất thông tin cho chatbot e-commerce.

Phân tích câu hỏi và trả về JSON ĐÚNG FORMAT sau, KHÔNG giải thích, KHÔNG markdown:

{{
  "query_rewritten": "<câu hỏi đã sửa chính tả, bỏ lan man, giữ trọng tâm, TỐI ĐA 10 TỪ, tiếng Việt>",
  "filters": {{
    "category":     "<tên loại sản phẩm, null nếu không rõ>",
    "brand":        "<tên brand chuẩn hóa, null nếu không>",
    "color":        "<màu sắc chuẩn hóa, null nếu không>",
    "size":         "<size nếu có, null nếu không>",
    "min_price":    <số nguyên VND nếu có giá tối thiểu (vd "từ 500k", "trên 1 triệu"), null nếu không>,
    "max_price":    <số nguyên VND nếu có giá tối đa (vd "dưới 2 triệu"), null nếu không>,
    "rating_filter":<số thực 0–5 nếu khách yêu cầu đánh giá tối thiểu (vd "4 sao trở lên" → 4.0), null nếu không>,
    "sort":         "<price|rating|sold_count|view_count|created_at|null>",
    "order":        "<asc|desc|null — cheapest/rẻ nhất → sort=price,order=asc; đắt nhất/mắc nhất → sort=price,order=desc; bán chạy → sort=sold_count,order=desc; mới nhất → sort=created_at,order=desc; đánh giá cao → sort=rating,order=desc>"
  }}
}}

## Quy tắc filters:
- size      : "size 42", "cỡ L" (chỉ lấy số nếu có thể)
- min_price : "từ 500k" → 500000 | "trên 1 triệu" → 1000000 | null
- max_price : "dưới 2 triệu" → 2000000 | "3tr" → 3000000 | null
- rating_filter: "4 sao trở lên" → 4.0 | "ít nhất 3 sao" → 3.0 | null
- sort+order: "rẻ nhất" → sort=price,order=asc | "đắt nhất/mắc nhất" → sort=price,order=desc
              "bán chạy" → sort=sold_count,order=desc | "mới nhất" → sort=created_at,order=desc
              "đánh giá cao" → sort=rating,order=desc
- category  : loại sản phẩm chính như "áo", "quần", "tất", "cặp", "túi", "giày", "balo".
- brand     : normalize — "addidas"/"adidas" → "Adidas" | "nb"/"new bal" → "New Balance"
              "jo dan"/"jordan" → "Jordan" | "af1"/"air force" → "Nike"
              Nếu không nhận diện được brand → null
- color     : normalize — "den" → "đen" | "trang" → "trắng" | "do" → "đỏ"
- query_rewritten: sửa chính tả + bỏ phần thừa + rút gọn.

## Ví dụ:

Input: "giày ulta bost còn size 42 đen không"
Output: {{"query_rewritten":"Adidas Ultraboost size 42 màu đen","filters":{{"category":"Giày","brand":"Adidas","color":"đen","size":"42","min_price":null,"max_price":null,"rating_filter":null,"sort":null,"order":null}}}}

Input: "tặng bạn gái đôi giày dưới 2 triệu màu trắng"
Output: {{"query_rewritten":"giày tặng bạn gái màu trắng dưới 2 triệu","filters":{{"category":"Giày","brand":null,"color":"trắng","size":null,"min_price":null,"max_price":2000000,"rating_filter":null,"sort":null,"order":null}}}}

Input: "giày bán chạy nhất"
Output: {{"query_rewritten":"giày bán chạy","filters":{{"category":"Giày","brand":null,"color":null,"size":null,"min_price":null,"max_price":null,"rating_filter":null,"sort":"sold_count","order":"desc"}}}}

Input: "tặng bạn gái đôi giày dưới 2 triệu màu trắng đánh giá cao"
Output: {{"query_rewritten":"giày tặng bạn gái màu trắng","filters":{{"category":"Giày","color":"trắng","min_price":null,"max_price":2000000,"rating_filter":4.0,"sort":"rating","order":"desc","brand":null,"size":null}}}}

Câu hỏi của khách: "{query}"
Output JSON:"""


# ─── Data classes ─────────────────────────────────────────────────────────────
@dataclass
class Filters:
    category:      Optional[str]   = None
    brand:         Optional[str]   = None
    color:         Optional[str]   = None
    size:          Optional[str]   = None
    max_price:     Optional[int]   = None
    min_price:     Optional[int]   = None
    sort:          Optional[str]   = None   # "created_at"|"price"|"rating"|"sold_count"|"view_count"
    order:         Optional[str]   = None   # "asc"|"desc"
    rating_filter: Optional[float] = None   # 0–5


@dataclass
class RouterResult:
    query_rewritten:        str
    filters:                Filters = field(default_factory=Filters)
    source:                 str     = "llm"
    intent:                 str     = "PRODUCT_SEARCH"
    requires_auth:          bool    = False
    confidence:             float   = 1.0
    clarification_question: Optional[str] = None

    def to_filter_dict(self) -> dict:
        """Trả về dict để truyền vào hybrid_search(filters=...).
        Guard: max_price/min_price phải > 1000 VND để tránh router parse lỗi → filter ra hết SP.
        """
        return {
            k: v for k, v in {
                "category":     self.filters.category,
                "brand":        self.filters.brand,
                "color":        self.filters.color,
                "size":         self.filters.size,
                "min_price":    self.filters.min_price if (
                    self.filters.min_price and self.filters.min_price > 1000
                ) else None,
                "max_price":    self.filters.max_price if (
                    self.filters.max_price and self.filters.max_price > 1000
                ) else None,
                "rating_filter": self.filters.rating_filter,
                "sort":          self.filters.sort,
                "order":         self.filters.order,
            }.items() if v is not None
        }


# ─── Rule-based fallback ──────────────────────────────────────────────────────
def _fallback_route(query: str) -> RouterResult:
    """Fallback siêu nhanh, không cần gọi LLM (dùng khi lỗi timeout)."""
    q = query.lower().strip()
    filters = Filters()

    # Price extract
    price_match = re.search(r'(\d[\d.,]*)\s*(triệu|tr\b)', q)
    if price_match:
        try:
            filters.max_price = int(float(price_match.group(1).replace(',', '.')) * 1_000_000)
        except ValueError:
            pass

    # Sort hint — DTO format: sort + order
    if any(w in q for w in ["rẻ nhất", "giá thấp", "rẻ rẻ", "budget", "sinh viên", "tiết kiệm"]):
        filters.sort = "price"; filters.order = "asc"
    elif any(w in q for w in ["đắt nhất", "mắc nhất", "cao cấp", "xịn nhất", "premium"]):
        filters.sort = "price"; filters.order = "desc"
    elif any(w in q for w in ["bán chạy", "phổ biến", "hot", "nhiều người mua"]):
        filters.sort = "sold_count"; filters.order = "desc"
    elif any(w in q for w in ["mới nhất", "mới ra", "mới về"]):
        filters.sort = "created_at"; filters.order = "desc"
    elif any(w in q for w in ["đánh giá cao", "review tốt", "nhiều sao"]):
        filters.sort = "rating"; filters.order = "desc"

    # Rating filter
    rating_match = re.search(r'(\d+(?:\.\d+)?)\s*sao', q)
    if rating_match:
        filters.rating_filter = float(rating_match.group(1))

    # Size extract
    size_m = re.search(r'\bsize\s*(\d{2})\b|\b(3[5-9]|4[0-7])\b', q)
    if size_m:
        filters.size = size_m.group(1) or size_m.group(2)

    # Basic brand normalize
    brand_map = {
        "nike": "Nike", "adidas": "Adidas", "addidas": "Adidas",
        "new balance": "New Balance", " nb ": "New Balance",
        "jordan": "Jordan", "jo dan": "Jordan",
        "puma": "Puma", "vans": "Vans", "converse": "Converse",
        "reebok": "Reebok", "asics": "ASICS", "saucony": "Saucony",
        "hoka": "Hoka",
    }
    for pattern, brand in brand_map.items():
        if pattern in f" {q} ":
            filters.brand = brand
            break

    # Color normalize
    color_map = {
        "den": "đen", "trang": "trắng", "do": "đỏ",
        "xanh": "xanh", "vang": "vàng", "hong": "hồng",
    }
    for raw, norm in color_map.items():
        if raw in q:
            filters.color = norm
            break

    return RouterResult(
        query_rewritten=query,
        filters=filters,
        source="fallback"
    )


# ─── LLM Router ───────────────────────────────────────────────────────────────
def route_query(
    query: str,
    prompt_template: str = EXTRACTOR_PROMPT_TEMPLATE,
    # Legacy params — vẫn nhận để backward compat, không dùng nữa
    ollama_base_url: Optional[str] = None,
    model: Optional[str] = None,
    timeout: Optional[int] = None,
) -> RouterResult:
    """
    Gọi LLM để phân loại query và extract filters.
    Tự động dùng provider theo LLM_PROVIDER env var (Ollama/OpenAI/Gemini).

    Returns RouterResult — nếu LLM không available → fallback rule-based.
    """
    prompt = prompt_template.format(query=query)

    try:
        import os
        from llm.llm_client import build_client, GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY

        # Đọc config router — hoàn toàn độc lập với generation
        router_provider = os.getenv("ROUTER_LLM_PROVIDER", "ollama").lower()

        # Mỗi provider có model riêng cho router (thường nhỏ/nhanh hơn generation)
        router_model_map = {
            "ollama":  os.getenv("ROUTER_OLLAMA_MODEL", "qwen2.5:1.5b"),
            "groq":    os.getenv("ROUTER_GROQ_MODEL",   "llama-3.1-8b-instant"),
            "gemini":  os.getenv("ROUTER_GEMINI_MODEL", "gemini-1.5-flash"),
            "openai":  os.getenv("ROUTER_OPENAI_MODEL", "gpt-4o-mini"),
        }
        router_model = router_model_map.get(router_provider, "qwen2.5:1.5b")

        logger.info(f"[Router] Using provider: {router_provider}, model: {router_model}")

        # Ollama có URL riêng cho router
        ollama_url = os.getenv("ROUTER_OLLAMA_URL", "http://localhost:11434") \
                     if router_provider == "ollama" else None

        client = build_client(
            provider=router_provider,
            model=router_model,
            ollama_url=ollama_url,
        )
        raw = client.generate(prompt, temperature=0.0, max_tokens=300)
    except Exception as e:
        logger.warning(f"[Router] LLM call failed ({e}), using fallback")
        return _fallback_route(query)

    if not raw:
        return _fallback_route(query)

    # Parse JSON
    try:
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        json_match = re.search(r'\{.*\}', clean, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON found")
        data = json.loads(json_match.group())
    except Exception as e:
        logger.warning(
            f"[Router] JSON parse failed: {e}\n"
            f"--- RAW OUTPUT START ---\n"
            f"{raw}\n"
            f"--- RAW OUTPUT END ---"
        )
        return _fallback_route(query)

    # Build filters
    f = data.get("filters", {}) or {}
    filters = Filters(
        category      = f.get("category") or None,
        brand         = f.get("brand") or None,
        color         = f.get("color") or None,
        size          = str(f.get("size")) if f.get("size") else None,
        min_price     = int(f.get("min_price")) if f.get("min_price") else None,
        max_price     = int(f.get("max_price")) if f.get("max_price") else None,
        rating_filter = float(f.get("rating_filter")) if f.get("rating_filter") else None,
        sort          = f.get("sort") or None,
        order         = f.get("order") or None,
    )

    return RouterResult(
        query_rewritten = data.get("query_rewritten", query),
        filters         = filters,
        source          = "llm"
    )
