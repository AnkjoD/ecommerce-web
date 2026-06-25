"""
order_service.py — Query đơn hàng của user trực tiếp từ PostgreSQL.

Dùng cho chatbot khi intent = "order_inquiry".
AI layer query thẳng DB (không qua NestJS API) để giảm độ trễ.
"""
import logging
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("homura.order_service")

# Map status code → tiếng Việt
_STATUS_MAP = {
    "pending":        "⏳ Chờ xác nhận",
    "confirmed":      "✅ Đã xác nhận",
    "processing":     "📦 Đang đóng gói",
    "shipping":       "🚚 Đang giao hàng",
    "delivered":      "🎉 Đã giao thành công",
    "cancelled":      "❌ Đã huỷ",
    "payment_failed": "💳 Thanh toán thất bại",
}

_PAYMENT_STATUS_MAP = {
    "unpaid":   "Chưa thanh toán",
    "paid":     "Đã thanh toán",
    "failed":   "Thanh toán lỗi",
    "refunded": "Đã hoàn tiền",
}

_PAYMENT_METHOD_MAP = {
    "cod":   "COD (tiền mặt)",
    "vnpay": "VNPay",
    "momo":  "MoMo",
}


def get_user_orders(
    session: Session,
    user_id: str,
    limit: int = 5,
    status_filter: Optional[str] = None,
) -> list[dict]:
    """
    Lấy N đơn hàng gần nhất của user (kèm chi tiết sản phẩm).

    Args:
        session      : SQLAlchemy session
        user_id      : UUID của user (từ JWT)
        limit        : Số đơn tối đa (default 5)
        status_filter: Lọc theo trạng thái nếu có (vd "shipping")

    Returns:
        list of order dicts với keys:
        order_code, status, status_vn, total, created_at,
        payment_method, payment_status, items[]
    """
    try:
        # Lấy danh sách đơn hàng
        status_clause = ""
        params: dict = {"user_id": user_id, "limit": limit}
        if status_filter:
            status_clause = "AND o.status = :status_filter"
            params["status_filter"] = status_filter

        order_sql = text(f"""
            SELECT
                o.id,
                o.order_code,
                o.status,
                o.total,
                o.payment_method,
                o.payment_status,
                o.created_at
            FROM orders o
            WHERE o.user_id = :user_id
            {status_clause}
            ORDER BY o.created_at DESC
            LIMIT :limit
        """)

        order_rows = session.execute(order_sql, params).fetchall()

        if not order_rows:
            return []

        # Lấy order items — dùng IN clause (ANY không work với text() + psycopg2)
        order_ids = [str(row.id) for row in order_rows]
        if order_ids:
            placeholders = ", ".join(f":oid_{i}" for i in range(len(order_ids)))
            item_params = {f"oid_{i}": oid for i, oid in enumerate(order_ids)}
            item_sql = text(f"""
                SELECT
                    oi.order_id,
                    oi.product_name,
                    oi.variant_info,
                    oi.quantity,
                    oi.unit_price,
                    oi.subtotal
                FROM order_items oi
                WHERE oi.order_id IN ({placeholders})
                ORDER BY oi.order_id
            """)
            item_rows = session.execute(item_sql, item_params).fetchall()
        else:
            item_rows = []


        # Group items theo order_id
        items_map: dict[str, list] = {}
        for item in item_rows:
            oid = str(item.order_id)
            if oid not in items_map:
                items_map[oid] = []
            items_map[oid].append({
                "product_name": item.product_name,
                "variant_info": item.variant_info or "",
                "quantity":     item.quantity,
                "unit_price":   float(item.unit_price),
                "subtotal":     float(item.subtotal),
            })

        # Assemble kết quả
        orders = []
        for row in order_rows:
            oid = str(row.id)
            orders.append({
                "order_code":     row.order_code,
                "status":         row.status,
                "status_vn":      _STATUS_MAP.get(row.status, row.status),
                "total":          float(row.total),
                "payment_method": _PAYMENT_METHOD_MAP.get(row.payment_method, row.payment_method),
                "payment_status": _PAYMENT_STATUS_MAP.get(row.payment_status, row.payment_status),
                "created_at":     row.created_at.strftime("%d/%m/%Y %H:%M") if row.created_at else "",
                "items":          items_map.get(oid, []),
            })

        logger.info(f"[OrderService] user_id={user_id} → {len(orders)} orders found")
        return orders

    except Exception as e:
        logger.error(f"[OrderService] Query failed for user_id={user_id}: {e}")
        return []


def get_active_coupons(session: Session) -> list[dict]:
    """
    Lấy danh sách mã giảm giá đang active.

    Returns:
        list of coupon dicts với: code, discount_type, discount_value,
        min_order_value, expires_at, usage_limit, used_count
    """
    try:
        sql = text("""
            SELECT
                code,
                discount_type,
                discount_value,
                min_order_value,
                expires_at,
                usage_limit,
                used_count,
                is_active
            FROM coupons
            WHERE is_active = true
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (usage_limit IS NULL OR used_count < usage_limit)
            ORDER BY discount_value DESC
            LIMIT 10
        """)
        rows = session.execute(sql).fetchall()

        coupons = []
        for row in rows:
            discount_str = (
                f"{int(row.discount_value)}%"
                if row.discount_type == "percent"
                else f"{int(row.discount_value):,}đ"
            )
            min_order_str = (
                f"{int(row.min_order_value):,}đ"
                if row.min_order_value and row.min_order_value > 0
                else "Không giới hạn"
            )
            expires_str = (
                row.expires_at.strftime("%d/%m/%Y")
                if row.expires_at else "Không giới hạn"
            )
            coupons.append({
                "code":          row.code,
                "discount":      discount_str,
                "min_order":     min_order_str,
                "expires_at":    expires_str,
                "remaining":     (row.usage_limit - row.used_count) if row.usage_limit else None,
            })

        logger.info(f"[OrderService] {len(coupons)} active coupons found")
        return coupons

    except Exception as e:
        logger.error(f"[OrderService] get_active_coupons failed: {e}")
        return []
