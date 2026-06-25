"""
intent_classifier.py — Rule-based Intent Classifier cho Homura Shop Chatbot.

Phân loại câu hỏi người dùng thành 4 intent:
  - order_inquiry   : hỏi về đơn hàng của mình
  - coupon_inquiry  : hỏi về mã giảm giá / voucher
  - general_chat    : chào hỏi, câu hỏi chung về shop
  - product_search  : tìm sản phẩm (mặc định)

Rule-based để nhanh và không tốn LLM call.
"""
import re
from typing import Optional

# ─── Intent keyword maps ────────────────────────────────────────────────────
_ORDER_KEYWORDS = [
    "đơn hàng", "đơn của tôi", "đơn của t", "đơn của mình",
    "tôi đã mua", "t đã mua", "mình đã mua",
    "trạng thái đơn", "đơn ở đâu", "đơn đang đâu",
    "theo dõi đơn", "kiểm tra đơn",
    "tôi mua gì", "t mua gì", "mình mua gì",
    "lịch sử mua", "lịch sử đơn",
    "đơn pending", "đơn chờ", "đơn đang giao",
    "đơn bị huỷ", "đơn hủy", "đơn đã giao",
    "order của tôi", "order của t", "my order",
    "hàng của t", "hàng của tôi", "hàng đến chưa",
    "khi nào giao", "ship chưa", "giao chưa",
]

_COUPON_KEYWORDS = [
    "mã giảm giá", "mã giảm", "mã khuyến mãi",
    "voucher", "coupon", "mã coupon",
    "khuyến mãi", "ưu đãi", "giảm giá",
    "discount", "sale", "mã sale",
    "có mã gì không", "mã nào dùng được",
    "code giảm", "mã code",
]

_GENERAL_KEYWORDS = [
    "xin chào", "chào", "hello", "hi shop", "hey",
    "shop bán gì", "shop có gì", "bán gì vậy",
    "giờ mở cửa", "giờ làm việc", "shop ở đâu",
    "liên hệ", "hotline", "sdt shop", "số điện thoại",
    "chính sách đổi trả", "đổi trả", "bảo hành",
    "chính sách giao hàng", "phí ship", "phí vận chuyển",
    "cảm ơn", "thanks", "thank you",
    "tạm biệt", "bye",
    "bạn là ai", "bạn là gì", "bot gì",
    "ai đang trả lời", "chat bot",
]


def classify_intent(query: str, user_id: Optional[str] = None) -> str:
    """
    Phân loại intent từ câu hỏi.

    Args:
        query   : Câu hỏi gốc của user
        user_id : UUID user (None nếu chưa đăng nhập)

    Returns:
        "order_inquiry" | "coupon_inquiry" | "general_chat" | "product_search"
    """
    q = query.lower().strip()

    # 1. ORDER INQUIRY
    if any(kw in q for kw in _ORDER_KEYWORDS):
        return "order_inquiry"

    # 2. COUPON INQUIRY
    if any(kw in q for kw in _COUPON_KEYWORDS):
        return "coupon_inquiry"

    # 3. GENERAL CHAT
    if any(kw in q for kw in _GENERAL_KEYWORDS):
        return "general_chat"

    # 4. Mặc định: product search
    return "product_search"


# ─── Shop FAQ context (dùng cho general_chat) ───────────────────────────────
SHOP_FAQ = """
Thông tin Homura Shop:
- Chuyên bán: giày dép, túi xách, phụ kiện thời trang
- Giao hàng: toàn quốc, phí ship từ 0–30,000đ tùy khu vực
- Đổi trả: trong 7 ngày kể từ khi nhận hàng, sản phẩm còn nguyên tag
- Thanh toán: COD (tiền mặt), VNPay, MoMo
- Liên hệ: inbox fanpage Homura Shop hoặc chat trực tiếp tại đây
- Giờ hỗ trợ: 8:00 – 22:00 hàng ngày
""".strip()
