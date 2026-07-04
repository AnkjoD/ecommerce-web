"""
agentic_rag.py — Deterministic Layered RAG Engine cho Homura Shop.

Các tầng xử lý (Pipeline layers):
1. Gatekeeper: Phân loại câu hỏi (Xử lý bởi IntentClassifierML)
2. Extractor: Rút trích bộ lọc và viết lại câu hỏi (Xử lý bởi llm_router)
3. Retrieval: Tìm kiếm kết hợp (Vector + Keyword + Lọc SQL + CrossEncoder)
4. Generation: LLM sinh câu trả lời dựa trên ngữ cảnh đã tìm được
"""
import logging
import time
from typing import Optional

from sqlalchemy.orm import Session

from llm.llm_client import get_generate_client, LLMMessage
from llm.llm_router import route_query, RouterResult
from core.retrieval import CategoryMatcher, hybrid_search
from core.prompt_builder import build_rag_prompt
from core.order_service import get_user_orders, get_active_coupons

logger = logging.getLogger("homura.deterministic")



def _detect_multi_sort(query: str) -> bool:
    """
    Phát hiện câu hỏi yêu cầu CẢ rẻ nhất VÀ mắc nhất cùng lúc.
    Ví dụ: "giày rẻ nhất với mắc nhất", "cái nào rẻ nhất cái nào đắt nhất"
    """
    q = query.lower()
    has_cheap = any(w in q for w in [
        "rẻ nhất", "rẻ nhất", "giá thấp nhất", "cheapest", "rẻ rẻ nhất"
    ])
    has_pricey = any(w in q for w in [
        "mắc nhất", "đắt nhất", "giá cao nhất", "priciest", "cao cấp nhất"
    ])
    return has_cheap and has_pricey


def _fallback_no_product(query: str) -> str:
    return (
        "Xin lỗi, mình không tìm thấy sản phẩm nào thực sự phù hợp với yêu cầu của bạn "
        "trong kho hàng hiện tại. Bạn có muốn đổi từ khóa khác hoặc xem qua các sản phẩm "
        "bán chạy nhất của shop không ạ?"
    )


def _template_response(query: str, products: list) -> str:
    """
    Fallback khi LLM generation lỗi — format sản phẩm thành text đơn giản,
    không cần LLM. User vẫn thấy sản phẩm thay vì thấy lỗi.
    """
    if not products:
        return _fallback_no_product(query)

    lines = [f"Mình tìm được **{len(products)} sản phẩm** phù hợp:\n"]
    for i, p in enumerate(products, 1):
        name  = p.get("name", "Sản phẩm")
        price = float(p.get("min_price") or p.get("price") or 0)
        price_str = f"{price:,.0f}đ" if price > 0 else "Liên hệ"
        lines.append(f"{i}. **{name}** — {price_str}")

    lines.append("\n_(Hệ thống đang bận, mình chỉ hiển thị danh sách cơ bản.)_")
    lines.append("Bạn muốn xem thêm thông tin sản phẩm nào ạ? 😊")
    return "\n".join(lines)


