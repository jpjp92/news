#!/bin/bash
# google/gemma-4-E4B-it 제로샷 테스트 (T4, colab run --keep)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/test_gemma4.py"
OUT_DIR="$PROJECT_ROOT/models/sentiment/gemma4_test"
LOGS_DIR="$PROJECT_ROOT/logs"
SESSION_NAME="gemma4-test-$(date +%Y%m%d%H%M)"

mkdir -p "$OUT_DIR" "$LOGS_DIR"
LOG_FILE="$LOGS_DIR/test_gemma4_$(date +%Y%m%d).log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# 환경변수 로드
for env_file in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local"; do
    [ -f "$env_file" ] && { set -a; source "$env_file"; set +a; }
done

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_KEY:-}" ]; then
    log "[오류] SUPABASE_URL 또는 SUPABASE_KEY 미설정"; exit 1
fi

log "=============================="
log "Gemma 4 4B-it 제로샷 테스트"
log "GPU: T4 | 모델: google/gemma-4-E4B-it"
log "=============================="

# env vars + 스크립트 인라인 합쳐서 colab run --keep 실행
TMP_SCRIPT="/tmp/test_gemma4_$$.py"
cat > "$TMP_SCRIPT" << PYEOF
import os
os.environ['SUPABASE_URL']    = '${SUPABASE_URL}'
os.environ['SUPABASE_KEY']    = '${SUPABASE_KEY}'
os.environ['SUPABASE_SCHEMA'] = '${SUPABASE_SCHEMA:-newsdash}'
PYEOF
cat "$TEST_SCRIPT" >> "$TMP_SCRIPT"

log "Colab T4 프로비저닝 + 테스트 실행..."
colab run --gpu T4 --keep -s "$SESSION_NAME" "$TMP_SCRIPT"
rm -f "$TMP_SCRIPT"

log "결과 다운로드..."
mkdir -p "$OUT_DIR"
colab download -s "$SESSION_NAME" /content/gemma4_test/eval_report.json \
    "$OUT_DIR/eval_report.json" 2>/dev/null || log "[경고] 다운로드 실패"

colab stop -s "$SESSION_NAME" 2>/dev/null || true

# 결과 출력
if [ -f "$OUT_DIR/eval_report.json" ]; then
    log "=============================="
    log "테스트 결과"
    log "=============================="
    uv run --project "$HOME/devs/github" - << PYEOF
import json
with open('$OUT_DIR/eval_report.json') as f:
    r = json.load(f)
print(f"  모델:     {r['model']}")
print(f"  샘플:     {r['eval_samples']}건")
print(f"  Accuracy: {r['accuracy']:.3f}")
print(f"  F1 macro: {r['f1_macro']:.3f}")
print(f"  F1 per class:")
for cls, score in r['f1_per_class'].items():
    print(f"    {cls:10s}: {score:.3f}")
print()
print(f"  [비교] KLUE-RoBERTa: acc=0.823  F1=0.815")
print(f"  [비교] Gemma 4 4B:   acc={r['accuracy']:.3f}  F1={r['f1_macro']:.3f}")
PYEOF
    log "저장: $OUT_DIR/eval_report.json"
else
    log "[경고] eval_report.json 없음 — $LOG_FILE 확인"
fi

log "완료"
