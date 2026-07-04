# HISTORY - news_dash

> 최근순 정렬

## 2026-07-04

### 뉴스 원문 링크 및 최근 DB 수집 데이터 정리

#### 변경 파일

- `src/lib/server/newsService.ts`
- `src/components/Articles.tsx`
- `src/components/Dashboard.tsx`

#### 변경 내용

- 네이버 섹션 수집 시 원문 기사 URL만 정규화해 저장하도록 수정
  - 빈 URL, `#`, `search.naver.com`, `/search/` URL 제외
  - 상대경로는 `https://news.naver.com` 기준으로 절대 URL 변환
- Gemini 프롬프트 출력 스키마에서 `url` 요구 제거
  - 모델이 임의 URL 또는 검색 URL을 만들지 않도록 변경
  - 분석 결과 저장 전 수집 원본 `rawHeadlines` 기준으로 기사 URL을 다시 붙임
- `Articles` 화면에서 URL이 없을 때 네이버 검색 링크로 이동하던 폴백 제거
  - URL 없는 과거 데이터는 `원문 링크 없음`으로 표시
- 최근 DB 데이터 점검 및 정리
  - `article_summaries.url` 누락 건 중 `raw_data.rawHeadlines` 제목과 정확히 매칭되는 108건 백필
  - 최근 데이터의 검색 URL 저장 건 0건 확인
  - 실제 기사 행 수와 `news_sessions.article_count`가 어긋난 세션을 실제 행 수 기준으로 보정
  - 삭제된 일부 `category_stats`, `keyword_stats`는 `raw_data.data`에서 복구
- 저장 로직 안정화
  - 중복 URL로 기사 insert가 생략된 경우 실제 insert 기사 수로 `article_count` 보정
  - 실제 기사 수가 0건이면 category/keyword 통계 insert 생략
  - 중복 세션 판정과 history 조회 함수들이 `article_count > 0` 세션만 사용하도록 정리
- Gemini 응답 안정화
  - `maxOutputTokens`를 6000에서 12000으로 상향
  - JSON 파싱 실패 시 다음 모델로 분석 재시도
- Dashboard 빈 상태 설명 문구를 짧게 조정
- `30일` 이후 데이터까지 확인할 수 있도록 Articles/Analytics 기간 탭과 history API에 `전체` 기간 추가

#### 검증

- `npm run lint` 통과
- 2026-07-03 이후 표시 대상 세션의 `article_count`와 실제 기사 행 수 불일치 0건 확인

---

## 2026-06-29

### Header 스크롤 시각 부담 완화 및 탭 전환 UX 개선

#### 변경 파일

- `src/components/Header.tsx`
- `src/App.tsx`

#### 변경 내용

- Header의 glass card 배경, blur, border, shadow를 별도 조정해 스크롤 화면에서 과하게 진하게 보이는 느낌 완화
- Header 하단에 `mb-3` 여백을 추가해 콘텐츠와 붙어 보이는 현상 개선
- 메인 스크롤 컨테이너에 ref를 연결하고, 탭 전환 시 `scrollTop = 0`으로 초기화
- 최신 뉴스 화면 진입 시 이전 탭의 스크롤 위치가 유지되어 카드가 Header 아래에서 잘려 보이던 UX 개선

---

## 2026-06-25

### Dashboard 빈 상태 카드 모바일 레이아웃 수정

`src/components/Dashboard.tsx`

"표시할 분석 데이터가 아직 없습니다" 카드의 재시도 버튼이 모바일에서 세로로 밀려 내려가는 문제 수정.

- `items-start` → `items-center` — 텍스트·버튼 수직 가운데 정렬로 한 줄 유지
- 제목 `text-xs md:text-sm`, 설명 `text-[10px] md:text-xs` 로 폰트 축소
- 설명 문구에 `line-clamp-1`, 제목에 `truncate` 추가 — 긴 텍스트가 버튼을 밀지 않도록
- 버튼 `shrink-0` + `whitespace-nowrap` — 오른쪽 고정, 줄바꿈 방지
- 버튼 패딩·폰트 축소: `px-2.5 py-1.5 text-[11px] md:text-xs`

---

### 위험도 높은 안정성 이슈 일괄 수정

#### 변경 파일

