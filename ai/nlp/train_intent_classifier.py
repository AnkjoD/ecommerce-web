"""

import sys, os
__ai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if __ai_dir not in sys.path:
    sys.path.insert(0, __ai_dir)

train_intent_classifier.py — Train intent classifier cho Homura Shop.

So sánh 3 model trên cùng 1 bộ data, tự động chọn model tốt nhất:
  1. Logistic Regression   — baseline, nhanh nhất, ít tham số
  2. Linear SVM (SVC)      — thường tốt hơn LR trên text embedding, vẫn rất nhanh
  3. LightGBM              — gradient boosting, bắt được non-linear pattern,
                             nhanh hơn XGBoost nhiều lần, thường là sweet spot
                             giữa "nhanh" và "chính xác" cho tabular/embedding data

Lý do KHÔNG dùng neural net (MLP/fine-tune transformer):
  - Bài toán 3 lớp trên embedding 1024 chiều đã rất tốt → không cần
  - Fine-tune transformer tốn GPU, khởi động chậm, deploy phức tạp
  - LightGBM trên embedding tốt thường đạt F1 > 0.93-0.97 với vài nghìn sample

Input : intent_training_data.csv (output của build_intent_dataset.py)
Output: intent_model.joblib (model tốt nhất), intent_model_meta.json (metadata)

Chạy: python train_intent_classifier.py
      python train_intent_classifier.py --data path/to/custom.csv
      python train_intent_classifier.py --no-lgbm   # bỏ LightGBM nếu muốn nhanh hơn
"""
import sys, os, json, time, argparse
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import joblib
import csv
from collections import Counter

from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import LabelEncoder

try:
    import lightgbm as lgb
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    print("[WARN] LightGBM chưa cài — bỏ qua. Chạy: pip install lightgbm")

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def section(title):
    print(f"\n{BOLD}{'═'*60}\n  {title}\n{'═'*60}{RESET}")


# ─── Load data ────────────────────────────────────────────────────────────────
def load_data(csv_path: str) -> tuple[list[str], list[str]]:
    texts, labels = [], []
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            t = row.get('text', '').strip()
            l = row.get('label', '').strip()
            if t and l in ('shopping', 'chitchat', 'offtopic'):
                texts.append(t)
                labels.append(l)
    return texts, labels


# ─── Encode text → embedding ──────────────────────────────────────────────────
def encode_texts(texts: list[str], embedding_engine) -> np.ndarray:
    """
    Encode toàn bộ texts thành ma trận embedding.
    Dùng model.encode() batch thay vì gọi get_embedding() từng câu
    → nhanh hơn nhiều lần (GPU/CPU batching).
    """
    print(f"  Encoding {len(texts)} câu...", end='', flush=True)
    t0 = time.time()

    # Truy cập thẳng SentenceTransformer.encode() để dùng batch_size
    # thay vì gọi get_embedding() loop từng câu (sẽ chậm hơn ~10-20x)
    vectors = embedding_engine.model.encode(
        texts,
        batch_size=64,           # tăng nếu có GPU/RAM nhiều
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,  # L2 normalize → cosine sim = dot product → tốt hơn cho LR/SVM
    )
    elapsed = round(time.time() - t0)
    print(f" xong ({elapsed}s, shape={vectors.shape})")
    return vectors


# ─── Định nghĩa các model cần so sánh ────────────────────────────────────────
def get_candidates(has_lgbm: bool, use_lgbm: bool) -> list[tuple[str, object]]:
    candidates = [
        (
            "Logistic Regression",
            LogisticRegression(
                max_iter=1000,
                C=5.0,              # regularization — thử nghiệm cho thấy C=5 tốt hơn default C=1
                                    # trên embedding đã normalize
                class_weight='balanced',
                solver='lbfgs',
                n_jobs=-1,
            )
        ),
        (
            "Linear SVM",
            # LinearSVC không có predict_proba nên wrap bằng CalibratedClassifierCV
            # để có xác suất cho confidence score lúc predict sau này
            CalibratedClassifierCV(
                LinearSVC(
                    max_iter=2000,
                    C=1.0,
                    class_weight='balanced',
                    dual='auto',
                ),
                cv=3,
                method='isotonic',
            )
        ),
    ]

    if has_lgbm and use_lgbm:
        candidates.append((
            "LightGBM",
            lgb.LGBMClassifier(
                n_estimators=300,
                learning_rate=0.05,
                num_leaves=31,       # default, tốt cho dataset vừa (~vài nghìn sample)
                max_depth=-1,        # không giới hạn depth
                subsample=0.8,
                colsample_bytree=0.8,
                class_weight='balanced',
                n_jobs=-1,
                verbose=-1,          # tắt log spam của lightgbm
            )
        ))

    return candidates


