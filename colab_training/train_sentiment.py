"""
뉴스 감성 분류 모델 파인튜닝
Colab T4 / 로컬 터미널 모두 지원

모델:
  klue   → klue/roberta-large  (한국어 인코더, 분류 특화)
  gemma  → google/gemma-3-1b-it (생성형 제로샷)

실행:
  python train_sentiment.py          # klue (기본)
  python train_sentiment.py gemma    # gemma 제로샷
  python train_sentiment.py both     # 둘 다 비교
"""
import json
import os
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

# ── 의존성 설치 (Colab VM 신규 환경용) ───────────────────────────────────────
def _install():
    pkgs = ["transformers", "datasets", "scikit-learn", "supabase", "accelerate", "rich"]
    subprocess.run([sys.executable, "-m", "pip", "install", "-q"] + pkgs, check=True)
    try:
        import torch
    except ImportError:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "torch",
             "--index-url", "https://download.pytorch.org/whl/cu121"], check=True,
        )

_install()

import numpy as np
import torch
import torch.nn.functional as F
from datasets import Dataset
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.progress import BarColumn, MofNCompleteColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from sklearn.metrics import classification_report, f1_score, accuracy_score
from sklearn.model_selection import train_test_split
from supabase import ClientOptions, create_client
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from transformers import (
    AutoModelForCausalLM,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    EarlyStoppingCallback,
    Trainer,
    TrainingArguments,
    TrainerCallback,
    get_cosine_schedule_with_warmup,
    get_cosine_with_hard_restarts_schedule_with_warmup,
)

console = Console()

# ── 설정 ──────────────────────────────────────────────────────────────────────
MODELS = {
    "klue":  "klue/roberta-large",   # large 업그레이드 (base → large)
    "gemma": "google/gemma-3-1b-it",
}
OUTPUT_BASE = "/content/news_sentiment"
LABEL_MAP   = {"positive": 0, "neutral": 1, "negative": 2}
ID2LABEL    = {0: "positive", 1: "neutral", 2: "negative"}
MIN_SAMPLES = 80
MAX_LENGTH  = 128

GEMMA_PROMPT = """다음 한국어 뉴스 헤드라인의 감성을 분류하세요.
positive, neutral, negative 중 하나만 답하세요.

헤드라인: {text}
감성:"""