- `app/api/history/sessions/route.ts`
- `app/api/history/articles/route.ts`
- `app/api/history/keywords/route.ts`
- `app/api/history/sentiment/route.ts`
- `app/api/history/category-totals/route.ts`
- `app/api/history/stats/route.ts`
- `app/api/history/latest-session/route.ts`
- `src/lib/server/newsService.ts`
- `src/components/Analytics.tsx`
- `src/components/Articles.tsx`
- `src/components/Dashboard.tsx`

#### 수정 내용 (위험도 순)

**[1] history route 7개 — try/catch 없음**

서비스 함수가 throw하면 Next.js가 500 HTML을 반환하고, 프론트 `.json()` 파싱 실패로 무음 실패하는 구조였음.
전체 handler에 try/catch를 추가하고 예외 발생 시 `{ success: false }` JSON을 500으로 반환.

**[2] period 파라미터 검증 없음**

`period` 쿼리스트링을 검증 없이 서비스 함수로 전달하던 구조 수정.
각 route에 허용값 Set을 선언하고, 벗어난 값이 오면 400 반환.

| route | 허용 period |
|-------|-------------|
| sessions | `today`, `7d`, `30d` |
| articles | `today`, `7d`, `30d` |
| keywords | `7d`, `30d` |
| sentiment | `7d`, `30d` |
| category-totals | `all`, `today`, `7d`, `30d` |
| stats, latest-session | 파라미터 없음 |

**[3] Naver fetch 타임아웃 없음**

섹션별 `fetch()`에 `AbortSignal.timeout(10_000)` 추가.
네이버가 응답하지 않을 경우 Vercel 함수 타임아웃(300s) 전체를 소진하던 문제 방지.

**[4] Analytics/Articles 프론트 res.ok 체크 없음**

`Analytics.tsx` 마운트 fetch와 기간 탭 fetch, `Articles.tsx` DB 기사 fetch 모두 `res.ok` 체크 없이 `.json()` 호출.
HTTP 500/503 응답 시 body 파싱 실패 가능. `r.ok` 검사 추가 후 상태코드별 한국어 에러 메시지 표시.

**[5] Analytics 히스토리 에러 시 재시도 버튼 없음**

에러 카드를 보여줘도 사용자가 할 수 있는 액션이 없었음.
`retryKey` state를 추가해 기간 탭 fetch useEffect의 의존성에 포함.
에러 카드에 "다시 시도" 버튼을 추가해 클릭 시 `retryKey` 증가 → 재요청.

**[6] Dashboard 에러카드 데드코드 제거**

`error.includes('API key not valid')` 분기가 남아 있었으나, 이전 에러처리 개선으로 에러 메시지는 `getHttpErrorMessage()` 한국어 안내문으로 바뀌어 절대 매칭되지 않음. 분기 제거 후 `error`를 직접 표시하는 단순 카드로 정리.

---

### API 에러 처리 강화 및 사용자 친화적 에러 메시지

#### 변경 파일

- `src/lib/server/newsService.ts`
- `app/api/news-analysis/route.ts`
- `src/context/NewsContext.tsx`

#### 문제 상황

- Gemini API 429/503 발생 시 다른 모델로 재시도 없이 바로 전체 분석 실패
- 네이버 크롤링에서 HTTP 오류 응답(503 등)을 `response.ok` 체크 없이 그대로 파싱 시도
- route.ts가 모든 예외를 HTTP 500으로 반환 — 클라이언트가 에러 종류 구분 불가
- 프론트 `NewsContext`가 `res.ok` 미체크 상태에서 `.json()` 호출, HTTP 에러 메시지를 그대로 노출

#### 변경 내용

**`newsService.ts`**

- `isRetryableError()` 추가 — 429/503/rate_limit/resource_exhausted/overloaded 패턴 감지
- `callGeminiWithRetry()` 추가 — 설정된 모델 목록(`GEMINI_MODELS`) 순서대로 순차 재시도
  - 현재 모델 실패 시 다음 모델(기본: flash → flash-lite, 또는 그 반대)로 자동 폴백
  - 재시도 불가 에러(파싱 오류 등)는 즉시 throw
  - 모든 모델 소진 시 `httpStatus: 503` 포함 에러 throw
