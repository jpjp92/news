# 감성 분류 모델 학습 현황

> 마지막 업데이트: 2026-06-25

---

## 목적

Gemini API 의존을 줄이고 배치 처리 속도·비용을 개선하기 위해  
Supabase에 누적된 `article_summaries` 데이터로 로컬 한국어 감성 분류 모델을 파인튜닝한다.

---

## 현재 채택 모델

| 항목 | 값 |
|------|-----|
| 모델 | `klue/roberta-large` |
| 학습 방식 | 분류 헤드 파인튜닝 (SequenceClassification) |
| 레이블 | positive(0) · neutral(1) · negative(2) |
| 입력 | `title + " " + summary` (summary 없으면 title만) |
| 채택 근거 | 전체 실험 중 F1 macro 최고, neutral F1 가장 안정적 |

---

## 학습 파라미터 (현행)

```
모델       : klue/roberta-large
에포크     : 8
배치       : train=16, eval=32
학습률     : 2e-5
LR 스케줄  : cosine (v4b는 cosine_with_hard_restarts, cycles=2)
warmup     : 0.1 (10%)
weight_decay: 0.01
max_length : 128
fp16       : True (GPU 사용 시)
early_stop : patience=3 (metric: f1_macro)
클래스 가중치: 역빈도 (total / (3 × class_count))
레이블 스무딩: 0.0 (v4ab만 0.05)
train/val split: 85% / 15% (stratified, random_state=42)
```

### 실험 모드 설정 (`EXPERIMENTS` dict)

| 모드 키 | smoothing | scheduler | cycles |
|---------|-----------|-----------|--------|
| `v4b`   | 0.0 | cosine_with_restarts | 2 |
| `v4ab`  | 0.05 | cosine_with_restarts | 2 |

> **버그**: `EXPERIMENT=v2`로 실행하면 dict에 키가 없어 `v4b`로 폴백됨.  
> v2 설정(클래스 가중치만, 일반 cosine)을 dict에 명시 추가 필요.

---

## 전체 실험 비교

| 실험 | 모델 | 데이터 | 주요 설정 | Accuracy | F1 macro | neutral F1 |
|------|------|--------|-----------|----------|----------|------------|
| v1 | klue/roberta-base | 934건 | 베이스라인 | 82.3% | 0.815 | 0.680 |
| **v2** | klue/roberta-large | 934건 | large + 클래스 가중치 | **87.2%** | **0.871** | **0.795** |
| v3 | klue/roberta-large | 934건 | v2 + smoothing=0.1 + cosine | 87.2% | 0.863 | 0.767 |
| v4b | klue/roberta-large | 952건 | v2 + cosine_with_restarts | 86.7% | 0.864 | 0.795 |
| electra | KR-ELECTRA-discriminator | 952건 | 클래스 가중치, epochs=10 | 86.7% | 0.864 | 0.780 |
| kf-deberta | kakaobank/kf-deberta-base | ~1,024건 | 금융 DeBERTa-v2, 클래스 가중치 | 86.7% | 0.858 | 0.756 |
| finbert | snunlp/KR-FinBert-SC | ~1,024건 | 금융 뉴스 사전학습, 클래스 가중치 | 81.3% | 0.806 | 0.705 |

> v2 수치(0.871)는 커밋 전 로컬 실행 기록.  
> 실제 저장된 `202606/klue/eval_report.json` 수치는 F1=0.8627 (neutral=0.7671).  
> 스크립트 버전 차이로 인한 차이로 추정 — 재현 시 v2 dict 추가 후 확인 필요.
>
> ⚠️ **이 표는 파이프라인이 섞여 있다.** v1~v4b는 튜닝 파이프라인,
> electra/kf-deberta/finbert는 단순 CE이며 데이터 규모도 다르다.
> 백본 간 **공정 비교는 아래 "백본 비교 (A)" 표**를 볼 것.

### 클래스별 F1 상세 (저장된 json 기준)

| 실험 | positive F1 | neutral F1 | negative F1 |
|------|-------------|------------|-------------|
| 202606/klue (934건) | 0.926 | 0.767 | 0.895 |
| 202606/klue_v4b (952건) | 0.905 | 0.795 | 0.891 |
| electra (952건) | 0.932 | 0.781 | 0.879 |
| kf-deberta (~1,024건) | 0.917 | 0.756 | 0.902 |
| finbert (~1,024건) | 0.837 | 0.705 | 0.877 |

---

## 백본 비교 (2026-06-25)

뉴스 도메인 특화/대체 백본이 현행 klue/roberta-large를 넘는지 테스트.
**수치가 두 종류 섞여 있으니 반드시 구분해서 읽을 것.**

- **(A) 공정 비교** — 현재 ~1,024건, **동일 val split(150건)** + **동일 단순 CE 파이프라인**.
  백본만 다르므로 서로 직접 비교 가능. ← 신뢰 기준
