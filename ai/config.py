from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Database (cùng Postgres với NestJS)
    DATABASE_URL: str = "postgresql+psycopg://postgres:password@127.0.0.1:5432/web-ban-hang"

    # AI Models
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    # LLM_MODEL: str = "qwen2.5:7b"
    LLM_MODEL: str = "gemma4:12b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # RAG Settings
    TOP_K_CONTEXT: int = 5
    CHAT_HISTORY_LIMIT: int = 10

    class Config:
        # Khi chạy local: đọc từ ../.env (cùng cấp docker-compose.yaml)
        # Khi chạy trong Docker: đọc từ biến môi trường đã inject
        env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"  # Bỏ qua các biến không liên quan (VD: POSTGRES_USER)

settings = Settings()
