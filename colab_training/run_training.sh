#!/bin/bash
# 뉴스 감성 모델 월간 학습 스크립트 (T4 고정 — 무료 계정)
#
# 사용법:
#   bash run_training.sh              # KLUE-RoBERTa 파인튜닝 (기본)
#   bash run_training.sh gemma        # Gemma 제로샷 평가
#   bash run_training.sh both         # 두 모델 비교
#   bash run_training.sh gemma_ft     # Gemma 분류 헤드 파인튜닝
#
# cron 등록 (매월 1일 오전 3시):
#   0 3 1 * * cd ~/devs/github/news_monitoring/news_dash/colab_training && bash run_training.sh >> ~/devs/github/news_monitoring/news_dash/logs/cron.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRAIN_SCRIPT="$SCRIPT_DIR/train_sentiment.py"
MODELS_DIR="$PROJECT_ROOT/models/sentiment"
LOGS_DIR="$PROJECT_ROOT/logs"
TIMESTAMP="$(date +%Y%m)"
MODE="${1:-klue}"              # klue | gemma | both | gemma_ft
EXPERIMENT="${2:-v2}"         # v2 | v4b | v4ab
SESSION_NAME="news-training-$TIMESTAMP-${MODE}-${EXPERIMENT}"
MODEL_OUT="$MODELS_DIR/$TIMESTAMP/${MODE}_${EXPERIMENT}"

mkdir -p "$MODELS_DIR/$TIMESTAMP" "$LOGS_DIR"
LOG_FILE="$LOGS_DIR/training_${TIMESTAMP}_${MODE}_${EXPERIMENT}.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── 환경변수 로드 (.env → .env.local 순서, 후자가 우선) ─────────────────────
for env_file in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local"; do
    if [ -f "$env_file" ]; then
        set -a
        # shellcheck disable=SC1090
        source "$env_file"
        set +a
    fi
done

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_KEY:-}" ]; then
    log "[오류] SUPABASE_URL 또는 SUPABASE_KEY 미설정"
    exit 1
fi

# ── 이번 달 동일 모드 결과가 있으면 스킵 ─────────────────────────────────────
if [ -f "$MODEL_OUT/eval_report.json" ]; then
    log "[스킵] $TIMESTAMP/$MODE 결과가 이미 존재합니다."
    exit 0
fi

log "=============================="
log "월간 감성 모델 학습 시작"
log "모드: $MODE | 실험: $EXPERIMENT | GPU: T4 (무료 계정)"
log "=============================="

# ── Colab T4 세션 생성 ───────────────────────────────────────────────────────
log "Colab T4 VM 프로비저닝..."
colab new --gpu T4 -s "$SESSION_NAME" || {
    log "[경고] T4 할당 실패 — CPU로 재시도합니다."
    colab new -s "$SESSION_NAME"
}

cleanup() {
    log "세션 정리 중..."
    colab stop -s "$SESSION_NAME" 2>/dev/null || true
    rm -f "/tmp/setup_env_$$.py" "/tmp/gemma_run_$$.py"
}
trap cleanup EXIT

# ── 환경변수 주입 (Jupyter 커널 세션 유지) ───────────────────────────────────
# umask 077: 생성 파일을 소유자 전용(600)으로 제한 — 자격증명 노출 방지
( umask 077; cat > "/tmp/setup_env_$$.py" << PYEOF
import os
os.environ['SUPABASE_URL']    = '${SUPABASE_URL}'
os.environ['SUPABASE_KEY']    = '${SUPABASE_KEY}'
os.environ['SUPABASE_SCHEMA'] = '${SUPABASE_SCHEMA:-newsdash}'
os.environ['TRAIN_MODE']      = '${MODE}'
os.environ['EXPERIMENT']      = '${EXPERIMENT:-v2}'
print(f"[환경] 설정 완료 — 모드: ${MODE}  실험: ${EXPERIMENT:-v2}")
PYEOF
)

log "환경변수 주입..."
colab exec -s "$SESSION_NAME" -f "/tmp/setup_env_$$.py"

# ── 학습 실행 ─────────────────────────────────────────────────────────────────
log "학습 시작 (모드: $MODE)..."

if [[ "$MODE" == "gemma"* ]]; then
    # Gemma는 모델 다운로드(2.5GB) + 추론으로 colab exec 타임아웃 초과
    # colab run --keep: 스크립트 완료까지 기다리고 VM 유지 → 이후 download 가능
    log "[Gemma] colab run --keep 방식으로 실행 (타임아웃 없음)..."

    # env vars + 모드를 스크립트 앞에 인라인으로 주입한 임시 파일 생성 (600 권한)
    TMP_SCRIPT="/tmp/gemma_run_$$.py"
    ( umask 077; cat > "$TMP_SCRIPT" << PYEOF
import os
os.environ['SUPABASE_URL']    = '${SUPABASE_URL}'
os.environ['SUPABASE_KEY']    = '${SUPABASE_KEY}'
os.environ['SUPABASE_SCHEMA'] = '${SUPABASE_SCHEMA:-newsdash}'
os.environ['TRAIN_MODE']      = '${MODE}'
PYEOF
    )
    cat "$TRAIN_SCRIPT" >> "$TMP_SCRIPT"

    # 기존 세션 중단 후 colab run --keep 으로 재실행 (run은 자체 세션 생성)
    colab stop -s "$SESSION_NAME" 2>/dev/null || true
    colab run --gpu T4 --keep -s "$SESSION_NAME" "$TMP_SCRIPT"
    rm -f "$TMP_SCRIPT"
else
    colab exec -s "$SESSION_NAME" -f "$TRAIN_SCRIPT"
fi

# ── 결과 다운로드 ─────────────────────────────────────────────────────────────
log "결과 다운로드..."
mkdir -p "$MODEL_OUT"
colab download -s "$SESSION_NAME" /content/news_sentiment "$MODEL_OUT" 2>/dev/null || \
    log "[경고] 모델 파일 다운로드 실패 (eval_report.json만 있을 수 있음)"

# eval_report.json은 항상 받기
colab download -s "$SESSION_NAME" /content/news_sentiment/eval_report.json \
    "$MODEL_OUT/eval_report.json" 2>/dev/null || true

# ── 결과 출력 ─────────────────────────────────────────────────────────────────
REPORT="$MODEL_OUT/eval_report.json"
if [ ! -f "$REPORT" ]; then
    # /content/news_sentiment_klue 등 개별 경로 시도
    colab download -s "$SESSION_NAME" /content/news_sentiment/eval_report.json \
        "$MODEL_OUT/eval_report.json" 2>/dev/null || true
fi

if [ -f "$REPORT" ]; then
    log "=============================="
    log "학습 결과 요약"
    log "=============================="
    uv run --project "$HOME/devs/github" - << PYEOF
import json, sys
with open('$REPORT') as f:
    r = json.load(f)
print(f"  완료: {r.get('trained_at','')}")
print(f"  샘플: {r.get('total_samples','-')}건 | 모드: {r.get('mode','-')}")

results = r.get('results', [r] if 'accuracy' in r else [])
for res in results:
    mode = res.get('mode', res.get('model',''))
    acc  = res.get('accuracy', '-')
    f1   = res.get('f1_macro', '-')
    print(f"  [{mode}]  acc={acc:.3f}  F1={f1:.3f}")
    for cls, score in res.get('f1_per_class', {}).items():
        print(f"    {cls:10s}: {score:.3f}")
PYEOF
    log "저장 위치: $MODEL_OUT"
else
    log "[경고] eval_report.json 없음 — $LOG_FILE 확인"
fi

log "완료"
