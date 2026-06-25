"""
retrieval.py — Module tìm kiếm cốt lõi cho Homura Shop RAG.

Module này đảm nhiệm:
- Phân loại ý định tìm kiếm cơ bản (classify_query)
- Nhận diện danh mục bằng thuật toán nhúng Vector (CategoryMatcher)
- Tìm kiếm chính xác bằng SQL (factual_search)
- Tìm kiếm kết hợp (Hybrid Semantic Search) dùng Vector + FTS + RRF (hybrid_search)
"""
import os
import re
from typing import Optional
from scipy.spatial.distance import cosine
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

logger = logging.getLogger("homura.retrieval")

VECTOR_WEIGHT = 0.7
KEYWORD_WEIGHT = 0.3
SIMILARITY_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.45"))

# Subquery all_variants dùng chung
_ALL_VARIANTS_SUBQUERY = """
    (
        SELECT json_agg(json_build_object(
            'size', pv2.size,
            'color', pv2.color,
            'price', pv2.price,
            'stock_quantity', pv2.stock_quantity
        ))
        FROM product_variants pv2
        WHERE pv2.product_id = p.id
          AND pv2.is_active = true
    ) AS all_variants
"""


# ─── CategoryMatcher ──────────────────────────────────────────────────────────
class CategoryMatcher:
    """Load categories từ DB lúc startup, embed tên → tìm kiếm bằng cosine similarity."""

    def __init__(self, session: Session, embedding_engine):
        self._engine = embedding_engine
        self._category_vectors: dict[str, list] = {}  # name → vector
        self._load(session)

    def _load(self, session: Session):
        rows = session.execute(
            text("SELECT id, name FROM categories WHERE is_active = true")
        ).mappings().all()
        self._category_vectors = {}
        for row in rows:
            name = row["name"]
            try:
                vec = self._engine.get_embedding(name)
                self._category_vectors[name] = vec
            except Exception:
                pass
        print(f"[CategoryMatcher] Loaded {len(self._category_vectors)} categories.")

    def find_category(self, query: str, threshold: float = 0.5) -> Optional[str]:
        """Trả về tên category khớp nhất nếu score >= threshold, ngược lại None."""
        if not self._category_vectors:
            return None
            
        q_lower = query.lower()
        
        # 1. Exact text match
        words_in_q = q_lower.split()
        for name in self._category_vectors.keys():
            parts = [p.strip() for p in name.lower().replace('-', ' ').replace('/', ' ').split()]
            for p in parts:
                if p and p in words_in_q:
                    return name
                
        # 2. Semantic match trên từng từ hoặc cụm từ
        try:
            query_vec = self._engine.get_embedding(query)
            # Tách riêng các từ để chấm điểm
            words = q_lower.split()
            word_vecs = [self._engine.get_embedding(w) for w in words] if len(words) > 1 else []
        except Exception:
            return None

        best_name, best_score = None, 0.0
        for name, vec in self._category_vectors.items():
            # Thử score của nguyên câu
            score = 1.0 - cosine(query_vec, vec)
            if score > best_score:
                best_score = score
                best_name = name
            
            # Thử score của từng từ để tránh nhiễu do các từ khác ("rẻ nhất", "shop",...)
            for w_vec in word_vecs:
                w_score = 1.0 - cosine(w_vec, vec)
                if w_score > best_score:
                    best_score = w_score
                    best_name = name

        return best_name if best_score >= threshold else None

    def reload(self, session: Session):
        self._load(session)


# ─── Intent Classifier (rule-based fallback) ─────────────────────────────────
_SCOPE_SAMPLES = [
    "tìm giày",
    "mua sản phẩm",
    "giá bao nhiêu",
    "còn hàng không",
    "tư vấn sản phẩm",
]
_scope_vectors: Optional[list] = None
_scope_engine = None


