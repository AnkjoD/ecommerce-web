# Homura Shop - AI Chatbot Sidecar

Đây là hệ thống Chatbot Agentic RAG cho dự án Homura Shop, chạy dưới dạng một service FastAPI riêng biệt (Sidecar).

## Tính năng
- **Intent Routing**: Phân loại ý định của người dùng (mua sắm, kiểm tra đơn hàng, tìm kiếm mã giảm giá, tán gẫu) qua mô hình Scikit-Learn (SGDClassifier).
- **Agentic RAG**: Cung cấp thông tin sản phẩm dựa trên kho dữ liệu (Vector DB Qdrant) và hybrid search (BM25 + Semantic Search).
- **Fast Response**: Trả lời ngay lập tức (<50ms) cho các tra cứu đơn hàng và mã giảm giá bằng Template Format, bỏ qua LLM để tăng tốc độ.
- **Reranker Engine**: Cải thiện độ chính xác tìm kiếm sản phẩm thông qua mô hình Reranker từ HuggingFace (BAAI/bge-reranker-v2-m3).

## Cài đặt & Khởi chạy

### 1. Môi trường Conda
Nên sử dụng Miniconda/Anaconda để thiết lập môi trường:
```bash
conda create -n aiEnv python=3.13
conda activate aiEnv
```

### 2. Cài đặt thư viện
```bash
pip install -r requirements.txt
```

### 3. Cấu hình biến môi trường
AI module đọc cấu hình chung từ file `.env` nằm ở thư mục root (`Web-ban-hang/.env`). 
Đảm bảo đã cấu hình:
- `DATABASE_URL` (cho Postgres)
- `GEMINI_API_KEY` (hoặc OPENAI_API_KEY nếu đổi LLM provider)

### 4. Khởi chạy FastAPI Server
Chạy ở môi trường Development (có hot-reload, chú ý mỗi lần save file sẽ load lại model mất ~60-90s):
```bash
python -m fastapi dev main.py
```

Hoặc Production (không hot-reload):
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Chú ý
- Dữ liệu train mô hình Intent (như `dataset_translate.csv`) khá nặng nên đã được đưa vào `.gitignore`.
- Nếu cập nhật code, NestJS sẽ gọi qua port 8000. Nếu FastAPI restart chưa xong, gọi từ NestJS (chờ quá 120s) có thể gây lỗi `503 Service Unavailable`.
