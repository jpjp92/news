"""
KR-ELECTRA 감성 분류 파인튜닝 테스트
snunlp/KR-ELECTRA-discriminator vs klue/roberta-large 비교

실행: bash run_test_electra.sh
"""
import json
import os
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

def _install():
    pkgs = ["transformers", "datasets", "scikit-learn", "supabase", "accelerate", "rich"]
    subprocess.run([sys.executable, "-m", "pip", "install", "-q"] + pkgs, check=True)

_install()

import numpy as np
import torch
import torch.nn.functional as F
from datasets import Dataset
from rich.console import Console
from rich.panel import Panel
from rich.progress import BarColumn, MofNCompleteColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from sklearn.metrics import classification_report, f1_score, accuracy_score
from sklearn.model_selection import train_test_split
from supabase import ClientOptions, create_client
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    EarlyStoppingCallback,
    Trainer,
    TrainingArguments,
    TrainerCallback,
    get_cosine_with_hard_restarts_schedule_with_warmup,
)

console = Console()

# ── 설정 ──────────────────────────────────────────────────────────────────────
CANDIDATES = {
    "electra":  "snunlp/KR-ELECTRA-discriminator",
    "finbert":  "snunlp/KR-FinBert-SC",
    "koelectra":"monologg/koelectra-base-v3-discriminator",
}
TARGET      = os.environ.get("ELECTRA_MODEL", "electra")
MODEL_ID    = CANDIDATES[TARGET]
OUTPUT_DIR  = f"/content/electra_{TARGET}"
LABEL_MAP   = {"positive": 0, "neutral": 1, "negative": 2}
ID2LABEL    = {0: "positive", 1: "neutral", 2: "negative"}
MAX_LENGTH  = 128

# 클래스 가중치 (v2에서 검증된 설정 유지)
def compute_class_weights(labels):
    dist = Counter(labels)
    total = len(labels)
    return torch.tensor([total / (3 * dist[i]) for i in range(3)], dtype=torch.float32)


# ── Rich 콜백 ─────────────────────────────────────────────────────────────────
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
        row = {
            "epoch": round(state.epoch or self.current_epoch, 1),
            "loss":  metrics.get("eval_loss", 0),
            "acc":   metrics.get("eval_accuracy", 0),
            "f1":    metrics.get("eval_f1_macro", 0),
        }
        self.history.append(row)
        table = Table(show_header=True, header_style="bold magenta", box=None, padding=(0,1))
        table.add_column("Epoch", width=6)
        table.add_column("Loss",  width=8)
        table.add_column("Acc",   width=8)
        table.add_column("F1",    width=8)
        best_f1 = max(r["f1"] for r in self.history)
        for r in self.history:
            is_best = r["f1"] == best_f1
            table.add_row(
                str(r["epoch"]),
                f"{r['loss']:.4f}",
                f"{r['acc']:.4f}",
                f"[bold green]{r['f1']:.4f} ★[/]" if is_best else f"{r['f1']:.4f}",
            )
        console.print(table)

    def on_train_end(self, args, state, control, **kwargs):
        self.progress.update(self.epoch_task, completed=self.total_epochs)
        self.progress.stop()


# ── Weighted Trainer (v2 설정 동일) ──────────────────────────────────────────
class WeightedTrainer(Trainer):
    def __init__(self, class_weights, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, num_items_in_batch=None, **kwargs):
        labels  = inputs.pop("labels")
        outputs = model(**inputs)
        loss    = F.cross_entropy(
            outputs.logits, labels,
            weight=self.class_weights.to(outputs.logits.device),
        )
        return (loss, outputs) if return_outputs else loss


# ── 데이터 로드 ───────────────────────────────────────────────────────────────
def fetch_data():
    url    = os.environ["SUPABASE_URL"]
    key    = os.environ["SUPABASE_KEY"]
    schema = os.environ.get("SUPABASE_SCHEMA", "newsdash")
    with console.status("[cyan]Supabase 로드 중..."):
        client = create_client(url, key, options=ClientOptions(schema=schema))
        res = (
            client.table("article_summaries")
            .select("title, summary, sentiment")
            .not_.is_("sentiment", "null")
            .not_.is_("title", "null")
            .execute()
        )
    rows = res.data or []
    console.print(f"[green]✓[/] {len(rows)}건 로드")
    return rows


def prepare(rows):
    valid = [r for r in rows if r.get("sentiment") in LABEL_MAP]
    texts, labels = [], []
    for r in valid:
        text = r["title"]
        if r.get("summary"):
            text = f"{r['title']} {r['summary']}"
        texts.append(text)
        labels.append(LABEL_MAP[r["sentiment"]])
    dist = Counter(labels)
    table = Table(show_header=False, box=None, padding=(0,2))
    table.add_row("positive", f"[green]{dist[0]}건[/]")
    table.add_row("neutral",  f"[yellow]{dist[1]}건[/]")
    table.add_row("negative", f"[red]{dist[2]}건[/]")
    table.add_row("합계",      f"[bold]{len(valid)}건[/]")
    console.print(Panel(table, title="[bold]레이블 분포[/]", expand=False))
    return texts, labels


