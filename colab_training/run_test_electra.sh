#!/bin/bash
# 뉴스 도메인 감성 분류 백본 비교 테스트 (T4)
# 사용법:
#   bash run_test_electra.sh              # KR-ELECTRA (기본)
#   bash run_test_electra.sh finbert      # KR-FinBert-SC (금융 뉴스 감성)
#   bash run_test_electra.sh koelectra    # koelectra-base-v3
#   bash run_test_electra.sh kf-deberta   # kakaobank/kf-deberta-base (금융 DeBERTa)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/test_electra.py"
TARGET="${1:-electra}"
SESSION_NAME="electra-test-$(date +%Y%m%d%H%M)-$TARGET"
# 비교 실험(리포트만) → experiments/<날짜>/<모델>/
OUT_DIR="$PROJECT_ROOT/models/sentiment/experiments/$(date +%Y-%m-%d)/${TARGET}"
LOG_FILE="$PROJECT_ROOT/logs/test_electra_${TARGET}_$(date +%Y%m%d).log"

mkdir -p "$OUT_DIR" "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

for env_file in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local"; do
    [ -f "$env_file" ] && { set -a; source "$env_file"; set +a; }
done

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_KEY:-}" ]; then
    log "[오류] SUPABASE_URL 또는 SUPABASE_KEY 미설정"; exit 1
fi

log "=============================="
log "KR-ELECTRA 테스트: $TARGET"
log "=============================="

TMP_SCRIPT="/tmp/electra_run_$$.py"
( umask 077; cat > "$TMP_SCRIPT" << PYEOF
import os
os.environ['SUPABASE_URL']    = '${SUPABASE_URL}'
os.environ['SUPABASE_KEY']    = '${SUPABASE_KEY}'
os.environ['SUPABASE_SCHEMA'] = '${SUPABASE_SCHEMA:-newsdash}'
os.environ['ELECTRA_MODEL']   = '${TARGET}'
PYEOF
)
cat "$TEST_SCRIPT" >> "$TMP_SCRIPT"

cleanup() {
    colab stop -s "$SESSION_NAME" 2>/dev/null || true
    rm -f "$TMP_SCRIPT"
}
trap cleanup EXIT

log "Colab T4 프로비저닝..."
# --timeout: 출력이 멈춘 채 허용하는 최대 시간(초). 기본 30초는 모델 저장 단계
# (Writing model shards 등 출력 없는 구간)에서 끊기므로 넉넉히 600초로 설정.
colab run --gpu T4 --keep --timeout 600 -s "$SESSION_NAME" "$TMP_SCRIPT"

log "결과 다운로드..."
mkdir -p "$OUT_DIR"
colab download -s "$SESSION_NAME" "/content/electra_${TARGET}/eval_report.json" \
    "$OUT_DIR/eval_report.json" 2>/dev/null || log "[경고] 다운로드 실패"

if [ -f "$OUT_DIR/eval_report.json" ]; then
    log "=============================="
    uv run --project "$HOME/devs/github" - << PYEOF
import json
with open('$OUT_DIR/eval_report.json') as f:
    r = json.load(f)
base = r.get('baseline_roberta_large', {})
diff = r['f1_macro'] - base.get('f1_macro', 0)
print(f"  모델:     {r['model']}")
print(f"  Accuracy: {r['accuracy']:.3f}  (baseline: {base.get('accuracy','-')})")
print(f"  F1 macro: {r['f1_macro']:.3f}  (baseline: {base.get('f1_macro','-')})  diff: {diff:+.3f}")
for cls, score in r['f1_per_class'].items():
    print(f"    {cls:10s}: {score:.3f}")
PYEOF
    log "저장: $OUT_DIR/eval_report.json"
else
    log "[경고] eval_report.json 없음"
fi
log "완료"