- **(B) 운영 baseline** — 934건 + 튜닝 파이프라인(클래스가중치 + 레이블 스무딩 + cosine-restarts),
  F1 **0.871**. 데이터도 파이프라인도 달라 (A)와 직접 비교 불가.

### (A) 공정 비교 — 동일 데이터·동일 단순 CE 파이프라인

| 모델 | 도메인 | epochs | Acc | F1 macro | pos F1 | neu F1 | neg F1 |
|------|--------|--------|-----|----------|--------|--------|--------|
| **kf-deberta-base** | 금융 | 10 | 0.867 | **0.858** ★ | 0.917 | 0.756 | 0.902 |
| klue/roberta-large | 일반 | 8 | 0.840 | 0.833 | 0.896 | 0.729 | 0.874 |
| KR-ELECTRA | 일반 | 10 | 0.813 | 0.811 | 0.854 | 0.716 | 0.862 |
| KR-FinBert-SC | 금융 | 10 | 0.813 | 0.806 | 0.837 | 0.705 | 0.877 |

- **동일 조건에선 kf-deberta가 1위(0.858), roberta-large를 +0.025 앞섬.** 특히 negative F1 0.902 최고.
  당초 "백본 교체 무의미" 판단은 kf-deberta를 (B)의 0.871과 부당 비교한 오류였다.
- **ELECTRA·FinBert는 roberta 아래.** "ELECTRA도 나쁘지 않다"는 인상과 달리 동일 조건에선 3위.
  ELECTRA의 과거 neutral 우위(952건 split 0.781)도 현재 데이터에선 사라짐(0.716 < roberta 0.729).
- **KR-FinBert-SC는 최하위(0.806).** 금융 코퍼스 편향이 시사 전반 데이터에 오히려 손해.
- neutral은 전 모델 공통 약점이지만, 그중에서도 **kf-deberta가 가장 높다(0.756)**.
- ⚠️ val 150건이라 ±0.03 수준 노이즈 존재 → kf-deberta 우위는 "유망"이지 "확정"은 아님.

### (B) 운영 baseline과의 관계 · 다음 액션

- 운영 roberta-large(튜닝 파이프라인, 934건)는 0.871. 단순 CE roberta(0.833)보다 높음
  → **파이프라인 튜닝이 약 +0.04 기여.** 즉 백본보다 파이프라인 영향이 더 큼.
- kf-deberta는 아직 **단순 CE로만** 측정. 같은 튜닝 파이프라인(스무딩 + cosine-restarts +
  클래스가중치)을 적용하면 운영 baseline 0.871을 넘을 가능성 있음.
- **결론:** 백본은 무의미하지 않다. kf-deberta가 가장 유망.
  다만 ELECTRA/FinBert는 탈락 확정, 운영 교체 결정은 kf-deberta를 풀 파이프라인으로
  정식 학습한 뒤 roberta-large와 비교해 내린다. → **다음 재학습 1순위 과제.**

> 실행 메모: colab CLI는 모델 저장(`Writing model shards`) 중 출력이 멈추면
> websocket 응답 타임아웃으로 끊긴다. 비교 테스트는 `SAVE_MODEL=0`(기본)으로
> 저장을 건너뛰고, 결과 JSON을 stdout 마커(`===RESULT_JSON_START===`)로도 출력해
> 다운로드 실패 시 로그에서 회수한다. (`test_electra.py`)

---

## 데이터 현황

### 2026-06-25 기준

| 항목 | 수치 |
|------|------|
| 전체 기사 | 1,024건 |
| positive | 317건 (31%) |
| neutral | 298건 (29%) |
| negative | 385건 (38%) |
| 전체 세션 | 101건 (정상 69건) |

### 마지막 실험(2026-06-20) 이후 추가분

| 항목 | 수치 |
|------|------|
| 추가 세션 | 5개 |
| 추가 기사 | 90건 |
| 감성 분포 | pos=29 / neu=31 / neg=30 (거의 균등) |

> 2026-06-20에 Gemini 감성 프롬프트를 XML 구조 + 명시적 기준으로 개선.  
> 이후 수집 데이터는 레이블 일관성이 기존보다 높다.

---

## 레이블 품질 이슈

- 기존 934건: 감성 분류 기준 없이 Gemini 재량으로 레이블 부여 → neutral 집합이 가장 이질적
- 이것이 모든 실험에서 neutral F1이 가장 낮은 주 원인으로 추정
- 프롬프트 개선 이후 수집분은 균등 분포 확인 → 비율 증가할수록 neutral F1 개선 기대

---

## 재학습 기준 및 일정

| 단계 | 데이터 건수 | 예상 시점 | 비고 |
|------|------------|-----------|------|
| 중간 점검 | 1,500건 | 2026-07 중순 | 파라미터 탐색, 스무딩 재시도 |
| 본 재학습 | 2,000건 | 2026-08 중순 | 월간 cron 자동화 |

> 현재 페이스: 하루 약 18건 수집 → 1,500건까지 약 26일, 2,000건까지 약 54일

---

## 파일 구조

