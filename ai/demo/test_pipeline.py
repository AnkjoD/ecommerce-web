"""
test_pipeline.py — Automated pipeline testing cho Homura Shop RAG.

Chạy:
    cd ai/
    python test_pipeline.py

Không cần server FastAPI đang chạy.
"""
import os
import sys
import time
import json
from datetime import datetime

# Thêm thư mục 'ai' (thư mục cha của demo) vào sys.path để import được các module ở root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── ANSI Colors ──────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):    print(f"  {GREEN}✔{RESET} {msg}")
def fail(msg):  print(f"  {RED}✘{RESET} {msg}")
def warn(msg):  print(f"  {YELLOW}⚠{RESET} {msg}")
def info(msg):  print(f"  {CYAN}→{RESET} {msg}")

def section(title):
    print(f"\n{BOLD}{CYAN}{title}{RESET}")
    print("─" * 60)

# ─── Test 1: Intent Classifier ───────────────────────────────────────────────
def test_intent_classifier():
    section("[TEST 1] Intent Classifier")

    test_cases = [
        # Shopping
        ("có dép tổ ong không shop",            "shopping"),
        ("giá bao nhiêu vậy",                   "shopping"),
        ("còn size 42 không",                   "shopping"),
        ("mình muốn mua túi đeo chéo",          "shopping"),
        ("ship cod không bạn",                  "shopping"),
        ("đổi size được không shop",            "shopping"),
        ("co dep to ong khong shop",            "shopping"),  # typo / không dấu
        ("bn vay shop oi",                      "shopping"),  # viết tắt
        # Chitchat
        ("chào shop",                           "chitchat"),
        ("cảm ơn shop nha",                     "chitchat"),
        ("shop rep nhanh quá",                  "chitchat"),
        ("cho gặp nhân viên thật đi",           "chitchat"),
        ("tắt bot đi cho tôi nói chuyện",       "chitchat"),
        ("shop dễ thương ghê",                  "chitchat"),
        # Offtopic
        ("hôm nay trời có mưa không",           "offtopic"),
        ("2 cộng 2 bằng mấy",                   "offtopic"),
        ("viết cho tôi bài thơ tình yêu",       "offtopic"),
        ("cách nấu phở bò ngon",                "offtopic"),
        ("kể chuyện cười đi",                   "offtopic"),
        ("python là ngôn ngữ gì",               "offtopic"),
    ]

    from core.embedding_engine import PhoBertEmbeddingEngine
    from intent.intent_classifier_ml import IntentClassifierML
    from config import settings

    emb_engine = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "intent_model.joblib")
    if not os.path.exists(model_path):
        warn(f"Không tìm thấy model: {model_path}")
        return {"status": "FAIL", "accuracy": 0, "cases": []}, 0

    gk = IntentClassifierML(embedding_engine=emb_engine, model_path=model_path)

    OFFTOPIC_THRESHOLD = 0.90
    results = []
    passed = 0

    for query, expected in test_cases:
        t0 = time.time()
        r = gk.classify(query)
        latency_ms = round((time.time() - t0) * 1000)
        predicted = r["intent"]
        confidence = r["confidence"]

        # Theo ngưỡng mới: chỉ block offtopic khi conf > 0.90
        # chitchat và offtopic conf thấp → vào RAG → coi như pass nếu ko phải "block sai"
        if expected == "offtopic":
            # Test offtopic: pass khi model predict offtopic VÀ conf > threshold
            passed_case = (predicted == "offtopic" and confidence > OFFTOPIC_THRESHOLD)
        elif expected == "chitchat":
            # Chitchat không block nữa → coi là pass nếu không bị offtopic-block
            passed_case = not (predicted == "offtopic" and confidence > OFFTOPIC_THRESHOLD)
        else:
            # Shopping: pass khi predict là shopping HOẶC chitchat (đều vào RAG)
            passed_case = predicted in ("shopping", "chitchat")

        if passed_case:
            passed += 1
            ok(f"{query!r:<45} → {predicted} ({confidence:.0%}) ✓")
        else:
            fail(f"{query!r:<45} → {predicted} ({confidence:.0%}) [expected {expected}]")

        results.append({
            "query": query,
            "expected": expected,
            "predicted": predicted,
            "confidence": round(confidence, 3),
            "passed": passed_case,
            "latency_ms": latency_ms,
        })

    total = len(test_cases)
    accuracy = passed / total
    print(f"\n  Accuracy (ngưỡng mới): {passed}/{total} ({accuracy:.0%})")

    status = "OK" if accuracy >= 0.70 else "WARNING"
    if status == "WARNING":
        warn(f"Accuracy thấp ({accuracy:.0%} < 70%) — cần thêm data training!")
    else:
        ok(f"Status: {status}")

    return {"status": status, "accuracy": round(accuracy, 3), "cases": results}, accuracy