def _get_scope_vectors(embedding_engine):
    """Lazy-init các vector câu mẫu in-scope."""
    global _scope_vectors, _scope_engine
    if _scope_vectors is None or _scope_engine is not embedding_engine:
        _scope_vectors = [embedding_engine.get_embedding(s) for s in _SCOPE_SAMPLES]
        _scope_engine = embedding_engine
    return _scope_vectors


def classify_query(query: str, embedding_engine=None) -> dict:
    """
    Phân loại query thành FACTUAL / OFFTOPIC / SEMANTIC.
    Đây là fallback rule-based — ưu tiên dùng llm_router.route_query() nếu Ollama available.
    """
    q = query.lower()

    if any(w in q for w in ["rẻ nhất", "giá thấp nhất", "rẻ rẻ"]):
        return {"type": "FACTUAL", "sort_type": "cheapest", "value": None}

    if any(w in q for w in ["đắt nhất", "cao cấp nhất"]):
        return {"type": "FACTUAL", "sort_type": "priciest", "value": None}

    if any(w in q for w in ["còn hàng không", "hết hàng chưa"]):
        return {"type": "FACTUAL", "sort_type": "stock_check", "value": None}

    size_match = re.search(r'có size (\d+)', q)
    if size_match:
        return {"type": "FACTUAL", "sort_type": "size_check", "value": size_match.group(1)}

    color_match = re.search(r'có màu ([\w]+)', q)
    if color_match:
        return {"type": "FACTUAL", "sort_type": "color_check", "value": color_match.group(1)}

    if re.search(r'giá.+là bao nhiêu|bao nhiêu tiền', q):
        return {"type": "FACTUAL", "sort_type": "price_check", "value": None}

    # OFFTOPIC check bằng embedding
    if embedding_engine is not None:
        try:
            scope_vecs = _get_scope_vectors(embedding_engine)
            query_vec = embedding_engine.get_embedding(query)
            max_sim = max(1.0 - cosine(query_vec, sv) for sv in scope_vecs)
            if max_sim < 0.25:
                return {"type": "OFFTOPIC"}
        except Exception:
            pass

    return {"type": "SEMANTIC"}


