# Homura Shop — AI Chatbot Sidecar

Service FastAPI độc lập xử lý ngôn ngữ tự nhiên, phân loại ý định và tìm kiếm sản phẩm cho Homura Shop bằng Agentic RAG.

## Tech Stack

| Thành phần       | Công nghệ                                       |
| ---------------- | ----------------------------------------------- |
| Framework        | FastAPI + Uvicorn + Python 3.13                 |
| LLM Router       | Google Gemini 2.0 Flash API                     |
| LLM Generate     | Ollama qwen2.5:7b (local)                       |
| Embedding        | `BAAI/bge-m3` (HuggingFace, local)              |
| Reranker         | `BAAI/bge-reranker-v2-m3` (CrossEncoder, local) |
| Vector Search    | PostgreSQL + pgvector (cosine similarity)       |
| Full-text Search | PostgreSQL FTS (plainto_tsquery)                |
| ORM              | SQLAlchemy → PostgreSQL                         |
| Cache            | Redis                                           |

## Kiến trúc Pipeline

```
User Query (từ NestJS, kèm userId đã verify JWT)
        │
        ▼
┌─────────────────────────────────┐
│  LLM Router — Gemini Flash      │  ~300-500ms
│  - Classify intent (9 loại)     │
│  - Extract filters              │
│    (brand, color, size, price)  │
│  - Rewrite sai chính tả         │
│    (chỉ khi cần)                │
└─────────────────────────────────┘
        │
        ├── ORDER_LOOKUP / ORDER_HISTORY
        │       └── SQL query orders WHERE user_id = :userId
        │           → Template format response (~50ms, không LLM)
        │
        ├── COUPON_INQUIRY
        │       └── SQL query coupons
        │           → Template format response (~50ms, không LLM)
        │
        ├── CHITCHAT
        │       └── Template response tĩnh (~5ms, không LLM)
        │
        ├── OFFTOPIC / NEED_CLARIFICATION
        │       └── Template response tĩnh (~5ms, không LLM)
        │
        └── PRODUCT_SEARCH / STOCK_CHECK / PRICE_CHECK
                │
                ▼
        ┌───────────────────────────┐
        │  Hybrid Search            │  ~200-500ms
        │  vector_search()          │
        │  + fts_search()           │
        │  Filters → SQL WHERE      │
        │  RRF merge                │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │  CrossEncoder Reranker    │  ~100-300ms
        │  BAAI/bge-reranker-v2-m3  │
        └───────────────────────────┘
                │
                ▼
        ┌───────────────────────────┐
        │  LLM Generate             │  ~1-3s
        │  Ollama qwen2.5:7b        │
        │  Tư vấn dựa trên context  │
        └───────────────────────────┘
                │
                ▼
        Response to User
```

## Tại sao tách Router và Generate

Router dùng Gemini Flash vì đây là điểm fail đầu tiên của pipeline — nếu classify sai intent hoặc extract sai brand/size thì toàn bộ retrieval sai theo. Gemini Flash chính xác tiếng Việt tốt hơn, chi phí ~$1/tháng, không đáng lo.

Generate dùng qwen2.5:7b local vì lúc này context sản phẩm đã được retrieval + reranker lọc sạch — LLM chỉ cần đọc và viết câu trả lời tự nhiên, 7b là đủ.

## Intents được hỗ trợ

| Intent             | Ví dụ                        | Xử lý                |
| ------------------ | ---------------------------- | -------------------- |
| PRODUCT_SEARCH     | "tìm giày chạy bộ"           | Hybrid search + LLM  |
| STOCK_CHECK        | "Nike AF1 còn size 42 không" | Hybrid search + LLM  |
| PRICE_CHECK        | "Adidas Samba giá bao nhiêu" | Hybrid search + LLM  |
| ORDER_LOOKUP       | "đơn #1234 giao chưa"        | SQL query + Template |
| ORDER_HISTORY      | "lịch sử mua hàng của mình"  | SQL query + Template |
| COUPON_INQUIRY     | "có mã giảm giá không"       | SQL query + Template |
| CHITCHAT           | "xin chào shop"              | Template tĩnh        |
| OFFTOPIC           | "thời tiết hôm nay"          | Template tĩnh        |
| NEED_CLARIFICATION | "mua gì đó đẹp"              | Hỏi lại user         |

## Cài đặt

### 1. Môi trường

```bash
conda create -n aiEnv python=3.13
conda activate aiEnv
pip install -r requirements.txt
```

### 2. Biến môi trường

File `.env` đặt ở thư mục cha (`Web-ban-hang/.env`):

```env
# Bắt buộc
DATABASE_URL=postgresql+psycopg://postgres:password@127.0.0.1:5432/web-ban-hang
GEMINI_API_KEY=...          # cho LLM Router

# Ollama (generate)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# Tuỳ chọn
REDIS_URL=redis://localhost:6379
WEBHOOK_SECRET=...
RAG_TOP_K=5
AI_CACHE_TTL=600
```

### 3. Khởi chạy Ollama

```bash
ollama pull qwen2.5:7b
ollama serve
```

### 4. Sync sản phẩm vào Vector DB

Chạy lần đầu hoặc khi có sản phẩm mới:

```bash
python sync_products.py
```

### 5. Khởi chạy server

Development:

```bash
python -m fastapi dev main.py
```

Production:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

> Không dùng `--reload` trong production vì mỗi lần reload sẽ load lại model HuggingFace (~60s).

## Bảo mật

`user_id` chỉ được truyền từ NestJS sau khi đã verify JWT — FastAPI không verify JWT trực tiếp. Mọi query liên quan đến đơn hàng đều có `WHERE user_id = :userId`, không thể lấy đơn của người khác.

FastAPI chỉ expose port nội bộ, không ra internet trực tiếp.

## Lưu ý

- Lần chạy đầu tiên FastAPI tự download model HuggingFace (`bge-m3`, `bge-reranker-v2-m3`) — mất 5-10 phút tuỳ tốc độ mạng.
- NestJS Proxy timeout đặt là **120s** để cover thời gian khởi động model lần đầu.
- Cache Redis tự động bỏ qua cho request có `user_id` (tránh cache lệch dữ liệu giữa các user).