# ─── Test 2: Router — Filter Extraction ──────────────────────────────────────
def test_router():
    section("[TEST 2] Router — Filter Extraction")

    test_cases = [
        (
            "túi đeo chéo màu đen dưới 500k",
            {"max_price": 500000, "color": "đen"}
        ),
        (
            "giày size 42 brand Adidas",
            {"size": "42", "brand": "Adidas"}
        ),
        (
            "balo nữ dưới 2 triệu màu hồng",
            {"max_price": 2000000, "color": "hồng"}
        ),
        (
            "dép tổ ong size 39",
            {"size": "39"}
        ),
        (
            "túi xách giá rẻ nhất",
            {}  # sort=cheapest hoặc không có filter cụ thể
        ),
    ]

    from llm.llm_router import route_query

    results = []
    latencies = []
    hits = 0

    for query, expected_filters in test_cases:
        t0 = time.time()
        result = route_query(query)
        latency_ms = round((time.time() - t0) * 1000)
        latencies.append(latency_ms)

        got_filters = result.to_filter_dict()

        # Kiểm tra từng key expected có trong got không
        hit = all(
            str(got_filters.get(k, "")).lower() == str(v).lower()
            for k, v in expected_filters.items()
        )

        if hit:
            hits += 1
            ok(f"{query!r:<45} [{latency_ms}ms] HIT")
        else:
            miss_keys = [k for k, v in expected_filters.items() if str(got_filters.get(k, "")).lower() != str(v).lower()]
            fail(f"{query!r:<45} [{latency_ms}ms] MISS (missing: {miss_keys})")
            info(f"  Expected: {expected_filters}")
            info(f"  Got:      {got_filters}")

        if latency_ms > 2000:
            warn(f"Latency cao ({latency_ms}ms > 2000ms) — Ollama chưa chạy hoặc model nặng")

        results.append({
            "query": query,
            "filters_expected": expected_filters,
            "filters_got": got_filters,
            "hit": hit,
            "latency_ms": latency_ms,
        })

    avg_latency = round(sum(latencies) / len(latencies)) if latencies else 0
    print(f"\n  Ollama latency avg: {avg_latency}ms")

    status = "OK" if hits >= len(test_cases) * 0.6 else "WARNING"
    if status == "WARNING":
        warn(f"Hit rate thấp ({hits}/{len(test_cases)}) — kiểm tra Ollama và prompt")
    else:
        ok(f"Status: {status} — {hits}/{len(test_cases)} hits")

    return {
        "status": status,
        "avg_latency_ms": avg_latency,
        "cases": results,
    }, hits / len(test_cases)