- 네이버 fetch에 `response.ok` 체크 추가 — 503 등 HTTP 에러 시 해당 섹션 skip 후 계속 진행

**`app/api/news-analysis/route.ts`**

- catch 블록에서 `error.httpStatus`를 그대로 응답 status로 전달
- 429면 HTTP 429, 503이면 HTTP 503 반환 — 클라이언트가 에러 종류 구분 가능
- 에러 원문은 서버 로그에만 기록, 응답 body에는 `{ success: false, httpStatus }` 만 포함

**`src/context/NewsContext.tsx`**

- `getHttpErrorMessage(status)` 추가 — HTTP 상태코드별 한국어 안내 메시지 매핑

  | 상태 | 메시지 |
  |------|--------|
  | 429 | AI 분석 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요. |
  | 503 | AI 서비스가 일시적으로 점검 중입니다. 잠시 후 다시 시도해주세요. |
  | 500 이상 | 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요. |
  | 네트워크 단절 | 네트워크 연결을 확인해주세요. |

- `requestFreshAnalysis()` — fetch 자체 실패와 `res.ok` 실패를 각각 처리, 에러 시 구조화된 객체 반환
- `initialize()` — `latest-session` 조회 실패 시 에러 표시 없이 신규 수집으로 진행

---

## 2026-06-20

### Gemini 감성 분류 프롬프트 개선

`src/lib/server/newsService.ts`의 뉴스 분석 프롬프트를 XML 태그 구조로 재작성.

#### 변경 이유

파인튜닝 실험(934건) 결과 neutral F1이 0.680~0.795로 가장 낮음.
원인 분석 결과 학습 데이터 레이블 품질 문제 확인:
- 기존 프롬프트에 감성 분류 기준이 전혀 없어 Gemini 재량으로 레이블 부여
- positive/negative/neutral 정의 없이 `"sentiment": "positive/negative/neutral"` 한 줄뿐
- neutral이 "기준 미달 잔여 범주"로 처리되어 가장 이질적인 집합이 됨

#### 변경 내용

| 항목 | 이전 | 이후 |
|------|------|------|
| 프롬프트 구조 | 마크다운 `##` 헤더 | XML 태그 (`<role>`, `<sentiment_criteria>` 등) |
| 감성 기준 | 없음 | positive/negative/neutral 각각 구체적 기준 명시 |
| sentimentScore | 예시 50 하나 | 1~100 구간별 의미 정의 |
| 헤드라인 포맷 | `[Category: ...] [title](url)` | `<item index="N" category="...">title</item>` |
| 출력 지시 | 영어 혼재 | `<output_rules>`, `<output_schema>` 분리 |

#### 감성 분류 기준 요약

- **positive**: 경제 지표 개선, 기업 호재, 사회 긍정, 분쟁 해결·타결
- **negative**: 경제 지표 악화, 기업 악재, 사고·범죄·피해·논란, 위기 격화
- **neutral**: 단순 사실 보도, 결과 미확정 정책 발표, 양면적 내용, 분류 불가

#### 기대 효과

신규 수집 세션부터 개선된 기준으로 레이블 부여.
데이터 2000건 이상 누적 후 v2 재학습 시 neutral F1 개선 예상.

---

### 감성 분류 모델 실험 (Colab CLI + T4 GPU)

### 감성 분류 모델 실험 (Colab CLI + T4 GPU)

뉴스 대시보드에 축적된 `article_summaries` 데이터(934건)를 활용해 로컬 감성 분류 모델을 실험.
현재 Gemini API 의존을 줄이고 배치 처리 속도·비용을 개선하는 것이 목표.

#### 데이터 현황

| 항목 | 수치 |
|------|------|
| 전체 기사 | 934건 |
| 감성 레이블 | 934건 (100%) |
| positive | 299건 |
| neutral | 272건 |
| negative | 363건 |
| 수집 세션 | 64건 |

#### 실험 1 — KLUE-RoBERTa-base 파인튜닝 (베이스라인)

- 모델: `klue/roberta-base`
- 설정: epochs=5, lr=3e-5, batch=32
- GPU: Colab T4

| 클래스 | F1 |
|--------|----|
| positive | 0.920 |
| neutral | 0.680 |
| negative | 0.840 |
| **F1 macro** | **0.815** |
| **Accuracy** | **82.3%** |

