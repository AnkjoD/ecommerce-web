"""
intent_classifier_ml.py — Predict intent câu hỏi dùng ML model đã train.

Thay thế cách dùng Ollama LLM (2.5-3.2s/lần) bằng:
  encode embedding (~50-150ms, vốn đã phải làm cho retrieval) +
  ML predict (~0.01ms) → tổng overhead gần như bằng 0 so với pipeline hiện tại.

Load 1 lần lúc khởi động FastAPI, dùng mãi không cần reload.
"""
import os, time, json
import joblib
import numpy as np


class IntentClassifierML:
    """
    Wrapper đơn giản: nhận embedding_engine từ bên ngoài (đã load sẵn ở main.py),
    load sklearn model từ file joblib, predict intent cho từng câu hỏi.
    """

    def __init__(self, embedding_engine, model_path: str = "intent_model.joblib"):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Không tìm thấy file model: {model_path}\n"
                f"Chạy train_intent_classifier.py trước để tạo file này."
            )

        self.embedding_engine = embedding_engine

        payload = joblib.load(model_path)
        self.model         = payload["model"]
        self.label_encoder = payload["label_encoder"]
        self.class_names   = payload["class_names"]

        # Thử load metadata để log thông tin model lúc khởi động
        meta_path = model_path.replace(".joblib", "_meta.json")
        if os.path.exists(meta_path):
            with open(meta_path, encoding='utf-8') as f:
                meta = json.load(f)
            print(f"--- [OK] Intent Classifier loaded ---")
            print(f"         Model   : {meta.get('model_name', 'unknown')}")
            print(f"         F1-macro: {meta.get('test_f1_macro', '?')}")
            print(f"         Classes : {self.class_names}")
        else:
            print(f"--- [OK] Intent Classifier loaded (no metadata found) ---")

    def classify(self, query: str) -> dict:
        """
        Phân loại intent của 1 câu hỏi.

        Returns:
            {
                "intent": "shopping" | "chitchat" | "offtopic",
                "confidence": float (0-1),
                "method": "ml" | "ml_low_confidence",
                "latency_ms": int
            }
        """
        t0 = time.time()

        # Encode: dùng thẳng model.encode() của SentenceTransformer
        # với normalize=True để nhất quán với lúc train
        vec = self.embedding_engine.model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        # Predict label + probability
        # Dùng pandas DataFrame để tránh warning "X does not have valid feature names"
        # khi model là LightGBM (được train với feature names)
        try:
            import pandas as pd
            vec_2d = pd.DataFrame(vec.reshape(1, -1))
        except ImportError:
            vec_2d = vec.reshape(1, -1)
        label_idx  = self.model.predict(vec_2d)[0]
        proba      = self.model.predict_proba(vec_2d)[0]
        confidence = float(np.max(proba))
        intent     = self.label_encoder.inverse_transform([label_idx])[0]

        latency_ms = round((time.time() - t0) * 1000)
        method = "ml" if confidence >= 0.5 else "ml_low_confidence"

        return {
            "intent":     intent,
            "confidence": round(confidence, 3),
            "method":     method,
            "latency_ms": latency_ms,
        }

    def classify_batch(self, queries: list[str]) -> list[dict]:
        """
        Phân loại nhiều câu cùng lúc — dùng khi cần xử lý batch offline
        (ví dụ phân tích log chat cũ), không phải dùng real-time.
        Nhanh hơn gọi classify() nhiều lần vì encode dùng batch.
        """
        t0 = time.time()
        vecs = self.embedding_engine.model.encode(
            queries,
            batch_size=64,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=len(queries) > 100,
        )
        label_idxs  = self.model.predict(vecs)
        probas      = self.model.predict_proba(vecs)
        total_ms    = round((time.time() - t0) * 1000)

        results = []
        for i, (idx, proba) in enumerate(zip(label_idxs, probas)):
            confidence = float(np.max(proba))
            intent     = self.label_encoder.inverse_transform([idx])[0]
            results.append({
                "intent":     intent,
                "confidence": round(confidence, 3),
                "method":     "ml" if confidence >= 0.5 else "ml_low_confidence",
                "latency_ms": round(total_ms / len(queries)),  # avg per item
            })
        return results


# ─── Test nhanh khi chạy trực tiếp ──────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from embedding_engine import PhoBertEmbeddingEngine
    from config import settings

    print("Đang load embedding engine...")
    emb = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
    clf = IntentClassifierML(embedding_engine=emb)

    test_cases = [
        # Shopping — cả formal lẫn văn nói
        ("có dép tổ ong không shop",             "shopping"),
        ("balo này còn màu đen không",            "shopping"),
        ("mua túi tặng bạn gái được không",       "shopping"),
        ("dep re k shop oi",                      "shopping"),   # không dấu, viết tắt
        ("giá bao nhiêu vậy",                     "shopping"),
        # Chitchat
        ("chào shop",                             "chitchat"),
        ("cảm ơn bạn nhé",                        "chitchat"),
        ("shop ở đâu vậy",                        "chitchat"),
        ("có freeship không",                     "chitchat"),
        ("bạn là AI hay người thật vậy",          "chitchat"),
        # Offtopic
        ("thời tiết hà nội hôm nay thế nào",      "offtopic"),
        ("viết hàm python tính số nguyên tố",     "offtopic"),
        ("kể chuyện cười đi",                     "offtopic"),
        ("1 cộng 1 bằng mấy",                     "offtopic"),
        ("dịch 'i love you' sang tiếng hàn",      "offtopic"),
    ]

    print(f"\n{'─'*75}")
    print(f"  {'Câu hỏi':<42} {'Expect':<10} {'Predict':<10} {'Conf':>6}  {'ms':>5}  OK?")
    print(f"{'─'*75}")

    correct = 0
    for query, expected in test_cases:
        result = clf.classify(query)
        ok = "✓" if result["intent"] == expected else "✗"
        if result["intent"] == expected:
            correct += 1
        color = "\033[92m" if ok == "✓" else "\033[91m"
        print(f"  {query[:40]:<42} {expected:<10} {result['intent']:<10} "
              f"{result['confidence']:>5.1%}  {result['latency_ms']:>4}ms  {color}{ok}\033[0m")

    print(f"{'─'*75}")
    print(f"  Accuracy: {correct}/{len(test_cases)} ({correct/len(test_cases):.0%})\n")