# ─── Test 3: Retrieval ────────────────────────────────────────────────────────
def test_retrieval():
    section("[TEST 3] Retrieval — Hybrid Search")

    queries = [
        "dép tổ ong",
        "túi đeo chéo nam",
        "balo học sinh laptop",
        "dép nữ đế bánh mì",
        "túi xách nữ đi làm",
    ]

    from embedding_engine import PhoBertEmbeddingEngine, CrossEncoderReranker
    from core.retrieval import CategoryMatcher, hybrid_search
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from config import settings

    emb_engine = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
    reranker = CrossEncoderReranker()

    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        category_matcher = CategoryMatcher(session, emb_engine)
    except Exception as e:
        fail(f"Không kết nối được DB: {e}")
        return {"status": "FAIL", "avg_latency_ms": 0, "cases": []}, 0

    results = []
    latencies = []
    ok_count = 0

    for query in queries:
        t0 = time.time()
        try:
            vec = emb_engine.get_embedding(query)
            products, mode = hybrid_search(
                session=session,
                query_vector=vec,
                query_text=query,
                embedding_engine=emb_engine,
                reranker_engine=reranker,
                category_matcher=category_matcher,
                top_k=3,
            )
            latency_ms = round((time.time() - t0) * 1000)
            latencies.append(latency_ms)

            top3 = []
            for p in products[:3]:
                score = (
                    p.get("rerank_score")
                    or p.get("similarity_score")
                    or p.get("score")
                    or p.get("cosine_score")
                    or p.get("vector_score")
                    or 0.0
                )
                top3.append({"name": p.get("name", "?"), "score": round(float(score), 3)})
            top1_score = top3[0]["score"] if top3 else 0.0
            low_conf = top1_score < 0.45

            if low_conf:
                warn(f"{query!r:<35} [{latency_ms}ms] top1_score={top1_score:.2f} < 0.45")
            else:
                ok_count += 1
                ok(f"{query!r:<35} [{latency_ms}ms] top1={top1_score:.2f}")

            for i, p in enumerate(top3, 1):
                info(f"  {i}. {p['name']!r} (score={p['score']})")

            if latency_ms > 3000:
                warn(f"Retrieval chậm ({latency_ms}ms > 3000ms)")

            results.append({
                "query": query,
                "top3_products": top3,
                "top1_score": top1_score,
                "low_confidence": low_conf,
                "latency_ms": latency_ms,
            })
        except Exception as e:
            fail(f"{query!r} — Lỗi: {e}")
            results.append({"query": query, "error": str(e)})

    session.close()
    avg_latency = round(sum(latencies) / len(latencies)) if latencies else 0
    print(f"\n  Retrieval latency avg: {avg_latency}ms")

    status = "OK" if ok_count >= len(queries) * 0.6 else "WARNING"
    ok(f"Status: {status} — {ok_count}/{len(queries)} queries confident")

    return {"status": status, "avg_latency_ms": avg_latency, "cases": results}, ok_count / len(queries)


# ─── Test 4: End-to-End ───────────────────────────────────────────────────────
def test_e2e():
    section("[TEST 4] End-to-End — run_deterministic_chat")

    test_cases = [
        ("dép tổ ong",                                             "shopping"),  # baseline: query ngắn, không filter
        ("có dép tổ ong không shop",                               "shopping"),
        ("túi đeo chéo nam phong cách Hàn Quốc giá rẻ",           "shopping"),
        ("thời tiết hôm nay thế nào",                              "offtopic"),
    ]

    from embedding_engine import PhoBertEmbeddingEngine, CrossEncoderReranker
    from core.retrieval import CategoryMatcher
    from core.agentic_rag import run_deterministic_chat
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from config import settings
    from intent.intent_classifier_ml import IntentClassifierML

    emb_engine = PhoBertEmbeddingEngine(model_name=settings.EMBEDDING_MODEL)
    reranker = CrossEncoderReranker()

    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        category_matcher = CategoryMatcher(session, emb_engine)
    except Exception as e:
        fail(f"Không kết nối được DB: {e}")
        return {"status": "FAIL", "avg_latency_ms": 0, "cases": []}, 0

    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "intent_model.joblib")
    gk = IntentClassifierML(embedding_engine=emb_engine, model_path=model_path) if os.path.exists(model_path) else None

    OFFTOPIC_THRESHOLD = 0.90
    results = []
    latencies = []
    passed = 0

    for query, qtype in test_cases:
        t0 = time.time()
        try:
            # Kiểm tra gatekeeper trước
            blocked = False
            if gk:
                gk_result = gk.classify(query)
                if gk_result["intent"] == "offtopic" and gk_result["confidence"] > OFFTOPIC_THRESHOLD:
                    blocked = True
                    response_text = "BLOCKED_BY_GATEKEEPER"
                    products = []
                    mode = "offtopic"

            if not blocked:
                rag = run_deterministic_chat(
                    query=query,
                    session=session,
                    embedding_engine=emb_engine,
                    reranker_engine=reranker,
                    category_matcher=category_matcher,
                    top_k=5,
                )
                response_text = rag.get("response", "")
                products = rag.get("products", [])
                mode = rag.get("mode", "unknown")

            total_ms = round((time.time() - t0) * 1000)
            latencies.append(total_ms)

            if qtype == "offtopic":
                # Offtopic phải bị block hoặc không có sản phẩm
                case_passed = blocked or len(products) == 0
            else:
                # Shopping phải ra ít nhất 1 sản phẩm
                case_passed = len(products) >= 1

            if case_passed:
                passed += 1
                ok(f"[{qtype.upper()}] {query!r:<50} — {len(products)} sản phẩm, {total_ms}ms")
            else:
                fail(f"[{qtype.upper()}] {query!r:<50} — {len(products)} sản phẩm [{total_ms}ms]")
                if qtype == "offtopic" and len(products) > 0:
                    warn("Offtopic ra sản phẩm — model chưa học tốt ngưỡng!")
                elif qtype == "shopping" and len(products) == 0:
                    warn("Shopping không ra sản phẩm — kiểm tra DB hoặc query!")

            info(f"  Mode: {mode} | Response: {response_text[:80]!r}...")

            results.append({
                "query": query,
                "type": qtype,
                "products_count": len(products),
                "mode": mode,
                "response_preview": response_text[:50],
                "passed": case_passed,
                "total_ms": total_ms,
            })

        except Exception as e:
            fail(f"{query!r} — Lỗi: {e}")
            results.append({"query": query, "error": str(e), "passed": False})

    session.close()
    avg_latency = round(sum(latencies) / len(latencies)) if latencies else 0
    print(f"\n  Total latency avg: {avg_latency}ms")

    status = "OK" if passed == len(test_cases) else "WARNING"
    ok(f"Status: {status} — {passed}/{len(test_cases)} passed")

    return {"status": status, "avg_latency_ms": avg_latency, "cases": results}, passed / len(test_cases)