→ neutral이 가장 약함. 클래스 불균형 원인.

#### 실험 2 — Gemma 제로샷 비교 (실패)

- 모델: `google/gemma-4-E2B-it-qat-mobile-transformers`
- 결과: Accuracy 29.1%, F1 0.150 — 전부 neutral로만 예측
- 원인: QAT mobile 전용 포맷으로 `AutoModelForCausalLM` 가중치 불일치, 실질적으로 랜덤 가중치로 추론

#### 실험 3 — Gemma 4 4B-it 제로샷

- 모델: `google/gemma-4-E4B-it` (`AutoModelForMultimodalLM`)
- VRAM: 7.7GB (T4 16GB 내 적재)
- 결과: Accuracy 29.1%, F1 0.150 — 동일하게 전부 neutral로만 예측
- 원인: 프롬프트 응답 파싱 문제. 생성 결과 첫 단어만 추출하는 방식이 Gemma 4 응답 형식과 불일치

#### 실험 4 — KLUE-RoBERTa-large + 클래스 가중치 (최종)

- 모델: `klue/roberta-large` (base → large 업그레이드)
- 개선 사항:
  - `roberta-large` (파라미터 3배)
  - 역빈도 클래스 가중치 (neutral 보정)
  - learning rate `3e-5 → 2e-5`, epochs `5 → 8`
  - Rich 터미널 진행 표시 (epoch별 loss/acc/F1 실시간 테이블)
- GPU: Colab T4, batch=16, fp16

| 클래스 | Precision | Recall | F1 |
|--------|-----------|--------|----|
| positive | 0.953 | 0.911 | **0.932** |
| neutral | 0.745 | 0.854 | **0.795** |
| negative | 0.922 | 0.855 | **0.887** |
| **F1 macro** | | **0.872** | **0.871** |
| **Accuracy** | | | **87.2%** |

#### 실험 5 — 레이블 스무딩 + Cosine Scheduler

- 추가 적용: 레이블 스무딩 0.1 + `lr_scheduler_type=cosine`
- 가설: 경계 모호한 neutral 과적합 방지 + LR 부드러운 감소로 수렴 개선

| 클래스 | F1 |
|--------|----|
| positive | 0.926 |
| neutral | 0.767 |
| negative | 0.895 |
| **F1 macro** | **0.863** |
| **Accuracy** | **87.2%** |

→ 실험 4(v2) 대비 소폭 하락. 934건 규모에서는 스무딩 0.1이 클래스 가중치 효과를 희석시킴.
  데이터 2000건 이상일 때 재시도 예정.

#### 실험 6 — Cosine with Hard Restarts (v4b)

- 설정: v2 + `get_cosine_with_hard_restarts_schedule_with_warmup` (2 cycles)
- `create_scheduler` 오버라이드로 구현 (TrainingArguments에 직접 전달 불가)
- 결과: F1 macro 0.864 — v2 대비 소폭 하락

| 클래스 | F1 |
|--------|----|
| positive | - |
| neutral | 0.795 |
| negative | - |
| **F1 macro** | **0.864** |
| **Accuracy** | **86.7%** |

→ Cosine restarts도 v2 개선 효과 없음. 934건 규모에서 스케줄러 변형보다 클래스 가중치 자체가 지배적.

#### 실험 7 — KR-ELECTRA-discriminator

- 모델: `snunlp/KR-ELECTRA-discriminator` (base 110M, discriminator 헤드)
- 설정: batch=32, lr=3e-5, epochs=10, 역빈도 클래스 가중치 (v2와 동일)
- 실행: `colab run --keep` (T4)
- 완료 시각: 2026-06-20 04:58

| 클래스 | F1 |
|--------|----|
| positive | 0.932 |
| neutral | 0.780 |
| negative | 0.879 |
| **F1 macro** | **0.864** |
| **Accuracy** | **86.7%** |

→ v2(roberta-large) 대비 F1 -0.007, Accuracy -0.005. neutral F1도 0.795 → 0.780으로 소폭 하락.
  ELECTRA base(110M)가 roberta-large(336M) 대비 불리하며, 파라미터 규모 차이가 주된 요인으로 추정.