# ─── Factual Search ───────────────────────────────────────────────────────────
def factual_search(
    session: Session,
    intent: dict,
    category_name: Optional[str] = None,
    filters: Optional[dict] = None,
) -> list:
    """Trả về kết quả SQL trực tiếp theo intent đã phân loại."""
    sort_type = intent.get("sort_type")
    value = intent.get("value")
    f = filters or {}

    params: dict = {}
    extra_clauses: list[str] = []
    cat_join = ""

    if category_name:
        cat_join = "LEFT JOIN categories cat ON cat.id = p.category_id"
        extra_clauses.append("LOWER(cat.name) LIKE LOWER(:cat_name)")
        params["cat_name"] = f"%{category_name}%"

    if f.get("brand"):
        extra_clauses.append("p.brand ILIKE :brand")
        params["brand"] = f"%{f['brand']}%"

    if f.get("max_price"):
        extra_clauses.append("p.min_price <= :max_price")
        params["max_price"] = f["max_price"]

    if f.get("min_price"):
        extra_clauses.append("p.max_price >= :min_price")
        params["min_price"] = f["min_price"]

    extra_sql = (" AND " + " AND ".join(extra_clauses)) if extra_clauses else ""

    # Variant subfilter (size/color)
    variant_conditions = ["pv2.product_id = p.id", "pv2.is_active = true", "pv2.stock_quantity > 0"]
    if f.get("size"):
        variant_conditions.append("pv2.size::text = :fsize")
        params["fsize"] = str(f["size"])
    if f.get("color"):
        variant_conditions.append("pv2.color ILIKE :fcolor")
        params["fcolor"] = f"%{f['color']}%"

    variant_exists = (
        "EXISTS (SELECT 1 FROM product_variants pv2 WHERE "
        + " AND ".join(variant_conditions) + ")"
    )

    if sort_type in ("cheapest", "priciest"):
        order = "ASC" if sort_type == "cheapest" else "DESC"
        sql = f"""
            SELECT p.id, p.name, p.brand, p.min_price, p.max_price,
                   p.sold_count, p.tags,
                   pv.sku, pv.price, pv.color, pv.size,
                   pv.stock_quantity, pv.image_url,
                   NULL::text AS embedding_text,
                   {_ALL_VARIANTS_SUBQUERY}
            FROM products p
            {cat_join}
            JOIN LATERAL (
                SELECT sku, price, color, size, stock_quantity, image_url
                FROM product_variants
                WHERE product_id = p.id AND is_active = true AND stock_quantity > 0
                ORDER BY price ASC LIMIT 1
            ) pv ON true
            WHERE p.status = 'active'
              AND {variant_exists}
              {extra_sql}
            ORDER BY p.min_price {order} NULLS LAST
            LIMIT 5
        """
        try:
            session.execute(text("SET LOCAL statement_timeout = '3000'"))
            return [dict(r) for r in session.execute(text(sql), params).mappings().all()]
        except Exception as e:
            session.rollback()
            print(f"[WARN] factual_search error: {e}")
            return []

    if sort_type == "stock_check":
        params["q_name"] = value or ""
        params["q_like"] = f"%{value or ''}%"
        sql = f"""
            SELECT DISTINCT ON (p.id) p.id, p.name, p.brand, p.min_price, p.max_price,
                   p.sold_count, p.tags,
                   pv.sku, pv.price, pv.color, pv.size,
                   pv.stock_quantity, pv.image_url,
                   NULL::text AS embedding_text,
                   {_ALL_VARIANTS_SUBQUERY}
            FROM products p
            {cat_join}
            JOIN product_variants pv ON pv.product_id = p.id
            WHERE p.status = 'active'
              AND pv.is_active = true AND pv.stock_quantity > 0
              AND (p.name % :q_name OR p.name ILIKE :q_like)
              AND {variant_exists}
              {extra_sql}
            ORDER BY p.id, pv.price ASC
            LIMIT 5
        """
        session.execute(text("SET LOCAL statement_timeout = '3000'"))
        return [dict(r) for r in session.execute(text(sql), params).mappings().all()]

    if sort_type == "size_check":
        params["size"] = f"%{value}%"
        sql = f"""
            SELECT DISTINCT ON (p.id) p.id, p.name, p.brand, p.min_price, p.max_price,
                   p.sold_count, p.tags,
                   pv.sku, pv.price, pv.color, pv.size,
                   pv.stock_quantity, pv.image_url,
                   NULL::text AS embedding_text,
                   {_ALL_VARIANTS_SUBQUERY}
            FROM products p
            {cat_join}
            JOIN product_variants pv ON pv.product_id = p.id
            WHERE p.status = 'active'
              AND pv.is_active = true AND pv.stock_quantity > 0
              AND pv.size ILIKE :size
              {extra_sql}
            ORDER BY p.id, pv.price ASC
            LIMIT 10
        """
        session.execute(text("SET LOCAL statement_timeout = '3000'"))
        return [dict(r) for r in session.execute(text(sql), params).mappings().all()]

    if sort_type == "color_check":
        params["color"] = f"%{value}%"
        sql = f"""
            SELECT DISTINCT ON (p.id) p.id, p.name, p.brand, p.min_price, p.max_price,
                   p.sold_count, p.tags,
                   pv.sku, pv.price, pv.color, pv.size,
                   pv.stock_quantity, pv.image_url,
                   NULL::text AS embedding_text,
                   {_ALL_VARIANTS_SUBQUERY}
            FROM products p
            {cat_join}
            JOIN product_variants pv ON pv.product_id = p.id
            WHERE p.status = 'active'
              AND pv.is_active = true AND pv.stock_quantity > 0
              AND pv.color ILIKE :color
              {extra_sql}
            ORDER BY p.id, pv.price ASC
            LIMIT 10
        """
        session.execute(text("SET LOCAL statement_timeout = '3000'"))
        return [dict(r) for r in session.execute(text(sql), params).mappings().all()]

    return []