def _handle_order_intent(query, session, user_id, chat_history):
    """Xử lý intent đơn hàng — query DB → template format (không LLM, phản hồi nhanh)."""
    if not user_id:
        return {
            "response": "Bạn cần **đăng nhập** để xem đơn hàng nhé! 😊",
            "products": [], "latencies": {}, "router_result": {}, "mode": "order_inquiry",
        }
    q = query.lower()
    status_filter = None
    if any(w in q for w in ["đang giao", "đang ship", "ship chưa", "giao chưa"]):
        status_filter = "shipping"
    elif any(w in q for w in ["chờ xác nhận", "chờ", "pending"]):
        status_filter = "pending"
    elif any(w in q for w in ["đã giao", "giao rồi", "delivered"]):
        status_filter = "delivered"
    elif any(w in q for w in ["huỷ", "hủy", "cancelled"]):
        status_filter = "cancelled"

    orders = get_user_orders(session, user_id, limit=5, status_filter=status_filter)

    if not orders:
        hint = f" với trạng thái '{status_filter}'" if status_filter else ""
        return {
            "response": f"Mình không tìm thấy đơn hàng nào{hint} của bạn. Nếu vừa đặt hàng, hãy chờ vài phút để hệ thống cập nhật nhé! 😊",
            "products": [], "latencies": {}, "router_result": {}, "mode": "order_inquiry",
        }

    # Template format — không LLM, phản hồi ngay lập tức
    lines = [f"🛍️ Bạn có **{len(orders)} đơn hàng** gần đây:\n"]
    for o in orders:
        items_str = ", ".join(f"{it['product_name']} x{it['quantity']}" for it in o["items"])
        lines.append(
            f"**{o['order_code']}** — {o['status_vn']}\n"
            f"💰 {o['total']:,.0f}đ | 💳 {o['payment_method']} | 📅 {o['created_at']}\n"
            f"📦 {items_str or 'Không có thông tin chi tiết'}"
        )
    lines.append("\nBạn muốn hỏi thêm về đơn hàng nào không? 😊")
    response = "\n\n".join(lines)
    return {"response": response, "products": [], "latencies": {}, "router_result": {}, "mode": "order_inquiry"}


def _handle_coupon_intent(query, session, chat_history):
    """Xử lý intent mã giảm giá — query DB → template format (không LLM)."""
    coupons = get_active_coupons(session)
    if not coupons:
        return {
            "response": "Hiện tại shop chưa có mã giảm giá nào đang chạy. Theo dõi fanpage Homura Shop để cập nhật khuyến mãi mới nhé! 🎁",
            "products": [], "latencies": {}, "router_result": {}, "mode": "coupon_inquiry",
        }
    lines = [f"🎁 Shop đang có **{len(coupons)} mã giảm giá**:\n"]
    for c in coupons:
        remaining = f" · Còn {c['remaining']} lượt" if c["remaining"] is not None else ""
        lines.append(
            f"**{c['code']}** — Giảm {c['discount']}\n"
            f"🛒 Đơn tối thiểu: {c['min_order']} | ⏰ HSD: {c['expires_at']}{remaining}"
        )
    lines.append("\nSao chép mã và nhập khi thanh toán nhé! 😊")
    response = "\n\n".join(lines)
    return {"response": response, "products": [], "latencies": {}, "router_result": {}, "mode": "coupon_inquiry"}


def _handle_general_chat(query, chat_history):
    """Xử lý chào hỏi và câu hỏi chung — template format (không LLM)."""
    q = query.lower()

    if any(w in q for w in ["chào", "hello", "hi", "hey", "xin chào"]):
        response = "Xin chào! 👋 Mình là trợ lý Homura Shop. Mình có thể giúp bạn:\n- 🔍 Tìm sản phẩm giày dép, phụ kiện\n- 📦 Xem đơn hàng của bạn\n- 🎁 Xem mã giảm giá\n\nBạn cần mình giúp gì ạ?"
    elif any(w in q for w in ["phí ship", "phí vận chuyển", "ship"]):
        response = "🚚 **Phí vận chuyển** tại Homura Shop:\n- Nội thành: 15,000–20,000đ\n- Ngoại thành: 20,000–30,000đ\n- Miễn ship cho đơn từ 500,000đ 🎉"
    elif any(w in q for w in ["đổi trả", "bảo hành", "hoàn"]):
        response = "🔄 **Chính sách đổi trả**:\n- Đổi trả trong **7 ngày** kể từ khi nhận hàng\n- Sản phẩm còn nguyên tag, chưa qua sử dụng\n- Liên hệ fanpage Homura Shop để được hỗ trợ"
    elif any(w in q for w in ["thanh toán", "vnpay", "momo", "cod", "tiền mặt"]):
        response = "💳 **Phương thức thanh toán**:\n- COD (tiền mặt khi nhận hàng)\n- VNPay\n- MoMo"
    elif any(w in q for w in ["shop bán gì", "bán gì", "có gì", "sản phẩm gì"]):
        response = "🛍️ **Homura Shop** chuyên bán:\n- 👟 Giày dép các loại (thể thao, thời trang, công sở)\n- 👜 Túi xách, balo\n- 🎒 Phụ kiện thời trang\n\nBạn muốn tìm loại nào?"
    elif any(w in q for w in ["cảm ơn", "thanks", "thank"]):
        response = "Không có gì! Mình luôn sẵn sàng giúp bạn 😊 Chúc bạn mua sắm vui vẻ tại Homura Shop! 🛍️"
    elif any(w in q for w in ["tạm biệt", "bye"]):
        response = "Tạm biệt! Hẹn gặp lại bạn tại Homura Shop 👋😊"
    else:
        response = f"Xin chào! 😊 Bạn hỏi về **\"{query}\"** — mình chưa có thông tin cụ thể về vấn đề này.\n\nMình có thể giúp bạn:\n- 🔍 Tìm sản phẩm\n- 📦 Xem đơn hàng\n- 🎁 Xem mã giảm giá\n\nBạn muốn thử hỏi gì không?"

    return {"response": response, "products": [], "latencies": {}, "router_result": {}, "mode": "general_chat"}