#### 전체 실험 비교

| 실험 | 모델 | 주요 변경 | Accuracy | F1 macro | neutral F1 |
|------|------|-----------|----------|----------|------------|
| v1 | klue/roberta-base | 베이스라인 | 82.3% | 0.815 | 0.680 |
| **v2** | klue/roberta-large | large + 클래스 가중치 | **87.2%** | **0.871** | **0.795** |
| v3 | klue/roberta-large | v2 + 스무딩0.1 + cosine | 87.2% | 0.863 | 0.767 |
| v4b | klue/roberta-large | v2 + cosine_with_restarts | 86.7% | 0.864 | 0.795 |
| electra | KR-ELECTRA-discriminator | 클래스 가중치 (base 110M) | 86.7% | 0.864 | 0.780 |

**현재 최고: v2** — 월간 재학습 기본 설정으로 채택

**소견**: 934건 규모에서 스케줄러 변형·스무딩·아키텍처 변경은 모두 v2보다 하락. 클래스 가중치 + roberta-large 조합이 현 데이터에서 최적.  
**다음 실험 후보**: 데이터 2000건 도달 시 앙상블(v2 + ELECTRA) 또는 스무딩 0.05 재시도.

#### 인프라 구성

- `colab_training/train_sentiment.py` — 학습 스크립트 (klue/gemma 모드)
- `colab_training/run_training.sh` — 월간 자동 실행 (T4 고정, .env 로드)
- `colab_training/test_gemma4.py` — Gemma 4 전용 테스트 스크립트
- `colab_training/pyproject.toml` — uv 환경 (`~/devs/github` 워크스페이스)
- 결과 저장: `models/sentiment/YYYYMM/{mode}/eval_report.json`
- cron 등록 예정: 매월 1일 03:00

## 2026-05-29

### Supabase 프로젝트 이전

- 신규 Supabase 프로젝트에 `newsdash` 스키마를 생성하고 뉴스 관련 테이블을 동일 명으로 구성
- 이전 대상은 `news_sessions`, `category_stats`, `keyword_stats`, `article_summaries`, `keyword_trends`로 제한
- `pages`, `workspaces`, `workspace_members`는 뉴스 데이터 이전 범위에서 제외
- 실수로 생성했던 public 뉴스 테이블을 정리할 수 있는 cleanup SQL 추가
- `newsdash` 스키마를 Supabase Data API exposed schemas에 추가해 REST 접근 가능하도록 설정

### 마이그레이션 스크립트

- `scripts/migrate-supabase.mjs` 추가
- source는 기존 `public` 스키마, target은 신규 `newsdash` 스키마를 기본값으로 사용
- dry-run과 apply 모드를 분리하고, 타겟 테이블이 비어 있지 않으면 기본적으로 중단하도록 구성
- 필수값 누락, 에러 세션, 불완전 세션, URL 없는 기사, 중복 URL 기사를 이전 대상에서 제외
- 중복 URL 기사는 최신 수집 세션의 기사 1건만 유지
- `news_sessions.article_count`를 실제 이전된 기사 기준으로 재계산

### 데이터 이전 결과

- `news_sessions`: 76건 중 52건 이전, 24건 제외
- `category_stats`: 264건 이전
- `keyword_stats`: 240건 이전
- `article_summaries`: 778건 중 720건 이전, 58건 제외
- 최종 target `newsdash` 카운트는 `news_sessions=52`, `category_stats=264`, `keyword_stats=240`, `article_summaries=720`

### 환경변수 전환

- 로컬 `.env`의 `SUPABASE_URL`, `SUPABASE_KEY`를 신규 Supabase 프로젝트 값으로 전환
- 마이그레이션용 `SUPABASE_URL2`, `SUPABASE_KEY2`는 로컬 `.env`에서 제거
- Vercel 환경변수도 동일하게 `SUPABASE_URL`, `SUPABASE_KEY`를 신규 프로젝트 값으로 갱신해야 함

### UI 개선

