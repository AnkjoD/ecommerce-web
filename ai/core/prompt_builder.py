"""
prompt_builder.py — Module xây dựng Prompt cho Homura Shop RAG
"""
import re
from typing import Optional

# ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Bạn là trợ lý tư vấn mua sắm thông minh của **Homura Shop** — cửa hàng e-commerce đa ngành hàng.

## Vai trò của bạn:
- Tư vấn khách hàng chọn sản phẩm phù hợp dựa trên nhu cầu, sở thích và ngân sách.
- Giải đáp thắc mắc về thông tin sản phẩm, chất liệu, tính năng và cách sử dụng.
- Hỗ trợ khách hàng tìm kiếm đúng món đồ họ cần trong kho hàng phong phú của shop.

Nếu câu hỏi không liên quan đến mua sắm tại Homura Shop, từ chối nhẹ nhàng và gợi ý khách hỏi về sản phẩm.

## Quy tắc trả lời:
1. **LUÔN** dựa vào danh sách sản phẩm được cung cấp để tư vấn — đừng bịa ra sản phẩm không có trong kho.
2. **Chỉ đề cập sản phẩm THỰC SỰ LIÊN QUAN** đến câu hỏi của khách. Nếu danh sách có sản phẩm rõ ràng không khớp (ví dụ: khách hỏi "dép" nhưng danh sách có "hộp đựng dép", "vải may", "móc khóa", "tất"...) → **bỏ qua hoàn toàn**, không nhắc đến trong câu trả lời.
3. Nếu khách có nêu ngân sách, hãy đánh dấu rõ sản phẩm nào **trong ngân sách** và sản phẩm nào **vượt ngân sách**.
4. Trả lời **thân thiện**, dùng tiếng Việt tự nhiên như nhân viên bán hàng thực thụ.
5. Luôn hỏi thêm để hiểu rõ hơn nếu câu hỏi chưa rõ ràng (size? màu? mục đích sử dụng?).

## Cấu trúc trả lời PHẢI theo:
- Mở đầu: Tóm tắt ngắn gọn có bao nhiêu sản phẩm tìm được.
- Liệt kê: Nhắc đến TẤT CẢ sản phẩm với tên và giá, sản phẩm phù hợp ngân sách đặt lên đầu.
- Kết: Hỏi khách muốn xem thêm thông tin sản phẩm nào.

## Ngữ điệu:
- Thân thiện, gần gũi như bạn bè — không quá formal.
- Dùng emoji hợp lý (không spam).
- Không dùng từ "Tôi", thay bằng "mình" để gần gũi hơn.
"""


def build_rag_prompt(
    user_message: str,
    products: list,
    chat_history: Optional[list] = None,
    mode: str = "semantic",
) -> str:
    """
    Xây dựng prompt đầy đủ cho LLM theo kỹ thuật RAG.

    Args:
        user_message: Câu hỏi hiện tại của khách hàng.
        products: Danh sách sản phẩm tìm được từ vector search.
        chat_history: Lịch sử hội thoại (tuỳ chọn).
        mode: "semantic" (mặc định) hoặc "factual".
    """
    prompt_parts = [SYSTEM_PROMPT]

    if mode == "factual":
        prompt_parts.append(
            "⚠️ Đây là kết quả TÌM KIẾM CHÍNH XÁC từ database.\n"
            "Trình bày rõ ràng, KHÔNG thêm thông tin ngoài danh sách."
        )

    # Lịch sử hội thoại
    if chat_history:
        prompt_parts.append("\n## Lịch sử cuộc trò chuyện:")
        for msg in chat_history[-4:]:
            role = "Khách hàng" if msg["role"] == "user" else "Homura Shop"
            prompt_parts.append(f"{role}: {msg['content']}")

    # Ngân sách hint
    budget_match = re.search(r'(\d[\d,.]*)\\s*(triệu|tr|nghìn|k|đ)', user_message.lower())
    budget_hint = ""
    if budget_match:
        budget_hint = f"\n⚠️ Khách đề cập ngân sách '{budget_match.group(0)}' — hãy phân loại sản phẩm nào trong/ngoài ngân sách."

    # Context sản phẩm
    if products:
        prompt_parts.append(f"\n## Danh sách {len(products)} sản phẩm tìm được trong kho:{budget_hint}")
        prompt_parts.append(
            f"⚠️ LƯU Ý: Danh sách có {len(products)} sản phẩm — chỉ đề cập "
            f"những sản phẩm THỰC SỰ phù hợp với câu hỏi. "
            f"Bỏ qua sản phẩm rõ ràng không liên quan (hộp đựng, nguyên liệu may, phụ kiện lạc...).\n"
        )
        for i, p in enumerate(products, 1):
            score = p.get("similarity_score", 0)
            min_price = float(p.get("min_price", 0) or p.get("price", 0) or 0)
            max_price = float(p.get("max_price", 0) or min_price)

            if min_price and max_price and min_price != max_price:
                price_display = f"{min_price:,.0f}đ – {max_price:,.0f}đ"
            elif min_price:
                price_display = f"{min_price:,.0f}đ"
            else:
                price_display = "Liên hệ để biết giá"

            product_info = f"""### [{i}/{len(products)}] {p.get('name', 'N/A')}