def run_deterministic_chat(
    query: str,
    session: Session,
    embedding_engine,
    reranker_engine,
    category_matcher: CategoryMatcher,
    user_id: Optional[str] = None,
    chat_history: Optional[list] = None,
    top_k: int = 5,
) -> dict:
    """
    Luồng Deterministic RAG (Không vòng lặp, chạy thẳng 1 chiều).
    
    Returns:
        {
          "response": str,
          "products": list[dict],
          "latencies": dict,
          "router_result": dict
        }
    """
    latencies = {}

    # ── TẦNG 1: LLM ROUTER (Gemini Flash) ──────────────────────────────────
    t0 = time.time()
    router_result: RouterResult = route_query(query)
    latencies["layer1_router_ms"] = round((time.time() - t0) * 1000)
    
    intent = router_result.intent
    logger.info(f"[E2E-DEBUG] intent: {intent}")

    if intent in ("ORDER_LOOKUP", "ORDER_HISTORY"):
        return _handle_order_intent(query, session, user_id, chat_history)

    if intent == "COUPON_INQUIRY":
        return _handle_coupon_intent(query, session, chat_history)

    if intent == "CHITCHAT":
        return _handle_general_chat(query, chat_history)

    if intent == "OFFTOPIC":
        return {
            "response": "Mình chỉ có thể tư vấn về sản phẩm tại Homura Shop thôi bạn nhé 😊 Bạn muốn tìm sản phẩm gì không?",
            "products": [], "latencies": latencies, 
            "router_result": router_result.__dict__,
            "mode": "offtopic"
        }

    if intent == "NEED_CLARIFICATION":
        return {
            "response": "Bạn đang tìm loại sản phẩm nào ạ? Cho mình biết thêm về mục đích sử dụng hoặc ngân sách để mình tư vấn đúng hơn nhé 😊",
            "products": [], "latencies": latencies,
            "router_result": router_result.__dict__,
            "mode": "need_clarification"
        }

    # PRODUCT_SEARCH / STOCK_CHECK / PRICE_CHECK
    rewritten_query = router_result.query_rewritten or query
    filters_dict = router_result.to_filter_dict()

    logger.info(f"[E2E-DEBUG] query_original  : {query}")
    logger.info(f"[E2E-DEBUG] query_rewritten : {rewritten_query}")
    logger.info(f"[E2E-DEBUG] filters_dict    : {filters_dict}")

    # ── TẦNG 3: RETRIEVAL (Hybrid Search + SQL Filters + Rerank) ───────────
    t1 = time.time()
    query_vector = embedding_engine.get_embedding(rewritten_query)

    # Detect multi-sort: "rẻ nhất với mắc nhất" → chạy 2 lần riêng biệt
    if _detect_multi_sort(query):
        logger.info("[E2E-DEBUG] Multi-sort detected — running 2 searches")

        # Search 1: cheapest (DTO format)
        filters_cheap = {**filters_dict, "sort": "price", "order": "asc"}
        products_cheap, _ = hybrid_search(
            session=session,
            query_vector=query_vector,
            query_text=rewritten_query,
            embedding_engine=embedding_engine,
            reranker_engine=reranker_engine,
            category_matcher=category_matcher,
            top_k=1,  # chỉ cần 1 sản phẩm rẻ nhất
            filters=filters_cheap,
        )

        # Search 2: priciest (DTO format)
        filters_pricey = {**filters_dict, "sort": "price", "order": "desc"}
        products_pricey, _ = hybrid_search(
            session=session,
            query_vector=query_vector,
            query_text=rewritten_query,
            embedding_engine=embedding_engine,
            reranker_engine=reranker_engine,
            category_matcher=category_matcher,
            top_k=1,  # chỉ cần 1 sản phẩm đắt nhất
            filters=filters_pricey,
        )

        # Ghép kết quả: rẻ nhất trước, mắc nhất sau
        # Dùng dict để dedup nếu catalog nhỏ và 2 kết quả trùng nhau
        seen_ids = set()
        products = []
        for p in products_cheap + products_pricey:
            pid = str(p.get("id", ""))
            if pid not in seen_ids:
                seen_ids.add(pid)
                products.append(p)

        mode = "multi_sort"
        logger.info(f"[E2E-DEBUG] Multi-sort result: {len(products_cheap)} cheap + {len(products_pricey)} pricey")
    else:
        products, mode = hybrid_search(
            session=session,
            query_vector=query_vector,
            query_text=rewritten_query,
            embedding_engine=embedding_engine,
            reranker_engine=reranker_engine,
            category_matcher=category_matcher,
            top_k=top_k,
            filters=filters_dict,
        )

    logger.info(f"[E2E-DEBUG] products_count  : {len(products)}")
    logger.info(f"[E2E-DEBUG] mode            : {mode}")
    if not products:
        logger.warning(f"[E2E-DEBUG] EMPTY RESULT — filters_dict={filters_dict}  rewritten={rewritten_query!r}")

    # Reranker được tích hợp sẵn bên trong hybrid_search (trả về top_k tốt nhất)
    latencies["layer3_retrieval_ms"] = round((time.time() - t1) * 1000)

    # ── TẦNG 4: GENERATION (LLM) ───────────────────────────────────────────
    t2 = time.time()
    if not products:
        final_response = _fallback_no_product(query)
        latencies["layer4_generation_ms"] = round((time.time() - t2) * 1000)
    else:
        # build_rag_prompt trả về 1 string duy nhất (system + context + user gộp lại)
        full_prompt = build_rag_prompt(rewritten_query, products, mode=mode)

        messages = [
            LLMMessage(role="system", content=(
                "Bạn là trợ lý bán hàng thân thiện của Homura Shop — shop giày dép và phụ kiện. "
                "Tư vấn ngắn gọn, chính xác, dựa ĐÚNG vào danh sách sản phẩm được cung cấp."
            )),
        ]

        # Thêm chat history nếu có
        if chat_history:
            for msg in chat_history[-6:]:
                if msg.get("role") in ("user", "assistant") and msg.get("content"):
                    messages.append(LLMMessage(role=msg["role"], content=msg["content"]))

        messages.append(LLMMessage(role="user", content=full_prompt))

        llm = get_generate_client()
        try:
            llm_resp = llm.chat(messages=messages, temperature=0.3, max_tokens=1024)
            final_response = llm_resp.content.strip()
        except Exception as e:
            logger.error(f"[Deterministic] LLM Generation failed: {e}")
            # Thay vì báo lỗi, vẫn trả sản phẩm đã tìm được bằng template
            final_response = _template_response(rewritten_query, products)
            
        latencies["layer4_generation_ms"] = round((time.time() - t2) * 1000)

    return {
        "response": final_response,
        "products": products,
        "latencies": latencies,
        "router_result": router_result.__dict__,
        "mode": mode
    }