# ── Rich 진행 표시 콜백 ───────────────────────────────────────────────────────
class RichProgressCallback(TrainerCallback):
    def __init__(self, total_epochs):
        self.total_epochs  = total_epochs
        self.current_epoch = 0
        self.history       = []
        self.progress = Progress(
            SpinnerColumn(),
            TextColumn("[bold cyan]{task.description}"),
            BarColumn(bar_width=35),
            MofNCompleteColumn(),
            TimeElapsedColumn(),
            console=console,
        )
        self.epoch_task = self.progress.add_task("Epoch", total=total_epochs)
        self.step_task  = self.progress.add_task("Step ", total=1)
        self.progress.start()

    def on_epoch_begin(self, args, state, control, **kwargs):
        self.current_epoch += 1
        self.progress.update(self.epoch_task, completed=self.current_epoch - 1)
        self.progress.reset(self.step_task, total=state.max_steps // self.total_epochs or 1)

    def on_step_end(self, args, state, control, **kwargs):
        self.progress.advance(self.step_task)

    def on_evaluate(self, args, state, control, metrics=None, **kwargs):
        if not metrics:
            return
        epoch = round(state.epoch or self.current_epoch, 1)
        acc   = metrics.get("eval_accuracy", 0)
        f1    = metrics.get("eval_f1_macro", 0)
        loss  = metrics.get("eval_loss", 0)
        self.history.append({"epoch": epoch, "loss": loss, "acc": acc, "f1": f1})
        self._print_epoch_table()

    def _print_epoch_table(self):
        table = Table(show_header=True, header_style="bold magenta", box=None, padding=(0, 1))
        table.add_column("Epoch", style="dim", width=6)
        table.add_column("Loss",  width=8)
        table.add_column("Acc",   width=8)
        table.add_column("F1",    width=8)
        for row in self.history:
            best = row["f1"] == max(r["f1"] for r in self.history)
            style = "bold green" if best else ""
            table.add_row(
                str(row["epoch"]),
                f"{row['loss']:.4f}",
                f"{row['acc']:.4f}",
                f"[bold green]{row['f1']:.4f}[/]" if best else f"{row['f1']:.4f}",
                style=style,
            )
        console.print(table)

    def on_train_end(self, args, state, control, **kwargs):
        self.progress.update(self.epoch_task, completed=self.total_epochs)
        self.progress.stop()


# ── Supabase 데이터 로드 ──────────────────────────────────────────────────────
def fetch_data() -> list[dict]:
    url    = os.environ["SUPABASE_URL"]
    key    = os.environ["SUPABASE_KEY"]
    schema = os.environ.get("SUPABASE_SCHEMA", "newsdash")

    with console.status("[cyan]Supabase 데이터 로드 중..."):
        client = create_client(url, key, options=ClientOptions(schema=schema))
        res = (
            client.table("article_summaries")
            .select("title, summary, sentiment, sentiment_score, category")
            .not_.is_("sentiment", "null")
            .not_.is_("title", "null")
            .execute()
        )
    rows = res.data or []
    console.print(f"[green]✓[/] Supabase: [bold]{len(rows)}건[/] 로드")
    return rows


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
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_row("positive", f"[green]{dist[0]}건[/]")
    table.add_row("neutral",  f"[yellow]{dist[1]}건[/]")
    table.add_row("negative", f"[red]{dist[2]}건[/]")
    table.add_row("합계",      f"[bold]{len(valid)}건[/]")
    console.print(Panel(table, title="[bold]레이블 분포[/]", expand=False))
    return texts, labels


# ── 클래스 가중치 계산 ────────────────────────────────────────────────────────
def compute_class_weights(labels: list[int]) -> torch.Tensor:
    dist = Counter(labels)
    total = len(labels)
    # 역빈도 가중치: 적은 클래스에 더 높은 가중치
    weights = torch.tensor([
        total / (3 * dist[i]) for i in range(3)
    ], dtype=torch.float32)
    console.print(
        f"[dim]실험: [bold]{_EXPERIMENT}[/dim]  "
        f"가중치: pos={weights[0]:.2f} neu={weights[1]:.2f} neg={weights[2]:.2f}  "
        f"스무딩: {LABEL_SMOOTHING}  scheduler: {LR_SCHEDULER}(cycles={NUM_CYCLES})[/]"
    )
    return weights


# ── 가중 손실 + 레이블 스무딩 Trainer ───────────────────────────────────────
# 실험 모드별 설정 (EXPERIMENT env로 선택)
_EXPERIMENT = os.environ.get("EXPERIMENT", "v4b")
EXPERIMENTS = {
    "v4b":  {"smoothing": 0.0,  "scheduler": "cosine_with_restarts", "cycles": 2},   # B: restarts만
    "v4ab": {"smoothing": 0.05, "scheduler": "cosine_with_restarts", "cycles": 2},   # A+B: 스무딩0.05 + restarts
}
_CFG            = EXPERIMENTS.get(_EXPERIMENT, EXPERIMENTS["v4b"])
LABEL_SMOOTHING = _CFG["smoothing"]
LR_SCHEDULER    = _CFG["scheduler"]
NUM_CYCLES      = _CFG["cycles"]

class WeightedTrainer(Trainer):
    def __init__(self, class_weights: torch.Tensor, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def create_scheduler(self, num_training_steps: int, optimizer=None):
        if "restarts" in LR_SCHEDULER:
            warmup_steps = int(num_training_steps * self.args.warmup_ratio)
            self.lr_scheduler = get_cosine_with_hard_restarts_schedule_with_warmup(
                optimizer or self.optimizer,
                num_warmup_steps=warmup_steps,
                num_training_steps=num_training_steps,
                num_cycles=NUM_CYCLES,
            )
            return self.lr_scheduler
        return super().create_scheduler(num_training_steps, optimizer)

    def compute_loss(self, model, inputs, return_outputs=False, num_items_in_batch=None, **kwargs):
        labels  = inputs.pop("labels")
        outputs = model(**inputs)
        num_classes = outputs.logits.size(-1)

        # 레이블 스무딩: one-hot → soft target
        smooth = LABEL_SMOOTHING / (num_classes - 1)
        one_hot = torch.zeros_like(outputs.logits).scatter_(1, labels.unsqueeze(1), 1.0)
        soft_target = one_hot * (1.0 - LABEL_SMOOTHING) + (1.0 - one_hot) * smooth

        # 클래스 가중치 적용 log-softmax
        log_prob = F.log_softmax(outputs.logits, dim=-1)
        w = self.class_weights.to(outputs.logits.device)[labels]
        loss = -(soft_target * log_prob).sum(dim=-1)
        loss = (loss * w).mean()

        return (loss, outputs) if return_outputs else loss


# ── KLUE-RoBERTa 파인튜닝 ─────────────────────────────────────────────────────
def run_klue(texts: list[str], labels: list[int]) -> dict:
    model_id = MODELS["klue"]
    output   = f"{OUTPUT_BASE}_klue"

    console.rule(f"[bold cyan]KLUE  {model_id}[/]")

    class_weights = compute_class_weights(labels)

    with console.status(f"[cyan]{model_id} 로딩..."):
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForSequenceClassification.from_pretrained(
            model_id, num_labels=3, id2label=ID2LABEL, label2id=LABEL_MAP,
        )

    if torch.cuda.is_available():
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        console.print(f"[green]✓[/] 모델 로드 완료  GPU: [bold]{torch.cuda.get_device_name(0)}[/]  VRAM: {vram:.1f}GB")

    train_t, val_t, train_l, val_l = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )
    console.print(f"[dim]train={len(train_t)}  val={len(val_t)}[/]")

    def encode(t_list, l_list):
        enc = tokenizer(t_list, truncation=True, padding="max_length", max_length=MAX_LENGTH)
        return Dataset.from_dict({
            "input_ids":      enc["input_ids"],
            "attention_mask": enc["attention_mask"],
            "labels":         l_list,
        })

    def compute_metrics(eval_pred):
        logits, lbl = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {
            "accuracy": float(accuracy_score(lbl, preds)),
            "f1_macro": float(f1_score(lbl, preds, average="macro")),
        }

    n_epochs = 8
    args = TrainingArguments(
        output_dir=output,
        num_train_epochs=n_epochs,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=32,
        learning_rate=2e-5,
        lr_scheduler_type="cosine",       # restarts는 create_scheduler 오버라이드로 처리
        warmup_ratio=0.1,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        fp16=torch.cuda.is_available(),
        logging_steps=9999,
        report_to="none",
        disable_tqdm=True,
    )

    rich_cb = RichProgressCallback(total_epochs=n_epochs)

    trainer = WeightedTrainer(
        class_weights=class_weights,
        model=model,
        args=args,
        train_dataset=encode(train_t, train_l),
        eval_dataset=encode(val_t, val_l),
        compute_metrics=compute_metrics,
        callbacks=[
            EarlyStoppingCallback(early_stopping_patience=3),
            rich_cb,
        ],
    )

    console.print()
    trainer.train()

    # ── 최종 평가 ──
    pred_out = trainer.predict(encode(val_t, val_l))
    preds    = np.argmax(pred_out.predictions, axis=-1)
    report   = classification_report(
        val_l, preds,
        target_names=["positive", "neutral", "negative"],
        output_dict=True,
    )

    # 결과 테이블
    result_table = Table(show_header=True, header_style="bold", padding=(0, 2))
    result_table.add_column("클래스",    style="bold")
    result_table.add_column("Precision", justify="right")
    result_table.add_column("Recall",    justify="right")
    result_table.add_column("F1",        justify="right")
    for cls in ["positive", "neutral", "negative"]:
        r = report[cls]
        result_table.add_row(
            cls,
            f"{r['precision']:.3f}",
            f"{r['recall']:.3f}",
            f"[bold green]{r['f1-score']:.3f}[/]",
        )
    result_table.add_section()
    result_table.add_row(
        "[bold]macro avg[/]", "",
        f"[bold]{report['accuracy']:.3f}[/]",
        f"[bold]{report['macro avg']['f1-score']:.3f}[/]",
    )
    console.print(Panel(result_table, title="[bold green]KLUE 최종 결과[/]"))

    trainer.save_model(output)
    tokenizer.save_pretrained(output)

    return {
        "model":     model_id,
        "mode":      "finetuned_classifier",
        "output_dir": output,
        "val_samples": len(val_l),
        "accuracy":  round(report["accuracy"], 4),
        "f1_macro":  round(report["macro avg"]["f1-score"], 4),
        "f1_per_class": {
            k: round(report[k]["f1-score"], 4)
            for k in ["positive", "neutral", "negative"]
        },
    }


# ── Gemma 제로샷 ──────────────────────────────────────────────────────────────
def run_gemma_zeroshot(texts: list[str], labels: list[int]) -> dict:
    model_id = MODELS["gemma"]
    console.rule(f"[bold magenta]Gemma  {model_id}[/]")

    with console.status(f"[magenta]{model_id} 로딩..."):
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
        )
    model.eval()

    _, val_t, _, val_l = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )
    eval_texts  = val_t[:200]
    eval_labels = val_l[:200]

    VALID = {"positive", "neutral", "negative"}
    preds = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[magenta]{task.description}"),
        BarColumn(bar_width=35),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("제로샷 추론", total=len(eval_texts))
        for text in eval_texts:
            prompt = GEMMA_PROMPT.format(text=text)
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            with torch.no_grad():
                out = model.generate(
                    **inputs, max_new_tokens=8, do_sample=False,
                    pad_token_id=tokenizer.eos_token_id,
                )
            decoded = tokenizer.decode(
                out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True
            ).strip().lower()

            # 키워드 매핑 (한국어 포함)
            label = "neutral"
            for w in decoded.split():
                w = w.strip(".,:")
                if w in VALID:
                    label = w
                    break
            mapping = {"긍정": "positive", "부정": "negative", "중립": "neutral"}
            for kr, en in mapping.items():
                if kr in decoded:
                    label = en
                    break

            preds.append(LABEL_MAP[label])
            progress.advance(task)

    report = classification_report(
        eval_labels, preds,
        target_names=["positive", "neutral", "negative"],
        output_dict=True,
    )
    console.print(classification_report(
        eval_labels, preds, target_names=["positive", "neutral", "negative"]
    ))

    return {
        "model":       model_id,
        "mode":        "zero_shot_generative",
        "output_dir":  None,
        "val_samples": len(eval_labels),
        "accuracy":    round(report["accuracy"], 4),
        "f1_macro":    round(report["macro avg"]["f1-score"], 4),
        "f1_per_class": {
            k: round(report[k]["f1-score"], 4)
            for k in ["positive", "neutral", "negative"]
        },
    }


