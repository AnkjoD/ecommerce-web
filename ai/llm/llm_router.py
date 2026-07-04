import json
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from .llm_client import get_router_client

logger = logging.getLogger("homura.llm_router")

@dataclass
class RouterResult:
    intent: str
    query_rewritten: str
    filters: Dict[str, Any] = field(default_factory=lambda: {
        "brand": None,
        "color": None,
        "size": None,
        "max_price": None,
        "sort": None
    })
    requires_auth: bool = False
    confidence: float = 0.0

    def to_filter_dict(self) -> dict:
        return self.filters


ROUTER_PROMPT = """Bạn là bộ lọc câu hỏi cho chatbot bán hàng.
Không biết shop bán gì — chỉ hiểu cấu trúc câu hỏi.
Trả về JSON duy nhất, KHÔNG giải thích, KHÔNG markdown.

Quy tắc query_rewritten:
- CHỈ rewrite nếu: sai chính tả brand/tên sản phẩm
  HOẶC câu dài > 15 từ có thông tin thừa
- Nếu câu đã ổn → giữ nguyên query gốc
- Tối đa 10 từ sau khi rewrite
- KHÔNG thêm thông tin không có trong câu gốc

Quy tắc filters:
- brand    : normalize ("addidas"→"Adidas", "nb"→"New Balance")
- max_price: "dưới 2 triệu"→2000000, "rẻ rẻ"→null (không đoán)
- sort     : "rẻ nhất/budget/sinh viên"→"cheapest"
             "xịn nhất/cao cấp"→"priciest"
- size     : giữ nguyên ("42", "XL", "100ml", "15 inch")
- color    : normalize về tiếng Việt có dấu
             ("den"→"đen", "trang"→"trắng")

Quy tắc confidence:
- > 0.8 : câu rõ ràng
- 0.5-0.8: hiểu được nhưng còn mơ hồ
- < 0.5 : dùng NEED_CLARIFICATION

Ví dụ:
Input: "addidas samba size forti two màu đen còn k"
Output: {"intent":"STOCK_CHECK","query_rewritten":"Adidas Samba size 42 màu đen còn hàng không","filters":{"brand":"Adidas","color":"đen","size":"42","max_price":null,"sort":null},"requires_auth":false,"confidence":0.92}

Input: "ờ thì kiểu mình muốn mua cái gì đó đi chơi cuối tuần bạn bè rủ đi café chụp ảnh"
Output: {"intent":"PRODUCT_SEARCH","query_rewritten":"sản phẩm đi chơi phong cách","filters":{"brand":null,"color":null,"size":null,"max_price":null,"sort":null},"requires_auth":false,"confidence":0.65}

Input: "mua gì đó đẹp đẹp"
Output: {"intent":"NEED_CLARIFICATION","query_rewritten":"sản phẩm không rõ mục đích","filters":{"brand":null,"color":null,"size":null,"max_price":null,"sort":null},"requires_auth":false,"confidence":0.18}

Câu hỏi: "{query}"
Output JSON:
"""

def fallback_route(query: str) -> RouterResult:
    """Fallback rule-based nếu Gemini timeout hoặc lỗi."""
    logger.warning("[Router] Dùng fallback rule-based cho query: %r", query)
    q = query.lower()
    
    if "đơn hàng" in q or "đơn của tôi" in q:
        return RouterResult(intent="ORDER_HISTORY", query_rewritten=query, confidence=1.0)
    
    if "giảm giá" in q or "voucher" in q or "khuyến mãi" in q or "coupon" in q:
        return RouterResult(intent="COUPON_INQUIRY", query_rewritten=query, confidence=1.0)
    
    if any(k in q for k in ["chào", "cảm ơn", "cám ơn", "hello", "hi"]):
        return RouterResult(intent="CHITCHAT", query_rewritten=query, confidence=1.0)
    
    return RouterResult(intent="PRODUCT_SEARCH", query_rewritten=query, confidence=0.5)


def route_query(query: str) -> RouterResult:
    """
    Sử dụng Gemini Flash 2.0 để classify, extract filters và rewrite query.
    Nếu thất bại -> fallback.
    """
    prompt = ROUTER_PROMPT.replace("{query}", query)
    
    try:
        client = get_router_client()
        # Gọi Gemini với temperature=0.0 cho tính deterministic
        # Gọi client.generate trả về string
        response_text = client.generate(prompt=prompt, temperature=0.0, max_tokens=256)
        
        # Parse JSON
        if not response_text:
            raise ValueError("Empty response from LLM")
            
        # Xoá markdown nếu model trả về ```json ... ```
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        response_text = response_text.strip()
        data = json.loads(response_text)
        
        return RouterResult(
            intent=data.get("intent", "PRODUCT_SEARCH"),
            query_rewritten=data.get("query_rewritten", query),
            filters=data.get("filters", {}),
            requires_auth=data.get("requires_auth", False),
            confidence=float(data.get("confidence", 0.0))
        )
        
    except Exception as e:
        logger.error("[Router] Lỗi khi gọi Gemini: %s", str(e))
        return fallback_route(query)
