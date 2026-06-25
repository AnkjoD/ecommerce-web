import re
from sentence_transformers import SentenceTransformer, CrossEncoder


class PhoBertEmbeddingEngine:
    def __init__(self, model_name: str = "BAAI/bge-m3"):
        print(f"--- [START] Initializing Embedding Engine ({model_name})... ---")
        self.model = SentenceTransformer(model_name)
        print(f"--- [OK] Model loaded on device: {self.model.device} ---")

    def clean_text(self, text: str) -> str:
        """
        Tiền xử lý văn bản tối giản — để không can thiệp vào tokenizer của model:
        1. Xóa HTML tags
        2. Normalize whitespace
        3. Lowercase
        """
        if not text:
            return ""
        # 1. Loại bỏ HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # 2. Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        # 3. Lowercase
        text = text.lower()
        return text

    def get_embedding(self, text: str) -> list:
        cleaned = self.clean_text(text)
        embedding = self.model.encode(cleaned)
        return embedding.tolist()


class CrossEncoderReranker:
    def __init__(self, model_name: str = "BAAI/bge-reranker-v2-m3"):
        print(f"--- [START] Initializing Cross-Encoder Reranker ({model_name})... ---")
        self.model = CrossEncoder(model_name)
        print(f"--- [OK] Reranker loaded on device: {self.model.model.device} ---")

    def rank(self, query: str, documents: list[str]) -> list[float]:
        """
        Trả về danh sách điểm số (float) cho mỗi document so với query.
        """
        if not documents:
            return []
        pairs = [[query, doc] for doc in documents]
        scores = self.model.predict(pairs)
        return scores.tolist()