# ── 학습 ──────────────────────────────────────────────────────────────────────
def train(texts, labels):
    console.rule(f"[bold cyan]{MODEL_ID}[/]")

    class_weights = compute_class_weights(labels)
    console.print(
        f"[dim]가중치: pos={class_weights[0]:.2f}  "
        f"neu={class_weights[1]:.2f}  neg={class_weights[2]:.2f}[/]"
    )

    with console.status(f"[cyan]{MODEL_ID} 로딩..."):
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_ID, num_labels=3, id2label=ID2LABEL, label2id=LABEL_MAP,
        )

    if torch.cuda.is_available():
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        console.print(f"[green]✓[/] {torch.cuda.get_device_name(0)}  VRAM: {vram:.1f}GB")

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

    # ELECTRA는 base(110M) → batch 크게, lr 높게 가능
    n_epochs = 10
    args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=n_epochs,
        per_device_train_batch_size=32,   # roberta-large(16) 대비 2배
        per_device_eval_batch_size=64,
        learning_rate=3e-5,               # ELECTRA는 조금 더 높게
        lr_scheduler_type="cosine",
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
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3), rich_cb],
    )

    console.print()
    trainer.train()

    pred_out = trainer.predict(encode(val_t, val_l))
    preds    = np.argmax(pred_out.predictions, axis=-1)
    report   = classification_report(
        val_l, preds,
        target_names=["positive", "neutral", "negative"],
        output_dict=True,
    )

    result_table = Table(show_header=True, header_style="bold", padding=(0,2))
    result_table.add_column("클래스",    style="bold")
    result_table.add_column("Precision", justify="right")
    result_table.add_column("Recall",    justify="right")
    result_table.add_column("F1",        justify="right")
    for cls in ["positive", "neutral", "negative"]:
        r = report[cls]
        result_table.add_row(cls, f"{r['precision']:.3f}", f"{r['recall']:.3f}",
                             f"[bold green]{r['f1-score']:.3f}[/]")
    result_table.add_section()
    result_table.add_row("[bold]macro avg[/]", "", f"[bold]{report['accuracy']:.3f}[/]",
                         f"[bold]{report['macro avg']['f1-score']:.3f}[/]")
    console.print(Panel(result_table, title=f"[bold green]{MODEL_ID} 결과[/]"))

    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    return {
        "model":      MODEL_ID,
        "target":     TARGET,
        "val_samples": len(val_l),
        "accuracy":   round(report["accuracy"], 4),
        "f1_macro":   round(report["macro avg"]["f1-score"], 4),
        "f1_per_class": {k: round(report[k]["f1-score"], 4)
                         for k in ["positive", "neutral", "negative"]},
        # roberta-large v2 기준값 (비교용)
        "baseline_roberta_large": {"accuracy": 0.8723, "f1_macro": 0.8714},
    }


# ── 메인 ──────────────────────────────────────────────────────────────────────
def main():
    gpu = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    console.print(Panel(
        f"[bold]모델:[/]  {MODEL_ID}\n"
        f"[bold]GPU: [/] {gpu}\n"
        f"[bold]시작:[/] {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        title="[bold cyan]KR-ELECTRA 파인튜닝 테스트[/]",
        expand=False,
    ))

    rows = fetch_data()
    texts, labels = prepare(rows)

    result = train(texts, labels)

    # 비교 출력
    base = result["baseline_roberta_large"]
    diff_f1  = result["f1_macro"] - base["f1_macro"]
    diff_acc = result["accuracy"]  - base["accuracy"]
    sign = lambda x: f"[green]+{x:.3f}[/]" if x > 0 else f"[red]{x:.3f}[/]"

    cmp = Table(show_header=True, header_style="bold", padding=(0,2))
    cmp.add_column("모델",     style="bold")
    cmp.add_column("Accuracy", justify="right")
    cmp.add_column("F1 macro", justify="right")
    cmp.add_column("vs baseline", justify="right")
    cmp.add_row("roberta-large (v2)",   f"{base['accuracy']:.3f}", f"{base['f1_macro']:.3f}", "기준")
    cmp.add_row(
        f"{MODEL_ID.split('/')[-1]}",
        f"{result['accuracy']:.3f}",
        f"[bold]{result['f1_macro']:.3f}[/]",
        f"F1 {sign(diff_f1)}  Acc {sign(diff_acc)}",
    )
    console.print(Panel(cmp, title="[bold]roberta-large vs ELECTRA 비교[/]"))

    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    summary = {"tested_at": datetime.now().isoformat(), **result}
    with open(f"{OUTPUT_DIR}/eval_report.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    console.print(f"[green]✓[/] 저장: {OUTPUT_DIR}/eval_report.json")


if __name__ == "__main__":
    main()
