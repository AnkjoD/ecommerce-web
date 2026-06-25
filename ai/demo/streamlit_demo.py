"""

Streamlit Demo — Agentic RAG Chatbot v5: LLM Router + Hybrid Search + Agentic Loop.

Cách chạy (trong conda env aiEnv):
  conda activate aiEnv
  cd ai/
  streamlit run streamlit_demo.py
"""
import streamlit as st
import sys
import os
import time
import logging
import requests
import json
from typing import Optional

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.embedding_engine import PhoBertEmbeddingEngine, CrossEncoderReranker
from core.prompt_builder import build_rag_prompt, build_fallback_response, SYSTEM_PROMPT
from core.query_rewriter import rewrite_query
from core.retrieval import CategoryMatcher, hybrid_search
from llm.llm_router import route_query, RouterResult, _fallback_route
from core.agentic_rag import run_deterministic_chat
from intent.intent_classifier_ml import IntentClassifierML
from config import settings

class StreamlitStatusHandler(logging.Handler):
    def __init__(self, status_container):
        super().__init__()
        self.status_container = status_container

    def emit(self, record):
        msg = self.format(record)
        if record.levelno >= logging.ERROR:
            self.status_container.error(msg)
        elif record.levelno >= logging.WARNING:
            self.status_container.warning(msg)
        else:
            self.status_container.info(msg)

