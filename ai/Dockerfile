FROM python:3.11-slim

WORKDIR /app

# Cài thư viện hệ thống cần thiết cho torch và psycopg
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Chạy cả FastAPI (port 8000) và Streamlit (port 8501)
EXPOSE 8000 8501

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 & streamlit run streamlit_demo.py --server.port 8501 --server.address 0.0.0.0"]