- 앱 전역 스크롤바를 얇은 반투명 indigo/purple 계열 디자인으로 변경
- 스크롤바 트랙은 투명하게 유지하고 hover 시 thumb 대비만 강화
- 라이트/다크 모드별 스크롤바 색상을 각각 조정
- 대시보드의 실시간 인기 키워드 패널 높이를 최근 뉴스 요약 영역보다 과도하게 늘어나지 않도록 제한
- 실시간 인기 키워드는 5개 항목 기준으로 노출하고, 초과 항목은 패널 내부 스크롤로 확인하도록 변경
- 핵심분석 페이지의 주요 토픽 분석을 점수순 Top 5 기본 노출 구조로 정리
- 주요 토픽 6번째 이후 항목은 접기/펼치기 가능한 내부 스크롤 영역에서 확인하도록 변경
- 주요 토픽 분석 상단에 전체 토픽 수와 긍정/부정/중립 개수 요약을 추가
- 모바일 대시보드의 헤더, 통계 카드, 뉴스 요약, 카테고리 분포, 인기 키워드 영역 폰트 크기와 여백을 축소
- 모바일에서 `카테고리별 기사 수 및 감성` 차트 제목, 부제, 범례가 과도하게 커지지 않도록 반응형 폰트 크기 조정
- 최신뉴스 페이지는 모바일에서 10개씩, 데스크톱에서는 기존 30개씩 페이지 단위로 표시하도록 변경
- 최신뉴스 페이지네이션 안내 문구가 현재 화면 크기의 페이지 단위에 맞춰 자동으로 표시되도록 변경

## 2026-05-24

### 문서 정리

- 루트 `README.md`를 현재 Next.js 구조 기준으로 재정리
- `docs/TODO.md`를 우선순위별 남은 작업 목록으로 재작성
- `docs/HISTORY.md`에 최근 변경 요약과 대시보드/분석 개선 이력을 통합
- `docs` 경로의 보조 Markdown 문서를 `TODO.md`, `HISTORY.md`로 단순화

### Next.js App Router 마이그레이션

- Vite + Express 구조를 Next.js 15 App Router + Route Handler 구조로 전환
- 프론트 진입점을 `app/page.tsx`, `app/layout.tsx`로 이동
- API를 `app/api/**/route.ts` 구조로 이동
- 서버 비즈니스 로직을 `src/lib/server/newsService.ts`로 분리
- Vercel 배포 설정을 `framework=nextjs`로 단순화

### 초기 진입 UX 개선

- 대시보드 첫 진입 시 최신 정상 세션을 우선 로드
- 최신 세션이 없거나 데이터가 비어 있으면 자동으로 분석 1회 실행
- 빈 상태 카드와 즉시 분석 버튼 추가
- 분석 실패 시 사용자에게 명확한 메시지 표시

### 최신 뉴스 페이지 개선

- 기사 목록을 30개 단위로 페이지네이션
- 검색, 감성, 카테고리, 정렬 조건 변경 시 페이지를 1로 초기화
- 오늘 DB 데이터가 없으면 현재 세션 결과로 자동 폴백
- 최신순/오래된순 정렬을 `collected_at`과 `order_index` 기준으로 처리

### 개발 서버 안정화

- `npm run dev` 실행 시 3000 포트를 고정 사용
- 3000 포트가 이미 사용 중이면 3001로 자동 전환하지 않고 즉시 실패
- 개발 서버와 브라우저가 서로 다른 포트를 바라보는 문제 방지

### 로그 체계화

- `src/lib/server/logger.ts`에 서버 전용 로거 추가
- API 요청과 실패 지점을 구조화해 기록
- `logs/news_dash.log`에 개발 로그 기록
- `instrumentation.ts`는 console-only로 유지해 dev 시작 오류 방지

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-05-16

### Dashboard & Analytics 개선

- 대시보드와 핵심 분석 화면의 역할을 명확히 분리
- 대시보드는 최신 세션의 핵심 상황을 빠르게 파악하는 화면으로 정리
- 핵심 분석은 현재 세션과 기간별 누적 흐름을 비교하는 화면으로 정리

### 차트 mock 데이터 제거

- `src/components/TrendChart.tsx`에서 mock fallback 제거
- 데이터가 없으면 실제 차트 대신 빈 상태 메시지 표시
- 차트 제목, 부제, 범례 라벨을 호출부에서 지정할 수 있게 개선

### Dashboard 지표 기준 정리