# ─── Cấu hình trang ─────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Homura Shop AI Demo",
    page_icon="🤖",
    layout="wide"
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    .main { background-color: #0a0a0f; }
    .product-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid #0f3460;
        border-radius: 12px;
        padding: 14px 16px;
        margin: 6px 0;
        transition: border-color 0.2s;
    }
    .product-card:hover { border-color: #e94560; }
    .product-name { color: #e94560; font-weight: 700; font-size: 15px; margin-bottom: 4px; }
    .product-price { color: #4ade80; font-weight: 600; font-size: 14px; }
    .product-meta { color: #94a3b8; font-size: 12px; margin-top: 4px; }
    .score-bar { color: #f59e0b; font-size: 12px; }
    .status-ok   { color: #4ade80; font-weight: 500; }
    .status-warn { color: #f59e0b; font-weight: 500; }
    .status-err  { color: #e94560; font-weight: 500; }
    .router-badge {
        display: inline-block;
        background: #0f3460;
        color: #60a5fa;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
        margin: 2px 2px;
    }
    .filter-tag {
        display: inline-block;
        background: #1a3a1a;
        color: #4ade80;
        border-radius: 4px;
        padding: 1px 6px;
        font-size: 11px;
        margin: 2px;
    }
    .tool-call {
        background: #1a1a2e;
        border-left: 3px solid #e94560;
        padding: 6px 10px;
        margin: 4px 0;
        border-radius: 4px;
        font-size: 12px;
        color: #94a3b8;
    }
</style>
""", unsafe_allow_html=True)


# ─── Cache Resources ─────────────────────────────────────────────────────────
@st.cache_resource
def load_embedding_engine():
    return PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)

@st.cache_resource
def load_reranker_engine():
    return CrossEncoderReranker(model_name="BAAI/bge-reranker-v2-m3")

@st.cache_resource
def get_db_engine():
    return create_engine(settings.DATABASE_URL)

def get_session():
    engine = get_db_engine()
    Session = sessionmaker(bind=engine)
    return Session()

@st.cache_resource
def load_category_matcher():
    emb_engine = load_embedding_engine()
    session = get_session()
    matcher = CategoryMatcher(session, emb_engine)
    session.close()
    return matcher

@st.cache_resource
def load_intent_classifier():
    emb_engine = load_embedding_engine()
    return IntentClassifierML(embedding_engine=emb_engine, model_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "intent_model.joblib"))


# ─── Data helpers ────────────────────────────────────────────────────────────
def get_all_products(limit: int = 20) -> list:
    session = get_session()
    try:
        results = session.execute(text("""
            SELECT DISTINCT ON (p.id)
                p.id, p.name, p.brand, p.tags, p.sold_count, p.view_count,
                pv.price, pv.sku, pv.color, pv.size, pv.image_url, pv.stock_quantity,
                p.min_price, p.max_price
            FROM products p
            JOIN product_variants pv ON pv.product_id = p.id
            WHERE p.status = 'active' AND pv.is_active = true
            ORDER BY p.id, pv.price ASC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()
        return [dict(r) for r in results]
    except Exception:
        return []
    finally:
        session.close()


# ─── LLM caller ──────────────────────────────────────────────────────────────
def call_ollama(prompt: str, model: str = "qwen2:7b") -> Optional[str]:
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get("response", "")
    except Exception:
        pass
    return None


def generate_mock_response(user_message: str, products: list, rag_mode: str) -> str:
    """Fallback mock response khi Ollama không khả dụng."""
    if not products:
        return build_fallback_response(user_message)

    prices = [float(p.get("price") or p.get("min_price") or 0) for p in products]
    min_p = min(prices) if prices else 0
    max_p = max(prices) if prices else 0

    response = f"Dựa trên yêu cầu **\"{user_message}\"**, mình tìm thấy **{len(products)} sản phẩm** phù hợp! 🎉\n\n"
    response += "**Gợi ý nổi bật:**\n"
    for p in products[:3]:
        price = float(p.get("price") or p.get("min_price") or 0)
        score = p.get("similarity_score")
        score_str = f" _(phù hợp {float(score):.0%})_" if score else ""
        response += f"• **{p['name']}**{score_str} — {price:,.0f}đ\n"

    if len(products) > 3:
        response += f"\n_...và {len(products) - 3} sản phẩm khác bên dưới._\n"
    if min_p > 0 and min_p != max_p:
        response += f"\n💡 Giá từ **{min_p:,.0f}đ** đến **{max_p:,.0f}đ**."
    elif min_p > 0:
        response += f"\n💡 Giá: **{min_p:,.0f}đ**."

    response += "\n\nBạn muốn mình tư vấn thêm về sản phẩm nào không? 😊"
    return response


# ─── Render Product Card ──────────────────────────────────────────────────────
def render_product_card(product: dict):
    price = float(product.get("price") or product.get("min_price") or 0)
    score = product.get("similarity_score")

    name = str(product.get('name', 'N/A')).replace('<', '&lt;').replace('>', '&gt;')
    sku  = str(product.get('sku', 'N/A')).replace('<', '&lt;').replace('>', '&gt;')
    color = str(product.get('color', 'N/A')).replace('<', '&lt;').replace('>', '&gt;')
    size  = str(product.get('size', 'N/A')).replace('<', '&lt;').replace('>', '&gt;')
    brand = str(product.get('brand', '')).replace('<', '&lt;').replace('>', '&gt;')

    score_html = ""
    if score is not None:
        score_val = float(score)
        pct = int(score_val * 100)
        score_html = f'<div class="score-bar">Phù hợp: {pct}%</div>'

    brand_html = f'<div class="product-meta">🏷️ {brand}</div>' if brand and brand != 'None' else ""
    stock = product.get('stock_quantity')
    stock_html = f'<div class="product-meta">Kho: {stock}</div>' if stock else ""

    st.markdown(
f"""<div class="product-card">
<div class="product-name">📦 {name}</div>
<div class="product-price">💰 {price:,.0f}đ</div>
<div class="product-meta">SKU: {sku} &nbsp;|&nbsp; Màu: {color} &nbsp;|&nbsp; Size: {size}</div>
{brand_html}
{stock_html}
{score_html}
</div>""", unsafe_allow_html=True)


def render_router_debug(router: dict):
    """Hiển thị RouterResult debug."""
    intent = router.get("intent", "?")
    confidence = router.get("confidence", 0)
    source = router.get("source", "?")
    filters = router.get("filters", {})
    rewritten = router.get("rewritten", "")

    intent_color = {
        "PRODUCT_SEARCH": "#60a5fa", "STOCK_CHECK": "#4ade80",
        "PRICE_CHECK": "#f59e0b", "SIZE_CHECK": "#a78bfa",
        "ORDER_LOOKUP": "#f87171", "ORDER_HISTORY": "#f87171",
        "OFFTOPIC": "#6b7280", "CHITCHAT": "#94a3b8",
    }.get(intent, "#94a3b8")

    badges = f'<span class="router-badge" style="background:#1a3a2a;color:{intent_color}">{intent}</span>'
    badges += f'<span class="router-badge">conf={confidence:.0%}</span>'
    badges += f'<span class="router-badge">src={source}</span>'

    filter_tags = ""
    filters_dict = filters.__dict__ if hasattr(filters, "__dict__") else (filters or {})
    for k, v in filters_dict.items():
        if v:
            filter_tags += f'<span class="filter-tag">{k}={v}</span>'

    rewrite_line = f'<div style="color:#94a3b8;font-size:11px;margin-top:4px">✏️ Rewrite: <em>{rewritten}</em></div>' if rewritten else ""

    st.markdown(
        f'<div style="margin:4px 0">{badges}{filter_tags}{rewrite_line}</div>',
        unsafe_allow_html=True
    )


# ─── Giao diện chính ──────────────────────────────────────────────────────────
st.title("🤖 Homura Shop — Agentic RAG Demo (v5)")
st.caption("LLM Router + Vietnamese-SBERT + SQL Filters + Agentic Tool Loop")

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("🔧 Trạng thái hệ thống")

    # DB Status
    try:
        session = get_session()
        count = session.execute(text("SELECT COUNT(*) FROM products WHERE status='active'")).scalar()
        vec_count = session.execute(text("SELECT COUNT(*) FROM product_embeddings")).scalar()
        session.close()
        st.markdown(f'<span class="status-ok">✅ Database: {count} sản phẩm, {vec_count} vectors</span>', unsafe_allow_html=True)
    except Exception as e:
        st.markdown(f'<span class="status-err">❌ Database: {str(e)[:60]}</span>', unsafe_allow_html=True)

    # Embedding
    try:
        load_embedding_engine()
        st.markdown(f'<span class="status-ok">✅ Embedding: {settings.EMBEDDING_MODEL}</span>', unsafe_allow_html=True)
    except Exception as e:
        st.markdown(f'<span class="status-err">❌ Embedding: {str(e)[:50]}</span>', unsafe_allow_html=True)

    # Ollama
    ollama_available = False
    ollama_models = []
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=2)
        if r.status_code == 200:
            ollama_models = [m["name"] for m in r.json().get("models", [])]
            ollama_available = bool(ollama_models)
            st.markdown(f'<span class="status-ok">✅ Ollama: {", ".join(ollama_models[:2])}</span>', unsafe_allow_html=True)
        else:
            st.markdown('<span class="status-warn">⚠️ Ollama: Lỗi response</span>', unsafe_allow_html=True)
    except:
        st.markdown('<span class="status-warn">⚠️ Ollama: Chưa chạy (dùng mock)</span>', unsafe_allow_html=True)

    st.divider()
    st.header("⚙️ Cài đặt")
    top_k = st.slider("Top K sản phẩm", 1, 10, 5)
    
    st.info("Chế độ RAG mặc định: **Deterministic Layered** (Nhanh & Chính xác)")
    use_ollama = st.checkbox("Dùng Ollama LLM (fallback mode)", value=ollama_available,
                             disabled=not ollama_available)
    ollama_model = st.selectbox("Model Ollama", ollama_models or ["qwen2:7b"], disabled=not ollama_available)

    st.subheader("Debug")
    show_latencies = st.checkbox("Xem Latency (ms)", value=True)
    show_router = st.checkbox("Xem LLM Router (Intent + Filters)", value=True)
    show_prompt = st.checkbox("Xem Full Prompt", value=False)

    st.divider()
    st.header("📦 Kho hàng")
    if st.button("Xem tất cả sản phẩm"):
        for p in get_all_products(20):
            render_product_card(p)

    st.divider()
    with st.expander("📋 System Prompt hiện tại"):
        st.text(SYSTEM_PROMPT)


# ─── Chat Interface ────────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "👋 Xin chào! Mình là AI tư vấn của **Homura Shop** 🛒\n\n"
                "Mình có thể giúp bạn:\n"
                "- 🔍 Tìm kiếm sản phẩm theo nhu cầu, brand, màu sắc, size\n"
                "- 💰 Kiểm tra giá và so sánh sản phẩm\n"
                "- 📦 Kiểm tra tình trạng tồn kho\n\n"
                "Bạn đang tìm kiếm gì ạ?"
            )
        }
    ]

# Hiển thị lịch sử
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

        # Router debug
        if msg.get("router") and show_router:
            render_router_debug(msg["router"])

        # Tool calls & mode removed from output to keep it clean
        if msg.get("latencies") and show_latencies:
            l = msg["latencies"]
            t1 = l.get("layer1_gatekeeper_ms", 0)
            t2 = l.get("layer2_extractor_ms", 0)
            t3 = l.get("layer3_retrieval_ms", 0)
            t4 = l.get("layer4_generation_ms", 0)
            total = t1 + t2 + t3 + t4
            
            lat_str = (
                f'<div style="font-size:12px; color:#94a3b8; background:#1a1a2e; padding:6px; border-radius:4px; margin-top:8px;">'
                f'⏱️ <b>Latencies (Total {total}ms):</b> '
                f'Gatekeeper: {t1}ms | Extractor: {t2}ms | Retrieval: {t3}ms | Generation: {t4}ms'
                f'</div>'
            )
            st.markdown(lat_str, unsafe_allow_html=True)
            
        if msg.get("mode"):
            mode_map = {
                "deterministic_rag": "⚡ Deterministic RAG",
                "offtopic": "🚫 Offtopic",
                "chitchat": "💬 Chitchat",
            }
            label = mode_map.get(msg["mode"], msg["mode"])
            st.caption(f"Search Mode: {label} · {msg.get('products_count', 0)} sản phẩm")

        # Sản phẩm
        if msg.get("products"):
            prods = msg["products"]
            with st.expander(f"📦 {len(prods)} sản phẩm liên quan", expanded=False):
                cols = st.columns(min(len(prods), 3))
                for i, p in enumerate(prods):
                    with cols[i % 3]:
                        render_product_card(p)


# ─── Input ────────────────────────────────────────────────────────────────────
if query := st.chat_input("VD: adidas rẻ nhất size 42 màu đen, af1 còn không, giày chạy bộ dưới 2tr..."):
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)

    with st.chat_message("assistant"):
        emb_engine = load_embedding_engine()
        reranker_engine = load_reranker_engine()
        category_matcher = load_category_matcher()
        session = get_session()

        _t_start = time.perf_counter()

        # ── TẦNG 1: GATEKEEPER ──────────────────────────────────────────────
        gatekeeper = load_intent_classifier()
        t_gk = time.time()
        gk_result = gatekeeper.classify(query)
        layer1_ms = round((time.time() - t_gk) * 1000)
        
        intent = gk_result["intent"]
        confidence = gk_result["confidence"]
        
        if show_router:
            st.caption(f"🛡️ **Gatekeeper (LightGBM)**: `{intent}` (conf: {confidence:.0%}) - {layer1_ms}ms")
            
        latencies = {"layer1_gatekeeper_ms": layer1_ms}
        products = []
        router_info = {}
        
        if intent == "offtopic" and confidence > 0.90:
            # Chỉ block khi CỰC KỲ chắc chắn là offtopic
            # Ngưỡng 0.90 vì model tốt ở offtopic (5/5 test cases đúng)
            response = (
                "Xin lỗi bạn, mình là trợ lý của Homura Shop nên chỉ "
                "tư vấn được sản phẩm thôi ạ 😊 "
                "Bạn cần tìm giày, túi hay phụ kiện gì không?"
            )
            search_mode = "offtopic"

        else:
            # Tất cả còn lại — kể cả chitchat và offtopic confidence thấp
            # đều vào RAG, vì ranh giới shopping/chitchat tiếng Việt rất mờ
            # RAG tự xử lý và sinh câu trả lời phù hợp hơn hardcode
            # ── DETERMINISTIC RAG ───────────────────────────────────────────────
            with st.status("⚡ Deterministic Layered RAG đang xử lý...", expanded=True) as status:
                st_handler = StreamlitStatusHandler(status)
                st_handler.setFormatter(logging.Formatter('%(message)s'))
                homura_logger = logging.getLogger("homura")
                homura_logger.addHandler(st_handler)
                homura_logger.setLevel(logging.INFO)
                
                try:
                    rag_result = run_deterministic_chat(
                        query=query,
                        session=session,
                        embedding_engine=emb_engine,
                        reranker_engine=reranker_engine,
                        category_matcher=category_matcher,
                        user_id=None,
                        chat_history=st.session_state.messages[-8:],
                        top_k=top_k,
                    )
                    status.update(label="Hoàn tất!", state="complete", expanded=False)
                except Exception as e:
                    homura_logger.error(f"[Demo] Error: {e}")
                    status.error(f"Lỗi: {e}")
                    rag_result = {
                        "response": "Hệ thống đang gặp sự cố, bạn quay lại sau nhé! 😢",
                        "products": [],
                        "latencies": {},
                        "router_result": {},
                        "mode": "error"
                    }
                finally:
                    homura_logger.removeHandler(st_handler)

            response = rag_result.get("response", "")
            search_mode = rag_result.get("mode", "deterministic_rag")
            products = rag_result.get("products", [])
            router_info = rag_result.get("router_result", {})
            latencies.update(rag_result.get("latencies", {}))

        # deterministic flow không dùng tools/turns
        tools_called = []
        turns = 1

        session.close()
        _elapsed = time.perf_counter() - _t_start  # ⏱️ Kết thúc đo

        # ── Hiển thị kết quả ─────────────────────────────────────────────────
        if router_info and show_router:
            render_router_debug(router_info)


        st.markdown(response)
        
        with st.expander("📝 Copy kết quả (Markdown)"):
            st.code(response, language="markdown")

        # Mode + thời gian phản hồi
        mode_label_map = {
            "agentic": "🤖 Agentic", "offtopic": "🚫 Offtopic",
            "chitchat": "💬 Chitchat", "hybrid": "🔍 Hybrid",
            "vector": "🔍 Vector", "keyword": "🔤 Keyword",
            "factual": "🎯 Factual", "none": "❌ Không tìm thấy",
            "fallback_hybrid": "🔍 Fallback Hybrid",
            "no_relevant_results": "⚠️ Không có sản phẩm liên quan",
            "semantic_sort": "📊 Semantic Sort",
            "multi_sort": "🔀 Multi-Sort (rẻ nhất + mắc nhất)",
            "semantic_sort_price": "💰 Price Sort",
        }
        mode_label = mode_label_map.get(search_mode, search_mode)
        st.caption(f"{mode_label} · {len(products)} sản phẩm · ⏱ {_elapsed:.2f}s")

        # Sản phẩm
        if products:
            with st.expander(f"📦 {len(products)} sản phẩm liên quan", expanded=True):
                cols = st.columns(min(len(products), 3))
                for i, p in enumerate(products):
                    with cols[i % 3]:
                        render_product_card(p)
        elif search_mode == "none":
            st.info("💡 Không tìm thấy sản phẩm phù hợp. Thử từ khóa khác nhé!")

    # Lưu vào session
    st.session_state.messages.append({
        "role": "assistant",
        "content": response,
        "products": products,
        "products_count": len(products),
        "mode": search_mode,
        "router": router_info,
        "tools_called": tools_called,
        "turns": turns,
    })


# ─── Footer actions ───────────────────────────────────────────────────────────
col1, col2, col3 = st.columns([5, 1, 1])
with col2:
    if st.button("🗑️ Xóa chat"):
        st.session_state.messages = [{
            "role": "assistant",
            "content": "👋 Xin chào! Mình là AI tư vấn của **Homura Shop** 🛒 Bạn cần tìm gì ạ?"
        }]
        st.rerun()
with col3:
    if st.button("🔄 Reload"):
        st.cache_resource.clear()
        st.rerun()