# ─── Vector Search (với SQL filters) ────────────────────────────────────────
def vector_search(
    session: Session,
    query_vector: list,
    top_k: int = 10,
    category_name: Optional[str] = None,
    filters: Optional[dict] = None,
) -> list:
    """
    Tìm kiếm semantic bằng pgvector.
    filters dict: { brand, color, size, max_price, sort }
    Tất cả filter đi vào SQL WHERE — không lọc trong Python.
    """
    f = filters or {}
    vector_str = "[" + ",".join(map(str, query_vector)) + "]"

    filter_clauses: list[str] = [
        "p.status = 'active'",
    ]
    params: dict = {"vec": vector_str, "top_k": top_k}
    cat_join = ""

    # Category filter
    if category_name:
        cat_join = "LEFT JOIN categories cat ON cat.id = p.category_id"
        filter_clauses.append("LOWER(cat.name) LIKE LOWER(:cat_name)")
        params["cat_name"] = f"%{category_name}%"

    # Brand filter
    if f.get("brand"):
        filter_clauses.append("p.brand ILIKE :brand")
        params["brand"] = f"%{f['brand']}%"

    # Price filter
    if f.get("max_price"):
        filter_clauses.append("p.min_price <= :max_price")
        params["max_price"] = f["max_price"]
        
    if f.get("min_price"):
        filter_clauses.append("p.max_price >= :min_price")
        params["min_price"] = f["min_price"]

    if f.get("rating_filter"):
        filter_clauses.append("p.rating_avg >= :rating_filter")
        params["rating_filter"] = f["rating_filter"]

    # Variant filter: size + color + stock — thẳng vào EXISTS subquery
    variant_conditions = ["pv2.product_id = p.id", "pv2.is_active = true", "pv2.stock_quantity > 0"]
    if f.get("size"):
        variant_conditions.append("pv2.size::text = :fsize")
        params["fsize"] = str(f["size"])
    if f.get("color"):
        variant_conditions.append("pv2.color ILIKE :fcolor")
        params["fcolor"] = f"%{f['color']}%"

    filter_clauses.append(
        "EXISTS (SELECT 1 FROM product_variants pv2 WHERE "
        + " AND ".join(variant_conditions) + ")"
    )

    where_clause = " AND ".join(filter_clauses)

    # Order luôn dựa vào độ tương đồng vector
    order_by = "best.vector_score DESC"

    try:
        session.execute(text("SET LOCAL statement_timeout = '15000'"))
        results = session.execute(text(f"""
            SELECT
                p.id, p.name, p.brand, p.tags, p.sold_count, p.view_count,
                pv.sku, pv.price, pv.color, pv.size,
                pv.stock_quantity, pv.image_url,
                p.min_price, p.max_price,
                best.embedding_text,
                best.best_field,
                best.vector_score,
                {_ALL_VARIANTS_SUBQUERY}
            FROM products p
            {cat_join}
            JOIN LATERAL (
                SELECT sku, price, color, size, stock_quantity, image_url
                FROM product_variants
                WHERE product_id = p.id AND is_active = true
                ORDER BY price ASC LIMIT 1
            ) pv ON true
            JOIN LATERAL (
                SELECT
                    pe.embedding_text,
                    pe.field_name AS best_field,
                    (1 - (pe.embedding <=> :vec ::vector)) AS vector_score
                FROM product_embeddings pe
                WHERE pe.product_id = p.id
                ORDER BY vector_score DESC
                LIMIT 1
            ) best ON true
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT :top_k
        """), params).mappings().all()
        return [dict(r) for r in results]
    except Exception as e:
        session.rollback()
        print(f"[WARN] vector_search error: {e}")
        return []