- Thương hiệu: {p.get('brand', 'N/A')}
- Giá: {price_display}"""

            all_variants: list = p.get("all_variants") or []
            if all_variants:
                rows = []
                for v in all_variants:
                    stock_qty = int(v.get("stock_quantity", 0) or 0)
                    stock_label = f"{stock_qty} đôi" if stock_qty > 0 else "⛔ Hết hàng"
                    vsize = v.get("size", "") or ""
                    vcolor = v.get("color", "") or ""
                    vprice = float(v.get("price", 0) or 0)
                    rows.append(f"| {vsize:<6} | {vcolor:<15} | {vprice:>12,.0f}đ | {stock_label} |")
                variants_table = (
                    "\n- Biến thể (size × màu × giá × kho):\n"
                    "  | Size   | Màu sắc         |          Giá | Tồn kho     |\n"
                    "  |--------|-----------------|-------------|-------------|\n"
                    + "\n".join(f"  {r}" for r in rows)
                )
                product_info += variants_table
            else:
                vcolor = p.get("color", "N/A")
                vsize = p.get("size", "N/A")
                vstock = p.get("stock_quantity", 0)
                product_info += f"\n- Màu: {vcolor} | Size: {vsize} | Kho: {vstock} đôi"

            if p.get("embedding_text"):
                product_info += f"\n- Mô tả: {p.get('embedding_text', '')[:150]}"
            if score and float(score) > 0:
                product_info += f"\n- Độ phù hợp: {float(score):.0%}"

            prompt_parts.append(product_info)
    else:
        prompt_parts.append("\n## Kho hàng:\nKhông tìm thấy sản phẩm nào phù hợp với yêu cầu này.")

    prompt_parts.append(f"\n## Câu hỏi của khách hàng:\n{user_message}")
    prompt_parts.append("\n## Phản hồi của Homura Shop (Hãy tư vấn dựa trên thông tin sản phẩm ở trên):")

    return "\n".join(prompt_parts)


def build_keyword_expansion_prompt(query: str) -> str:
    return f"""Bạn là chuyên gia về giày thể thao. Hãy phân tích câu hỏi sau và trích xuất các từ khóa tìm kiếm liên quan.

Câu hỏi: "{query}"

Hãy trả về danh sách 3-5 từ khóa/cụm từ liên quan, mỗi từ trên một dòng, không giải thích gì thêm. 
Ưu tiên: tên sản phẩm, công nghệ, thương hiệu, mục đích sử dụng."""


def build_fallback_response(query: str) -> str:
    """Trả về câu trả lời mặc định khi không tìm thấy kết quả."""
    return f"""Rất tiếc, mình không tìm thấy sản phẩm nào khớp với yêu cầu "{query}".

Bạn có thể:
- Đổi từ khóa đơn giản hơn
- Thử tìm theo danh mục (Ví dụ: balo, túi chéo)
- Hỏi về sản phẩm đang sale

Hoặc inbox trực tiếp cho page để được hỗ trợ nhé!"""