- 긍정/부정 비율을 `keyTopics` 기준에서 `summaries` 기사 요약 기준으로 변경
- 라벨을 `기사 긍정 비율`, `기사 부정 비율`로 변경
- 카테고리 차트 제목을 `카테고리별 기사 수 및 감성`으로 변경
- 동적 Tailwind 클래스(`bg-${color}`)를 정적 class map으로 변경

### AI 분석 스키마 확장

- `trendDrivers` 필드 추가
- `categories[].dominantIssue` 필드 추가
- `keyTopics[].reason` 필드 추가
- `normalizeAnalysis()`로 배열, 숫자, 감성값, 빈 키워드, 최대 개수 제한을 보정

### 분석 근거 표시

- 대시보드 전체 트렌드 아래에 `trendDrivers`를 해시태그 형태로 표시
- 주요 카테고리 분포에 `dominantIssue` 표시
- 핵심 분석 주요 토픽 카드에 `reason` 표시
- 카테고리별 비중에 평균 감성 점수 표시

### 최신뉴스 UI와 정렬 개선

- 카테고리/감성 필터 라벨 폰트 기준 통일
- 카테고리 필터는 줄바꿈 대신 가로 스크롤 유지
- 기사 카드 카테고리 배지를 한 줄 유지하도록 개선
- `/api/history/articles` 응답에 `collected_at`, `order_index` 추가

### 핵심 분석 노이즈 제거

- `/api/history/sessions`에서 `is_error = false` 세션만 반환
- 기사 수가 0인 세션은 세션 목록에서 제외
- 프론트에서도 `article_count > 0`으로 방어 필터 적용
- 세션 목록의 `파싱 오류` 표시 분기 제거

### 일별 감성 추이 표시 개선

- `session_count > 0`인 항목만 표시
- 긍정/부정/중립 합계가 0보다 큰 항목만 표시
- 목록 영역에 내부 스크롤 적용

### 데이터 저장 방식

- DB 스키마 변경 없이 기존 테이블 구조 유지
- 확장 필드는 `news_sessions.raw_data.data`에 보존
- `/api/history/latest-session`에서 raw data를 읽어 확장 필드 복원

### 검증

- `npm run lint` 통과

## 2026-04-22

### 중복 데이터 처리 강화

- `saveSessionToDb()`에서 `article_summaries` insert 전 기존 URL 사전 조회
- 이미 저장된 URL은 insert를 생략해 누적 중복 저장 차단
- 중복 URL 생략 로그 추가

### 중복 세션 판단 임계값 강화

- `isDuplicateSession()` URL overlap 임계값을 70%에서 85%로 상향
- 15% 이상 신규 URL이 있어야 새 세션으로 저장
- 중복 세션 과다 생성을 줄이도록 조정

### 기사 조회 중복 제거 개선

- `/api/history/articles` 중복 제거 기준을 title 중심에서 URL 우선으로 변경
- URL이 없는 기사만 title 기준으로 폴백 처리

### `today` 기간 타임존 버그 수정

- `getPeriodStart('today')`를 KST 자정 기준으로 계산하도록 변경
- Supabase/Vercel UTC 환경에서 오전 9시 이전 수집 기사가 오늘 탭에서 누락되는 문제 수정

## 2026-04-19

### Analytics 카테고리별 비중 개선

- 단일 세션 기반 표시에서 전체 `category_stats` 누적 합계 기반 표시로 변경
- 카테고리명 옆에 총 기사 수와 비율을 함께 표시
- DB 로드 전에는 기존 단일 세션 데이터 fallback 유지

### Analytics 트렌드 오버뷰 차트 개선

- 단일 세션 카테고리별 차트에서 최근 7일 날짜별 시계열 차트로 변경
- 수집 세션 수와 긍정 비율을 함께 표시
- 현재 세션 탭에서도 마운트 시 7일 트렌드 데이터 자동 로드

### 신규 API

- `GET /api/history/category-totals?period=all|today|7d|30d`

### Dashboard 초기 로드 개선

- 마운트 시 `fetchData()`로 매번 크롤링하던 흐름을 최신 DB 세션 우선 로드로 변경
- 새로고침 버튼만 실제 크롤링과 Gemini 분석을 실행
- `collectedAt` 상태 추가
- Dashboard 헤더에 수집 시점 표시

