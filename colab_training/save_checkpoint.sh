#!/bin/bash
# 단일 백본 학습 후 체크포인트(가중치)를 로컬에 보관하는 스크립트 (T4)
#
# run_test_electra.sh(비교용, 저장 안 함)와 달리, 이 스크립트는 SAVE_MODEL=1로
# 모델을 저장하고 가중치를 파일별로(대용량은 분할) 로컬에 회수한다.
# 가중치는 .gitignore로 git 제외 → 로컬에만 보관된다.
#
# 사용법:
#   bash save_checkpoint.sh                # kf-deberta (기본)
#   bash save_checkpoint.sh roberta        # klue/roberta-large
#
# 저장 경로: models/sentiment/checkpoints/<YYYY-MM-DD>/<target>/

set -uo pipefail   # -e 제외: colab run 타임아웃이 나도 다운로드까지 진행해야 함

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/test_electra.py"
TARGET="${1:-kf-deberta}"
DATE="$(date +%Y-%m-%d)"
SESSION_NAME="ckpt-$(date +%Y%m%d%H%M)-$TARGET"
# 보관 체크포인트(가중치 포함) → checkpoints/<날짜>/<모델>/
CKPT_DIR="$PROJECT_ROOT/models/sentiment/checkpoints/$DATE/$TARGET"
REMOTE_DIR="/content/electra_${TARGET}"
LOG_FILE="$PROJECT_ROOT/logs/save_checkpoint_${TARGET}_${DATE}.log"

mkdir -p "$CKPT_DIR" "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

for env_file in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local"; do
    [ -f "$env_file" ] && { set -a; source "$env_file"; set +a; }
done

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_KEY:-}" ]; then
    log "[오류] SUPABASE_URL 또는 SUPABASE_KEY 미설정"; exit 1
fi

log "=============================="
log "체크포인트 학습+저장: $TARGET"
log "저장 경로: $CKPT_DIR"
log "=============================="

# env + SAVE_MODEL=1 을 스크립트 앞에 인라인 주입 (600 권한)
TMP_SCRIPT="/tmp/ckpt_run_$$.py"
( umask 077; cat > "$TMP_SCRIPT" << PYEOF
import os
os.environ['SUPABASE_URL']    = '${SUPABASE_URL}'
os.environ['SUPABASE_KEY']    = '${SUPABASE_KEY}'
os.environ['SUPABASE_SCHEMA'] = '${SUPABASE_SCHEMA:-newsdash}'
os.environ['ELECTRA_MODEL']   = '${TARGET}'
os.environ['SAVE_MODEL']      = '1'
PYEOF
)
cat "$TEST_SCRIPT" >> "$TMP_SCRIPT"

# 세션은 다운로드 완료 후에만 종료한다 (trap에서 미리 죽이지 않음)
cleanup() { rm -f "$TMP_SCRIPT"; }
trap cleanup EXIT

log "Colab T4 프로비저닝 + 학습 (모델 저장 포함)..."
# --keep: 스크립트 후 VM 유지. --timeout 1800: 저장 단계 침묵 구간 대비.
# set -e 미적용이므로 여기서 타임아웃이 나도 다음 단계(다운로드)로 진행.
colab run --gpu T4 --keep --timeout 1800 -s "$SESSION_NAME" "$TMP_SCRIPT"
RUN_RC=$?
[ $RUN_RC -ne 0 ] && log "[주의] colab run rc=$RUN_RC (타임아웃 가능) — VM은 --keep으로 유지됨, 다운로드 시도"

# colab download의 두 가지 한계를 우회한다:
#   ① 디렉터리는 못 받는다       → 파일 목록을 colab ls로 받아 파일별로 받는다.
#   ② 큰 단일 파일은 OOM(rc=137) → 가중치는 VM에서 100MB로 쪼개 받아 합친다.

