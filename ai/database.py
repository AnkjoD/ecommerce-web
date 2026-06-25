from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings


# Shared Database URL (pointing to the same Postgres as NestJS)
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# SQLAlchemy uses psycopg3 or psycopg2 binary
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