### 신규 API

- `GET /api/history/latest-session`

### 모바일 사이드바 드로어

- 모바일 전용 오버레이 드로어 추가
- 백드롭 탭 시 닫힘 처리
- 메뉴 항목 선택 시 자동 닫힘 처리
- 데스크탑 사이드바 동작은 유지

### Articles 탭 DB 기반 전환

- 현재 세션 메모리 데이터 중심에서 기간별 DB 조회 구조로 전환
- 기간 탭 추가: 현재 세션, 오늘, 7일, 30일
- 새로고침 후 DB 재로드 흐름 추가
- 헤더에 세션 수와 총 기사 수 표시

### Dashboard 주간/월간 통계 카드

- 주간/월간 수집 기사 수, 세션 수, 긍정 비율 카드 추가
- 카드 클릭으로 Analytics 탭 이동
- `GET /api/history/stats` 추가

### 히스토리 API 추가

- `GET /api/history/articles?period=today|7d|30d`
- `GET /api/history/stats`
- `GET /api/history/sessions?period=today|7d|30d`
- `GET /api/history/keywords?period=7d|30d`
- `GET /api/history/sentiment?period=7d|30d`

### Settings 페이지 추가

- `src/components/Settings.tsx` 추가
- `src/context/SettingsContext.tsx` 추가
- 화면, 뉴스 수집, AI 모델, 데이터 관리 섹션 구성
- 설정값 localStorage 동기화

### Supabase 연동

- `@supabase/supabase-js` 설치
- 세션, 카테고리, 키워드, 기사 테이블 저장 구현
- 에러 세션은 `is_error = true`로 저장
- 주요 시계열/키워드/JOIN 최적화 인덱스 설계

### AI 모델과 파싱 안정화

- Gemini/Gemma 계열 모델 로테이션 구조 추가
- JSON 응답 파싱 보정 함수 `extractAndFixJson()` 추가
- 파싱 실패 시 에러 세션 저장 및 UI 안내 메시지 표시
- 키워드 순위를 score 내림차순으로 정렬

### UI 정리

- Dashboard 섹션 헤더 폰트 통일
- Dashboard 최근 뉴스 요약 헤더 모바일 표시 개선
- 모바일 진입 시 사이드바가 닫힌 상태로 시작하도록 수정
- Articles 필터 UI 통합 및 모바일 크기 조정
- Header의 Bell 알림 버튼과 아바타 이미지 제거
- Sidebar의 LogOut 버튼 제거 및 Settings 연결

## 2026-04-15

### 타입 정합성 확보

- `NewsAnalysis` 인터페이스에 `averageSentiment`, `sentiment`, `sentimentScore` 추가
- 서버 응답과 프론트 타입을 맞춰 감성 필터 정상화

### 보안 수정

- `vite.config.ts` `define`에서 `GEMINI_API_KEY` 클라이언트 번들 노출 제거

### 환경변수 로딩 개선

- `.env.local` 이후 `.env` 순서로 환경변수를 로드하도록 정리

### 개발 방식 정리

- Express + Vite 통합 구조와 `vercel dev` 충돌을 확인
- 로컬 개발 명령을 `npm run dev`로 통일

## 2026-03-15

### Vercel 서버리스 배포 안정화

- `@vercel/static-build`와 `@vercel/node` 혼합 구성으로 배포 안정화
- Vite lazy loading으로 서버리스 500 에러 해결

### 라이트 모드 대비 개선

- 흰색 배경에서 텍스트 가독성 문제가 발생하던 영역의 색상 대비 수정

### Tailwind v4 다크 모드

- selector 방식으로 설정
- 테마 토글 일관성 확보

### AI 감성 분석 고도화

- 프롬프트 상세화로 긍정/부정/중립 분류 정확도 개선
- 감성 점수 1~100 범위 도입

## 프로젝트 초기

- React 19 + Vite + Express 기반 프로젝트 구성
- 네이버 뉴스 6개 섹션 크롤링 구현
- Google Gemini AI 연동 및 한글 로컬라이징
- 다크/라이트 모드와 Glassmorphism UI 구성
- NewsContext, ThemeContext 전역 상태 관리
- 검색, 감성 필터, 최근 검색어 기능 구현