# ─── Full Text Search (FTS) với SQL filters ─────────────────────────────────
def fts_search(
    session: Session,
    query: str,
    top_k: int = 10,
    category_name: Optional[str] = None,
    filters: Optional[dict] = None,
) -> list:
    """
    Tìm kiếm bằng Full Text Search (BM25 equivalent) trong Postgres.
    """
    f = filters or {}
    params: dict = {"query": query, "top_k": top_k}

    # 'simple' dictionary allows exact match without stemming which is good for VNese
    filter_clauses: list[str] = [
        "p.status = 'active'",
        "(to_tsvector('simple', p.name || ' ' || COALESCE(p.brand, '')) @@ plainto_tsquery('simple', :query))",
    ]
    cat_join = ""

    if category_name:
        cat_join = "LEFT JOIN categories cat ON cat.id = p.category_id"
        filter_clauses.append("LOWER(cat.name) LIKE LOWER(:cat_name)")
        params["cat_name"] = f"%{category_name}%"

    if f.get("brand"):
        filter_clauses.append("p.brand ILIKE :brand")
        params["brand"] = f"%{f['brand']}%"

    if f.get("max_price"):
        filter_clauses.append("p.min_price <= :max_price")
        params["max_price"] = f["max_price"]
        
    if f.get("min_price"):
        filter_clauses.append("p.max_price >= :min_price")
        params["min_price"] = f["min_price"]

    if f.get("rating_filter"):
        filter_clauses.append("p.rating_avg >= :rating_filter")
        params["rating_filter"] = f["rating_filter"]

    variant_conditions = ["pv2.product_id = p.id", "pv2.is_active = true", "pv2.stock_quantity > 0"]
    if f.get("size"):
        variant_conditions.append("pv2.size::text = :fsize")
        params["fsize"] = str(f["size"])
    if f.get("color"):
        variant_conditions.append("pv2.color ILIKE :fcolor")
        params["fcolor"] = f"%{f['color']}%"

    filter_clauses.append(
        "EXISTS (SELECT 1 FROM product_variants pv2 WHERE "
        + " AND ".join(variant_conditions) + ")"
    )

    where_clause = " AND ".join(filter_clauses)

    order_by = "keyword_score DESC"

    try:
        session.execute(text("SET LOCAL statement_timeout = '15000'"))
        results = session.execute(text(f"""
            SELECT p.id, p.name, p.brand, p.tags, p.sold_count, p.view_count,
                   pv.sku, pv.price, pv.color, pv.size,
                   pv.stock_quantity, pv.image_url,
                   p.min_price, p.max_price,
                   NULL::text AS embedding_text,
                   ts_rank(to_tsvector('simple', p.name), plainto_tsquery('simple', :query)) AS keyword_score,
                   {_ALL_VARIANTS_SUBQUERY}
            FROM products p
            {cat_join}
            JOIN LATERAL (
                SELECT sku, price, color, size, stock_quantity, image_url
                FROM product_variants
                WHERE product_id = p.id AND is_active = true
                ORDER BY price ASC LIMIT 1
            ) pv ON true
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT :top_k
        """), params).mappings().all()
        return [dict(r) for r in results]
    except Exception as e:
        session.rollback()
        print(f"[WARN] fts_search error: {e}")
        return []