```
colab_training/
  train_sentiment.py     # 학습 메인 스크립트 (klue / gemma 모드)
  run_training.sh        # 월간 자동 실행 → checkpoints/ (가중치 보관)
  run_test_electra.sh    # 백본 비교 실험 → experiments/ (리포트만)
  save_checkpoint.sh     # 단일 백본 학습 + 체크포인트 보관 → checkpoints/
  run_test_gemma4.sh     # Gemma 4 테스트용
  test_electra.py        # 백본 독립 평가 (SAVE_MODEL=1 시 tar.gz 저장)
  test_gemma4.py         # Gemma 4 제로샷 테스트
  pyproject.toml         # uv 환경 설정

models/sentiment/
  experiments/<날짜>/<모델>/eval_report.json   # 비교 실험 (리포트만, git 커밋)
    2026-06-20/klue-roberta-large-v2, .../v4b
    2026-06-25/electra, finbert, roberta-large, kf-deberta
  checkpoints/<날짜>/<모델>/                    # 보관 체크포인트 (가중치 = 로컬 전용)
    2026-06-25/kf-deberta/
      model.safetensors, config.json, tokenizer.* (.gitignore 제외)
      eval_report.json (git 커밋)
```

### 경로 규칙 (2026-06-25 통일)

목적별로 분리한다. **experiments = 버리는 비교용(리포트만)**, **checkpoints = 보관용(가중치 포함)**.
각각 `<YYYY-MM-DD>/<모델>/` 순. (과거 `202606/klue`·`electra_*` 혼재 → 정리됨)

### 체크포인트 보관 정책

- 모델 가중치(`*.safetensors`, `*.bin`, tokenizer 바이너리)와 `checkpoints/` 하위 전체는
  **`.gitignore`로 git 제외** → **로컬에만 보관**. git에는 `eval_report.json`만 커밋된다.
- **회수 방식 (`save_checkpoint.sh`, 2026-06-25 확정):** `colab download`는
  ① 디렉터리를 못 받고 ② 큰 단일 파일은 OOM(rc=137)으로 죽는다. 그래서:
  1. `SAVE_MODEL=1`이면 `test_electra.py`가 모델을 `OUTPUT_DIR`에 저장하고
     **에포크별 `checkpoint-*` 디렉터리(각 ~700MB)를 삭제**해 최종 파일만 남긴다.
     (`save_total_limit=1`로 학습 중 누적도 방지)
  2. `save_checkpoint.sh`가 `colab ls`로 파일 목록을 받아 **파일별로** 다운로드한다.
     `*.safetensors`/`*.bin` 같은 대용량은 **VM에서 100MB로 분할(`split`)→ 받아서 병합**한다.
- **세션 종료 타이밍 주의:** 저장/다운로드 완료 전에 `colab stop` 또는 네트워크 끊김이
  발생하면 VM이 회수되어 가중치가 유실된다. `save_checkpoint.sh`는 `--keep`으로 VM을
  유지하고 다운로드 완료 후에만 종료한다.
  > 시행착오(2026-06-25): tar.gz 압축 방식은 `make_archive`가 에포크 체크포인트까지
  > 압축(~7GB)하다 정지 → 분할 다운로드 방식으로 교체.
- `run_training.sh`(운영 월간)도 가중치를 `checkpoints/<날짜>/<mode>_<exp>/`로 받는다.
  > 2026-06-25 이전 버그: `/content/news_sentiment`(리포트만)만 받아 가중치가 유실됐다.

---

## 다음 실험 후보

1. **kf-deberta 풀 파이프라인 정식 학습** — 공정 비교 1위(0.858). 튜닝 파이프라인
   (클래스가중치 + 스무딩 + cosine-restarts) 적용 시 운영 baseline 0.871 추월 가능성.
   **최우선 과제.** (`train_sentiment.py`에 kf-deberta 모드 추가 필요)
2. **neutral 레이블 재검수** — 백본 비교에서 neutral이 공통 천장(≤0.76)으로 확인됨.
   기존 934건 neutral 샘플 일부 수동 재라벨 후 영향 측정 (백본과 독립적인 레버)
3. **v2 dict 명시 추가** — `EXPERIMENT=v2`가 실제 v2 설정으로 실행되도록 수정
4. **smoothing=0.05 재시도** — 934건에서 효과 없었지만 1,500건 이상에서 재검증
5. **데이터 품질 분리 학습** — 프롬프트 개선 이전/이후 데이터 분리해 레이블 품질 영향 측정

### 검증 완료 (재시도 불필요)

- ~~KR-FinBert-SC~~ — 공정 비교 최하위(0.806). 금융 코퍼스 편향이 손해. 탈락
- ~~KR-ELECTRA 백본 교체~~ — 공정 비교 3위(0.811), roberta-large보다 −0.022. 탈락
- ~~앙상블 (roberta + ELECTRA)~~ — ELECTRA의 neutral 우위가 현재 데이터에서 사라져 명분 소멸. 보류