# ─── In confusion matrix dạng text đơn giản ─────────────────────────────────
def print_confusion_matrix(cm: np.ndarray, labels: list[str]):
    col_w = 12
    print(f"\n  {'':15}", end='')
    for l in labels:
        print(f"{('Pred:'+l):<{col_w}}", end='')
    print()
    print("  " + "-" * (15 + col_w * len(labels)))
    for i, true_label in enumerate(labels):
        print(f"  {'True:'+true_label:<15}", end='')
        for j in range(len(labels)):
            val = cm[i][j]
            color = GREEN if i == j else (RED if val > 0 else RESET)
            print(f"{color}{val:<{col_w}}{RESET}", end='')
        print()


# ─── Main ────────────────────────────────────────────────────────────────────
def train(data_path: str, use_lgbm: bool):
    t_total = time.time()

    # ── 1. Load data ──────────────────────────────────────────────────────────
    section("1. Load data")
    texts, labels = load_data(data_path)
    dist = Counter(labels)
    print(f"  Tổng: {len(texts)} câu")
    for lbl, cnt in sorted(dist.items()):
        pct = cnt / len(texts) * 100
        bar = '█' * int(pct / 2)
        print(f"  {lbl:<12} {cnt:>5} ({pct:4.1f}%)  {bar}")

    if len(set(labels)) < 3:
        print(f"{RED}[ERR] Thiếu nhãn! Cần đủ 3 nhãn: shopping/chitchat/offtopic{RESET}")
        sys.exit(1)

    # ── 2. Encode embedding ───────────────────────────────────────────────────
    # section("2. Encode embedding (BAAI/bge-m3)")
    # from embedding_engine import PhoBertEmbeddingEngine
    # from config import settings
    # emb_engine = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
    section("2. Encode embedding (BAAI/bge-m3)")

    # Đảm bảo Python tìm thấy embedding_engine.py và config.py
    # dù script được chạy từ bất kỳ thư mục nào
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    if SCRIPT_DIR not in sys.path:
        sys.path.insert(0, SCRIPT_DIR)

    from embedding_engine import PhoBertEmbeddingEngine
    from config import settings
    emb_engine = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
    X = encode_texts(texts, emb_engine)

    # Label encode: LightGBM cần int, LR/SVM dùng string cũng được nhưng nhất quán thì dùng int
    le = LabelEncoder()
    y = le.fit_transform(labels)   # shopping=2, offtopic=1, chitchat=0 (tuỳ sort alphabet)
    class_names = le.classes_.tolist()
    print(f"  Label encoding: {dict(zip(class_names, le.transform(class_names)))}")

    # Train/test split 80/20, stratified
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # ── 3. Train & đánh giá từng model ───────────────────────────────────────
    section("3. Train & so sánh model")
    candidates = get_candidates(HAS_LGBM, use_lgbm)
    results = []

    for name, model in candidates:
        print(f"\n  [{name}]")

        # Cross-validation trên tập train (5-fold) để ước lượng ổn định hơn
        # (tránh lucky/unlucky split)
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        t0 = time.time()
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv,
                                    scoring='f1_macro', n_jobs=-1)
        cv_time = round(time.time() - t0, 1)

        # Train lại trên toàn bộ train set để đánh giá trên test set
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        test_f1 = f1_score(y_test, y_pred, average='macro')
        cm = confusion_matrix(y_test, y_pred)

        print(f"    CV F1-macro (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}  ({cv_time}s)")
        print(f"    Test F1-macro       : {test_f1:.4f}")
        print(f"\n    Classification Report:")
        report = classification_report(y_test, y_pred, target_names=class_names, digits=3)
        for line in report.split('\n'):
            print(f"      {line}")
        print_confusion_matrix(cm, class_names)

        results.append({
            "name": name,
            "model": model,
            "cv_f1_mean": cv_scores.mean(),
            "cv_f1_std": cv_scores.std(),
            "test_f1": test_f1,
        })

    # ── 4. Chọn model tốt nhất ────────────────────────────────────────────────
    section("4. Kết quả so sánh & chọn model tốt nhất")
    print(f"\n  {'Model':<25} {'CV F1':>10} {'Test F1':>10}")
    print("  " + "-" * 50)
    for r in sorted(results, key=lambda x: x['test_f1'], reverse=True):
        flag = f"{GREEN}← BEST{RESET}" if r == max(results, key=lambda x: x['test_f1']) else ""
        print(f"  {r['name']:<25} {r['cv_f1_mean']:.4f}±{r['cv_f1_std']:.3f}   {r['test_f1']:.4f}   {flag}")

    best = max(results, key=lambda x: x['test_f1'])
    print(f"\n  {BOLD}Winner: {best['name']} (Test F1={best['test_f1']:.4f}){RESET}")

    # Train lại trên TOÀN BỘ data (train+test) với model tốt nhất
    # → model final có nhiều data hơn, tổng quát hơn khi deploy
    print(f"\n  Re-train {best['name']} trên toàn bộ {len(X)} câu...", end='', flush=True)
    best['model'].fit(X, y)
    print(" xong")

    # ── 5. Đo latency predict thực tế ─────────────────────────────────────────
    section("5. Latency predict (không tính encode embedding)")
    sample_vec = X[:1]
    times = []
    for _ in range(1000):
        t0 = time.time()
        best['model'].predict(sample_vec)
        times.append((time.time() - t0) * 1000)
    times.sort()
    print(f"  1000 lần predict, 1 sample:")
    print(f"  P50: {times[500]:.4f}ms")
    print(f"  P95: {times[950]:.4f}ms")
    print(f"  P99: {times[990]:.4f}ms")
    print(f"  {CYAN}(Chi phí thật ở production = encode embedding ~50-150ms + predict trên){RESET}")

    # ── 6. Lưu model ──────────────────────────────────────────────────────────
    section("6. Lưu model")
    dir_out = os.path.dirname(os.path.abspath(data_path))
    model_path = os.path.join(dir_out, "intent_model.joblib")
    meta_path  = os.path.join(dir_out, "intent_model_meta.json")

    joblib.dump({
        "model": best['model'],
        "label_encoder": le,
        "class_names": class_names,
    }, model_path)

    meta = {
        "model_name": best['name'],
        "embedding_model": settings.EMBEDDING_MODEL,
        "classes": class_names,
        "test_f1_macro": round(best['test_f1'], 4),
        "cv_f1_mean": round(best['cv_f1_mean'], 4),
        "cv_f1_std": round(best['cv_f1_std'], 4),
        "train_samples": len(X),
        "label_distribution": {k: int(v) for k, v in Counter(labels).items()},
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "all_models_comparison": [
            {k: v for k, v in r.items() if k != 'model'}
            for r in results
        ],
    }
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    total_min = round((time.time() - t_total) / 60, 1)
    print(f"\n  Model lưu tại : {model_path}")
    print(f"  Metadata      : {meta_path}")
    print(f"  Tổng thời gian: {total_min} phút")
    print(f"\n  Bước tiếp: chạy intent_classifier_ml.py để test predict.\n")

    return model_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="intent_training_data.csv",
                        help="Đường dẫn file CSV training (default: intent_training_data.csv)")
    parser.add_argument("--no-lgbm", action="store_true",
                        help="Bỏ qua LightGBM (train nhanh hơn, chỉ so LR vs SVM)")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"{RED}[ERR] Không tìm thấy {args.data}")
        print(f"      Chạy build_intent_dataset.py trước để tạo file này.{RESET}")
        sys.exit(1)

    train(data_path=args.data, use_lgbm=not args.no_lgbm)