# ── 메인 ──────────────────────────────────────────────────────────────────────
def main():
    mode = os.environ.get("TRAIN_MODE") or (sys.argv[1] if len(sys.argv) > 1 else "klue")

    gpu_info = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    console.print(Panel(
        f"[bold]모드:[/]  {mode}\n"
        f"[bold]GPU: [/] {gpu_info}\n"
        f"[bold]시작:[/] {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        title="[bold cyan]뉴스 감성 모델 학습[/]",
        expand=False,
    ))

    rows = fetch_data()
    texts, labels = prepare(rows)

    if len(texts) < MIN_SAMPLES:
        console.print(f"[red]✗ 샘플 부족: {len(texts)}건 (최소 {MIN_SAMPLES}건)[/]")
        sys.exit(1)

    results = []
    if mode in ("klue", "both"):
        results.append(run_klue(texts, labels))
    if mode in ("gemma", "both"):
        results.append(run_gemma_zeroshot(texts, labels))

    # ── 최종 비교 ──
    if len(results) > 1:
        console.rule("[bold]최종 비교[/]")
        cmp = Table(show_header=True, header_style="bold", padding=(0, 2))
        cmp.add_column("모델",     style="bold")
        cmp.add_column("방식",     style="dim")
        cmp.add_column("Accuracy", justify="right")
        cmp.add_column("F1 macro", justify="right")
        best_f1 = max(r["f1_macro"] for r in results)
        for r in results:
            is_best = r["f1_macro"] == best_f1
            cmp.add_row(
                r["model"].split("/")[-1],
                r["mode"],
                f"{r['accuracy']:.3f}",
                f"[bold green]{r['f1_macro']:.3f} ★[/]" if is_best else f"{r['f1_macro']:.3f}",
            )
        console.print(cmp)

    # ── 저장 ──
    Path(OUTPUT_BASE).mkdir(parents=True, exist_ok=True)
    summary = {
        "trained_at":    datetime.now().isoformat(),
        "mode":          mode,
        "total_samples": len(texts),
        "results":       results,
    }
    if len(results) == 1:
        summary.update({k: v for k, v in results[0].items()})

    report_path = f"{OUTPUT_BASE}/eval_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    console.print(f"\n[green]✓[/] 저장: [dim]{report_path}[/]")


if __name__ == "__main__":
    main()