# 원격 대용량 파일을 100MB 단위로 분할해 받아 로컬에서 병합 (OOM 회피)
dl_split() {  # $1=원격파일  $2=로컬목적지
    local rf="$1" lf="$2" sp="/tmp/_split_$$.py" parts p
    # VM에서 분할 (shell=True 없이 리스트 인자 + glob 사용)
    cat > "$sp" << PY
import os, glob, subprocess
for old in glob.glob("/content/_dlpart_*"):
    os.remove(old)
subprocess.run(["split", "-b", "100m", "$rf", "/content/_dlpart_"], check=True)
print("PARTS " + " ".join(sorted(f for f in os.listdir("/content") if f.startswith("_dlpart_"))))
PY
    parts=$(colab exec -s "$SESSION_NAME" -f "$sp" 2>/dev/null | grep '^PARTS ' | cut -d' ' -f2-)
    rm -f "$sp"
    [ -z "$parts" ] && { log "[경고] $(basename "$rf") 분할 실패"; return 1; }
    : > "$lf"
    for p in $parts; do
        colab download -s "$SESSION_NAME" "/content/$p" "/tmp/$p" 2>/dev/null || true
        if [ -s "/tmp/$p" ]; then cat "/tmp/$p" >> "$lf"; rm -f "/tmp/$p"
        else log "[경고] 파트 $p 다운로드 실패"; return 1; fi
    done
    # VM 임시 파트 정리
    printf 'import glob, os\nfor f in glob.glob("/content/_dlpart_*"):\n    os.remove(f)\n' > "$sp"
    colab exec -s "$SESSION_NAME" -f "$sp" >/dev/null 2>&1; rm -f "$sp"
    return 0
}

log "원격 체크포인트 파일 목록 조회..."
# 디렉터리(끝에 / 표시)는 제외하고 일반 파일만 받는다.
FILES=$(colab ls -s "$SESSION_NAME" "$REMOTE_DIR" 2>/dev/null | grep -v '/$' | tr -d ' ' | grep -v '^$')
[ -z "$FILES" ] && log "[경고] 원격 파일 목록 조회 실패 — VM/세션 상태 확인"
for f in $FILES; do
    case "$f" in
        *.safetensors|pytorch_model*.bin)
            log "  ↓ $f (분할 다운로드)"
            dl_split "$REMOTE_DIR/$f" "$CKPT_DIR/$f" || log "[경고] $f 회수 실패"
            ;;
        *)
            log "  ↓ $f"
            colab download -s "$SESSION_NAME" "$REMOTE_DIR/$f" "$CKPT_DIR/$f" 2>/dev/null \
                || log "[경고] $f 다운로드 실패"
            ;;
    esac
done

log "세션 종료..."
colab stop -s "$SESSION_NAME" 2>/dev/null || true

# ── 검증 ──
log "=============================="
WEIGHTS=$(find "$CKPT_DIR" -name "*.safetensors" -o -name "pytorch_model*.bin" 2>/dev/null | head -1)
if [ -n "$WEIGHTS" ]; then
    SIZE=$(du -sh "$CKPT_DIR" 2>/dev/null | cut -f1)
    log "[성공] 체크포인트 저장됨 ($SIZE)"
    log "  경로: $CKPT_DIR"
    find "$CKPT_DIR" -maxdepth 1 -type f -printf '    %f (%s bytes)\n' 2>/dev/null | tee -a "$LOG_FILE"
else
    log "[실패] 가중치 파일 없음 — $LOG_FILE 확인"
fi

if [ -f "$CKPT_DIR/eval_report.json" ]; then
    uv run --project "$HOME/devs/github" - << PYEOF 2>/dev/null || true
import json
with open('$CKPT_DIR/eval_report.json') as f:
    r = json.load(f)
print(f"  모델: {r['model']}  F1={r['f1_macro']:.3f}  acc={r['accuracy']:.3f}")
for c, s in r.get('f1_per_class', {}).items():
    print(f"    {c:10s}: {s:.3f}")
PYEOF
fi
log "완료"