# ─── Hybrid Search (Intent Router + RRF + SQL filters) ───────────────────────
def hybrid_search(
    session: Session,
    query_vector: list,
    query_text: str,
    embedding_engine,
    reranker_engine,
    category_matcher: CategoryMatcher,
    top_k: int = 5,
    filters: Optional[dict] = None,
) -> tuple[list, str]:
    """
    Entry point chính: phân loại intent → điều phối sang đúng strategy.

    Args:
        filters: dict từ llm_router.RouterResult.filters hoặc tự build.
                 Keys: brand, color, size, max_price, sort
                 Tất cả đi thẳng vào SQL WHERE.

    RRF: score = WEIGHT / (K + rank + 1)
    """
    K = 60
    f = filters or {}

    # Bước 1: classify intent (rule-based — hoặc đã được LLM router xử lý trước)
    intent = classify_query(query_text, embedding_engine)

    # Lấy category — ưu tiên từ LLM filters nhưng PHẢI resolve qua CategoryMatcher
    # vì DB lưu tên tiếng Anh (Men Bags, Women Shoes...) còn LLM trả tiếng Việt (Túi, Giày...)
    llm_category_hint = f.get("category")
    if llm_category_hint:
        # Thử exact match trước (nếu LLM đã trả đúng tên DB)
        resolved = category_matcher.find_category(llm_category_hint, threshold=0.45)
        category_name = resolved  # None nếu không match → không filter category
        if resolved:
            logger.debug(f"[hybrid_search] category '{llm_category_hint}' → '{resolved}'")
        else:
            logger.warning(f"[hybrid_search] category '{llm_category_hint}' không match DB category nào → bỏ filter")
    else:
        category_name = category_matcher.find_category(query_text)

    # DTO format: sort=price + order=asc/desc
    # Internal fallback: classify_query vẫn trả "cheapest"/"priciest"
    sort_field = f.get("sort")
    sort_order = f.get("order", "asc")
    internal_sort = intent.get("sort_type")  # "cheapest" | "priciest" từ classify_query

    is_cheapest = (sort_field == "price" and sort_order == "asc") or internal_sort == "cheapest"
    is_priciest = (sort_field == "price" and sort_order == "desc") or internal_sort == "priciest"
    sort_val = "cheapest" if is_cheapest else ("priciest" if is_priciest else None)

    # Nếu có sort cheapest/priciest, xử lý đặc biệt (chặn FACTUAL nếu không có category/brand)
    if sort_val in ("cheapest", "priciest"):
        if category_name or f.get("brand"):
            intent = {"type": "FACTUAL", "sort_type": sort_val, "value": None}
        else:
            # Không có category/brand rõ ràng → dùng query text để tìm trước
            # rồi rerank để lọc ra những cái thực sự liên quan
            vr = vector_search(session, query_vector, top_k=top_k * 4, category_name=None, filters=f)
            tr = fts_search(session, query_text, top_k=top_k * 4, category_name=None, filters=f)
            
            pool_dict = {str(p["id"]): p for p in vr + tr}
            if not pool_dict:
                # Không tìm ra gì → báo thẳng, không cố lấy linh tinh
                return [], "no_relevant_results"
            
            pool = list(pool_dict.values())
            
            # Bắt buộc phải rerank để lọc sản phẩm không liên quan TRƯỚC khi sort giá
            # Ví dụ: hỏi "cặp rẻ nhất" → khuy bấm 1.800đ phải bị loại dù rẻ nhất
            doc_texts = [
                f"{p.get('name', '')} | Brand: {p.get('brand', '')}" +
                (f" | Tags: {p.get('tags')}" if p.get('tags') else "")
                for p in pool
            ]
            rerank_scores = reranker_engine.rank(query_text, doc_texts)
            for i, p in enumerate(pool):
                p["rerank_score"] = float(rerank_scores[i])
            
            # Chỉ giữ sản phẩm thực sự liên quan (rerank_score > 0)
            relevant_pool = [p for p in pool if p.get("rerank_score", -999) > 0]
            
            if not relevant_pool:
                # Không có sản phẩm nào liên quan → báo thẳng "không tìm thấy"
                # Đây là đúng hơn là trả về sản phẩm lung tung
                return [], "no_relevant_results"
            
            # Trong pool đã lọc, mới sort theo giá
            # Không sort trong memory — query DB lại để lấy đúng giá
            # cao nhất/thấp nhất trong TOÀN BỘ sản phẩm liên quan,
            # không chỉ trong 20 candidates nhỏ
            relevant_ids = [str(p["id"]) for p in relevant_pool]
            order = "ASC" if sort_val == "cheapest" else "DESC"
            sql_price_sort = f"""
                SELECT p.id, p.name, p.brand, p.min_price, p.max_price,
                       p.sold_count, p.tags,
                       pv.sku, pv.price, pv.color, pv.size,
                       pv.stock_quantity, pv.image_url,
                       NULL::text AS embedding_text,
                       {_ALL_VARIANTS_SUBQUERY}
                FROM products p
                JOIN LATERAL (
                    SELECT sku, price, color, size, stock_quantity, image_url
                    FROM product_variants
                    WHERE product_id = p.id
                      AND is_active = true
                      AND stock_quantity > 0
                    ORDER BY price ASC LIMIT 1
                ) pv ON true
                WHERE p.status = 'active'
                  AND p.id = ANY(:relevant_ids)
                  AND EXISTS (
                      SELECT 1 FROM product_variants pv2
                      WHERE pv2.product_id = p.id
                        AND pv2.is_active = true
                        AND pv2.stock_quantity > 0
                  )
                ORDER BY p.min_price {order} NULLS LAST
                LIMIT :top_k
            """
            try:
                session.execute(text("SET LOCAL statement_timeout = '3000'"))
                price_sorted = session.execute(
                    text(sql_price_sort),
                    {"relevant_ids": relevant_ids, "top_k": top_k}
                ).mappings().all()
                return [dict(r) for r in price_sorted], "semantic_sort_price"
            except Exception as e:
                # Fallback nếu DB query fail
                if sort_val == "cheapest":
                    relevant_pool.sort(key=lambda p: float(p.get("min_price") or float('inf')))
                else:
                    relevant_pool.sort(key=lambda p: float(p.get("min_price") or 0), reverse=True)
                return relevant_pool[:top_k], "semantic_sort"

    # Bước 3: xử lý theo loại
    if intent["type"] == "OFFTOPIC":
        return [], "offtopic"

    if intent["type"] == "FACTUAL":
        results = factual_search(session, intent, category_name, filters=f)
        if results:
            return rerank(results, query_text), "factual"
        # fallback xuống SEMANTIC
        intent = {"type": "SEMANTIC"}

    # SEMANTIC: hybrid vector + fts với SQL filters
    vector_results = vector_search(
        session, query_vector, top_k=top_k * 4,
        category_name=category_name, filters=f
    )
    fts_results = fts_search(
        session, query_text, top_k=top_k * 4,
        category_name=category_name, filters=f
    )

    pool_dict = {}
    for p in vector_results + fts_results:
        pool_dict[str(p["id"])] = p

    if not pool_dict:
        return [], "none"

    candidates = list(pool_dict.values())
    
    # Chuẩn bị dữ liệu cho Reranker
    # Reranker BGE-M3 rất giỏi đọc ngữ cảnh, nên ta ghép tên, brand và category lại
    doc_texts = []
    for p in candidates:
        text_rep = f"{p.get('name', '')} | Brand: {p.get('brand', '')}"
        if p.get("tags"):
            text_rep += f" | Tags: {p.get('tags')}"
        doc_texts.append(text_rep)

    # Chạy Reranker
    rerank_scores = reranker_engine.rank(query_text, doc_texts)
    
    for i, p in enumerate(candidates):
        p["rerank_score"] = float(rerank_scores[i])

    # Sắp xếp theo điểm rerank giảm dần
    candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

    # Lọc threshold (tuỳ chọn, với BGE-Reranker điểm > 0 thường là có liên quan)
    final_products = candidates[:top_k]

    # Kiểm tra xem mode là gì
    has_vector = any(str(p["id"]) in [str(v["id"]) for v in vector_results] for p in final_products)
    has_keyword = any(str(p["id"]) in [str(k["id"]) for k in fts_results] for p in final_products)
    
    if has_vector and has_keyword:
        mode = "hybrid_reranked"
    elif has_vector:
        mode = "vector_reranked"
    else:
        mode = "fts_reranked"

    if sort_val == "cheapest":
        final_products.sort(key=lambda p: float(p.get("min_price") or p.get("price") or 999_999_999))
    elif sort_val == "priciest":
        final_products.sort(key=lambda p: float(p.get("min_price") or p.get("price") or 0), reverse=True)
    elif sort_field == "sold_count":
        final_products.sort(key=lambda p: int(p.get("sold_count") or 0), reverse=(sort_order == "desc"))
    elif sort_field == "rating":
        final_products.sort(key=lambda p: float(p.get("rating_avg") or p.get("rating") or 0), reverse=(sort_order == "desc"))
    elif sort_field == "created_at":
        final_products.sort(key=lambda p: str(p.get("created_at") or ""), reverse=(sort_order == "desc"))

    # Fallback: nếu category filter làm kết quả rỗng → thử lại không có category
    if not final_products and category_name:
        import logging as _logging
        _log = _logging.getLogger("homura.retrieval")
        _log.warning(
            f"[hybrid_search] category filter '{category_name}' → 0 results, "
            f"retrying WITHOUT category filter"
        )
        filters_without_category = {k: v for k, v in f.items() if k != "category"}
        vector_results_nc = vector_search(
            session, query_vector, top_k=top_k * 4,
            category_name=None, filters=filters_without_category
        )
        fts_results_nc = fts_search(
            session, query_text, top_k=top_k * 4,
            category_name=None, filters=filters_without_category
        )
        pool_nc = {str(p["id"]): p for p in vector_results_nc + fts_results_nc}
        if pool_nc:
            candidates_nc = list(pool_nc.values())
            doc_texts_nc = [
                f"{p.get('name', '')} | Brand: {p.get('brand', '')}"
                + (f" | Tags: {p.get('tags')}" if p.get("tags") else "")
                for p in candidates_nc
            ]
            rerank_scores_nc = reranker_engine.rank(query_text, doc_texts_nc)
            for i, p in enumerate(candidates_nc):
                p["rerank_score"] = float(rerank_scores_nc[i])
            candidates_nc.sort(key=lambda x: x["rerank_score"], reverse=True)
            final_products = candidates_nc[:top_k]
            mode = mode + "_no_category_fallback"
            _log.info(f"[hybrid_search] Fallback result: {len(final_products)} products (mode={mode})")
        else:
            _log.warning("[hybrid_search] Fallback also returned 0 — DB có thể không có sản phẩm liên quan")

    return final_products, mode


