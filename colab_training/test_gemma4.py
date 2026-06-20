"""
google/gemma-4-E4B-it 제로샷 감성 분류 테스트
AutoProcessor + AutoModelForMultimodalLM 사용

실행: bash run_test_gemma4.sh
"""
import json
import os
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

# ── 의존성 설치 ───────────────────────────────────────────────────────────────
def _install():
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q",
         "transformers", "supabase", "scikit-learn", "accelerate"],
        check=True,
    )

_install()

import torch
from sklearn.metrics import classification_report, f1_score, accuracy_score
from sklearn.model_selection import train_test_split
from supabase import create_client, ClientOptions
from transformers import AutoProcessor, AutoModelForMultimodalLM

MODEL_ID   = "google/gemma-4-E4B-it"
OUTPUT_DIR = "/content/gemma4_test"
LABEL_MAP  = {"positive": 0, "neutral": 1, "negative": 2}
VALID_LABELS = set(LABEL_MAP.keys())

PROMPT_TEMPLATE = """다음 한국어 뉴스 헤드라인의 감성을 분류하세요.
positive, neutral, negative 중 정확히 하나만 답하세요. 다른 말은 하지 마세요.

헤드라인: {text}
감성:"""


# ── 데이터 로드 ───────────────────────────────────────────────────────────────
def fetch_data() -> list[dict]:
    url    = os.environ["SUPABASE_URL"]
    key    = os.environ["SUPABASE_KEY"]
    schema = os.environ.get("SUPABASE_SCHEMA", "newsdash")

    client = create_client(url, key, options=ClientOptions(schema=schema))
    res = (
        client.table("article_summaries")
        .select("title, summary, sentiment")
        .not_.is_("sentiment", "null")
        .not_.is_("title", "null")
        .execute()
    )
    return res.data or []


def prepare(rows: list[dict]) -> tuple[list[str], list[int]]:
    valid = [r for r in rows if r.get("sentiment") in LABEL_MAP]
    texts, labels = [], []
    for r in valid:
        text = r["title"]
        if r.get("summary"):
            text = f"{r['title']} {r['summary']}"
        texts.append(text)
        labels.append(LABEL_MAP[r["sentiment"]])

    dist = Counter(labels)
    print(f"[Data] {len(valid)}건 | pos={dist[0]} neu={dist[1]} neg={dist[2]}")
    return texts, labels


# ── Gemma 4 제로샷 추론 ───────────────────────────────────────────────────────
def predict_batch(texts: list[str], processor, model, batch_size: int = 4) -> list[int]:
    preds = []
    device = next(model.parameters()).device

    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        prompts = [PROMPT_TEMPLATE.format(text=t) for t in batch]

        # AutoProcessor는 text-only 입력도 처리
        inputs = processor(
            text=prompts,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
        ).to(device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=5,
                do_sample=False,
                pad_token_id=processor.tokenizer.eos_token_id,
            )

        # 입력 길이 이후 생성된 토큰만 디코딩
        input_len = inputs["input_ids"].shape[1]
        for out in outputs:
            decoded = processor.tokenizer.decode(
                out[input_len:], skip_special_tokens=True
            ).strip().lower()
            # 첫 단어만 추출
            word = decoded.split()[0] if decoded.split() else "neutral"
            preds.append(LABEL_MAP.get(word, LABEL_MAP["neutral"]))

        if (i // batch_size) % 5 == 0:
            print(f"  [{i + len(batch)}/{len(texts)}] 진행 중...")

    return preds


# ── 메인 ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*55}")
    print(f"[Test] {MODEL_ID}")
    print(f"[Test] GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
    if torch.cuda.is_available():
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"[Test] VRAM: {vram:.1f}GB")
    print(f"[Test] 시작: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*55}\n")

    rows = fetch_data()
    texts, labels = prepare(rows)

    # 검증셋만 사용 (200건, 제로샷은 학습 없음)
    _, val_texts, _, val_labels = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )
    eval_texts  = val_texts[:200]
    eval_labels = val_labels[:200]
    print(f"[Test] 평가 샘플: {len(eval_texts)}건\n")

    # ── 모델 로드 ──
    print(f"[Load] {MODEL_ID} 로딩 중...")
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForMultimodalLM.from_pretrained(
        MODEL_ID,
        dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
    )
    model.eval()

    if torch.cuda.is_available():
        used = torch.cuda.memory_allocated() / 1024**3
        print(f"[Load] 완료 — VRAM 사용: {used:.1f}GB\n")

    # ── 추론 ──
    print("[Predict] 제로샷 추론 시작...")
    preds = predict_batch(eval_texts, processor, model, batch_size=4)

    # ── 평가 ──
    id2label = {0: "positive", 1: "neutral", 2: "negative"}
    report = classification_report(
        eval_labels, preds,
        target_names=["positive", "neutral", "negative"],
        output_dict=True,
    )

    print("\n[결과] Classification Report:")
    print(classification_report(
        eval_labels, preds,
        target_names=["positive", "neutral", "negative"],
    ))

    # 예측 분포 확인
    pred_dist = Counter(id2label[p] for p in preds)
    true_dist = Counter(id2label[l] for l in eval_labels)
    print(f"[분포] 실제:  {dict(true_dist)}")
    print(f"[분포] 예측:  {dict(pred_dist)}")

    # ── 저장 ──
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    summary = {
        "tested_at":   datetime.now().isoformat(),
        "model":       MODEL_ID,
        "mode":        "zero_shot_generative",
        "eval_samples": len(eval_texts),
        "accuracy":    round(report["accuracy"], 4),
        "f1_macro":    round(report["macro avg"]["f1-score"], 4),
        "f1_per_class": {
            k: round(report[k]["f1-score"], 4)
            for k in ["positive", "neutral", "negative"]
        },
        "pred_distribution": dict(pred_dist),
        "true_distribution": dict(true_dist),
        # KLUE 결과와 비교용
        "klue_reference": {
            "model":    "klue/roberta-base",
            "accuracy": 0.823,
            "f1_macro": 0.815,
        },
    }

    report_path = f"{OUTPUT_DIR}/eval_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*55}")
    print("[최종 비교]")
    print(f"  KLUE-RoBERTa (파인튜닝): acc=0.823  F1=0.815")
    print(f"  Gemma 4 4B  (제로샷):   acc={summary['accuracy']:.3f}  F1={summary['f1_macro']:.3f}")
    print(f"{'='*55}")
    print(f"[완료] {report_path}")


if __name__ == "__main__":
    main()