# ─── Main runner ─────────────────────────────────────────────────────────────
def run_all_tests():
    t_global = time.time()
    print(f"\n{BOLD}{'═'*44}{RESET}")
    print(f"{BOLD}  HOMURA SHOP — Pipeline Test Report{RESET}")
    print(f"{BOLD}{'═'*44}{RESET}")

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "overall": {},
        "test1_intent": {},
        "test2_router": {},
        "test3_retrieval": {},
        "test4_e2e": {},
    }

    tests_passed = 0
    tests_total = 4

    try:
        r1, score1 = test_intent_classifier()
        report["test1_intent"] = r1
        if r1["status"] == "OK":
            tests_passed += 1
    except Exception as e:
        print(f"{RED}  [TEST 1] CRASH: {e}{RESET}")
        report["test1_intent"] = {"status": "FAIL", "error": str(e)}

    try:
        r2, score2 = test_router()
        report["test2_router"] = r2
        if r2["status"] == "OK":
            tests_passed += 1
    except Exception as e:
        print(f"{RED}  [TEST 2] CRASH: {e}{RESET}")
        report["test2_router"] = {"status": "FAIL", "error": str(e)}

    try:
        r3, score3 = test_retrieval()
        report["test3_retrieval"] = r3
        if r3["status"] == "OK":
            tests_passed += 1
    except Exception as e:
        print(f"{RED}  [TEST 3] CRASH: {e}{RESET}")
        report["test3_retrieval"] = {"status": "FAIL", "error": str(e)}

    try:
        r4, score4 = test_e2e()
        report["test4_e2e"] = r4
        if r4["status"] == "OK":
            tests_passed += 1
    except Exception as e:
        print(f"{RED}  [TEST 4] CRASH: {e}{RESET}")
        report["test4_e2e"] = {"status": "FAIL", "error": str(e)}

    total_elapsed = round(time.time() - t_global, 1)
    report["overall"] = {
        "tests_passed": tests_passed,
        "tests_total": tests_total,
        "total_elapsed_seconds": total_elapsed,
    }

    # ── Tổng kết ──────────────────────────────────────────────────────────────
    print(f"\n{BOLD}{'═'*44}{RESET}")
    status_icon = GREEN + "✔" + RESET if tests_passed == tests_total else YELLOW + "⚠" + RESET
    print(f"  {status_icon} {BOLD}TỔNG KẾT: {tests_passed}/{tests_total} tests passed{RESET}")
    print(f"  ⏱  Thời gian chạy toàn bộ: {total_elapsed}s")
    print(f"{BOLD}{'═'*44}{RESET}\n")

    # ── Lưu JSON report ───────────────────────────────────────────────────────
    report_name = f"pipeline_report_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    report_path = os.path.join(os.path.dirname(__file__), report_name)
    try:
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"  {GREEN}Đã lưu report:{RESET} {report_name}")
        print("  Paste file này vào Claude để được phân tích chi tiết.\n")
    except Exception as e:
        warn(f"Không lưu được report: {e}")

    return tests_passed, tests_total


if __name__ == "__main__":
    run_all_tests()