# ─── Re-ranking ──────────────────────────────────────────────────────────────
def rerank(products: list, query: str) -> list:
    """
    Sắp xếp lại theo: vector score, keyword overlap, view_count, stock, price.
    """
    if not products:
        return products

    query_lower = query.lower()
    query_words = set(query_lower.split())
    wants_cheap = any(w in query_lower for w in ["rẻ", "thấp nhất", "rẻ nhất", "ít tiền", "sale", "khuyến mãi", "giảm giá"])

    prices = [float(p.get("price") or p.get("min_price") or 0) for p in products]
    max_price = max(prices) if prices else 1
    min_price = min(prices) if prices else 0
    price_range = max_price - min_price if max_price > min_price else 1

    for p in products:
        vector_score = float(p.get("similarity_score") or p.get("vector_score") or 0)
        product_words = set((p.get("name", "") + " " + p.get("brand", "")).lower().split())
        overlap = len(query_words & product_words) / max(len(query_words), 1)

        views = min(int(p.get("view_count") or 0), 10000)
        popularity = views / 10000

        stock = min(int(p.get("stock_quantity") or 0), 100)
        stock_score = stock / 100

        price = float(p.get("price") or p.get("min_price") or 0)
        price_score = 1.0 - ((price - min_price) / price_range)

        w_vector, w_overlap, w_popularity, w_stock, w_price = 0.60, 0.20, 0.10, 0.05, 0.05
        if wants_cheap:
            w_price, w_vector, w_overlap, w_popularity, w_stock = 0.60, 0.30, 0.05, 0.05, 0.0

        p["rerank_score"] = (
            w_vector * vector_score
            + w_overlap * overlap
            + w_popularity * popularity
            + w_stock * stock_score
            + w_price * price_score
        )

    return sorted(products, key=lambda x: x["rerank_score"], reverse=True)
