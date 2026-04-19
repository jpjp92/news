# Future Plans — news_dash

> 작성일: 2026-04-19

---

## 1. 데이터 누적 & DB 연결

### 현재 방식
- 새로고침 버튼을 누를 때마다 실시간 크롤링 → Gemini 분석 → 응답 반환
- 이전 데이터를 보관하지 않음 (stateless)

### 목표
- 크롤링 결과를 DB에 누적 저장 → 시계열 분석 가능
- 새로고침 시 "오늘 수집분"을 DB에 upsert

### DB 방안 — Supabase 확정

| 항목 | 값 |
|------|-----|
| **Project name** | poc-test |
| **Project URL** | https://iljfnveffqeshylumdcl.supabase.co |
| **환경변수** | `.env`에 설정 완료 |

→ Supabase로 확정. `.env`에 `SUPABASE_URL`, `SUPABASE_KEY` 설정됨.

### 저장 스키마 및 쿼리

> 마지막 검토: 2026-04-19 — 장기 추적 적합성 검토 완료

```sql
-- ① 수집 세션 테이블
CREATE TABLE news_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  article_count INT,
  overall_trend TEXT,
  model_used    TEXT,
  is_error      BOOLEAN     NOT NULL DEFAULT FALSE,  -- 파싱 실패 세션 구분
  error_msg     TEXT,                                -- 에러 내용 기록
  raw_data      JSONB                                -- 전체 API 응답 백업
);

-- ② 카테고리별 집계
CREATE TABLE category_stats (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID  NOT NULL REFERENCES news_sessions(id) ON DELETE CASCADE,
  category      TEXT  NOT NULL,
  count         INT   NOT NULL DEFAULT 0,
  avg_sentiment FLOAT
);

-- ③ 키워드
CREATE TABLE keyword_stats (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID  NOT NULL REFERENCES news_sessions(id) ON DELETE CASCADE,
  keyword    TEXT  NOT NULL,
  score      FLOAT NOT NULL DEFAULT 0,  -- Gemma 소수점 반환 가능 → FLOAT
  sentiment  TEXT  CHECK (sentiment IN ('positive', 'neutral', 'negative'))  -- NOT NULL 제거: Gemma 예외 응답 대비
);

-- ④ 기사 요약
CREATE TABLE article_summaries (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID  NOT NULL REFERENCES news_sessions(id) ON DELETE CASCADE,
  title           TEXT  NOT NULL,
  summary         TEXT,
  category        TEXT,
  url             TEXT,
  sentiment       TEXT  CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score FLOAT  -- Gemma 소수점 반환 가능 (예: 72.5)
);

-- 인덱스 (시계열 조회 + 키워드 추적 + JOIN 최적화)
CREATE INDEX idx_news_sessions_collected_at   ON news_sessions(collected_at DESC);
CREATE INDEX idx_news_sessions_model          ON news_sessions(model_used);
CREATE INDEX idx_category_stats_session       ON category_stats(session_id);
CREATE INDEX idx_category_stats_session_cat   ON category_stats(session_id, category);
CREATE INDEX idx_keyword_stats_session        ON keyword_stats(session_id);
CREATE INDEX idx_keyword_stats_keyword        ON keyword_stats(keyword);      -- 키워드 시계열 추적
CREATE INDEX idx_article_summaries_session    ON article_summaries(session_id);
CREATE INDEX idx_article_summaries_url        ON article_summaries(url);      -- 중복 기사 탐색

-- 키워드 장기 트렌드 View (에러 세션 자동 제외)
CREATE VIEW keyword_trends AS
SELECT
  k.keyword,
  k.sentiment,
  COUNT(*)                                          AS appearance_count,
  ROUND(AVG(k.score)::NUMERIC, 1)                  AS avg_score,
  MAX(s.collected_at)                               AS last_seen,
  MIN(s.collected_at)                               AS first_seen,
  COUNT(*) FILTER (WHERE k.sentiment = 'positive') AS pos_count,
  COUNT(*) FILTER (WHERE k.sentiment = 'negative') AS neg_count
FROM keyword_stats k
JOIN news_sessions s ON s.id = k.session_id
WHERE s.is_error = FALSE
GROUP BY k.keyword, k.sentiment;
```

### 주요 쿼리 예시

```sql
-- 최근 10개 세션 목록 (에러 포함)
SELECT id, collected_at, article_count, model_used, is_error
FROM news_sessions
ORDER BY collected_at DESC
LIMIT 10;

-- 특정 세션의 키워드 TOP 5
SELECT keyword, score, sentiment
FROM keyword_stats
WHERE session_id = '<session_id>'
ORDER BY score DESC
LIMIT 5;

-- 직전 세션 대비 기사 수 delta 계산
SELECT
  curr.article_count AS current,
  prev.article_count AS previous,
  curr.article_count - prev.article_count AS delta
FROM news_sessions curr
JOIN news_sessions prev
  ON prev.collected_at = (
    SELECT MAX(collected_at)
    FROM news_sessions
    WHERE collected_at < curr.collected_at
      AND is_error = FALSE
  )
WHERE curr.is_error = FALSE
ORDER BY curr.collected_at DESC
LIMIT 1;

-- 7일간 긍정 키워드 비율 추이
SELECT
  DATE_TRUNC('day', s.collected_at) AS day,
  ROUND(
    COUNT(*) FILTER (WHERE k.sentiment = 'positive')::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS positive_pct
FROM news_sessions s
JOIN keyword_stats k ON k.session_id = s.id
WHERE s.collected_at >= NOW() - INTERVAL '7 days'
  AND s.is_error = FALSE
GROUP BY 1
ORDER BY 1;

-- 최근 30일 핫 키워드 TOP 10 (keyword_trends View 활용)
SELECT keyword, appearance_count, avg_score, pos_count, neg_count
FROM keyword_trends
WHERE last_seen >= NOW() - INTERVAL '30 days'
ORDER BY appearance_count DESC, avg_score DESC
LIMIT 10;

-- 주간 카테고리별 평균 감성 트렌드
SELECT
  DATE_TRUNC('week', s.collected_at) AS week,
  c.category,
  ROUND(AVG(c.avg_sentiment)::NUMERIC, 1) AS weekly_avg_sentiment,
  SUM(c.count) AS total_articles
FROM news_sessions s
JOIN category_stats c ON c.session_id = s.id
WHERE s.is_error = FALSE
  AND s.collected_at >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2
ORDER BY 1, 2;

-- 모델별 에러율 (모델 로테이션 품질 모니터링)
SELECT
  model_used,
  COUNT(*) AS total,
  SUM(CASE WHEN is_error THEN 1 ELSE 0 END) AS errors,
  ROUND(AVG(CASE WHEN is_error THEN 0.0 ELSE 1.0 END) * 100, 1) AS success_rate_pct
FROM news_sessions
GROUP BY model_used
ORDER BY total DESC;
```

### DB 저장 시 주의사항

- `avg_sentiment`, `score`, `sentimentScore`는 Gemma가 문자열로 반환할 수 있음 → 저장 전 `parseFloat()` 필수
- `is_error = TRUE`인 세션은 분석 쿼리에서 자동 제외 (`keyword_trends` View 포함)
- 에러 fallback 데이터는 DB에 저장하지 않거나, `is_error = TRUE`로 저장 후 UI에서 필터링

---

## 2. Delta 증감 수치 (UI 카드 배지)

### 목표
스탯 카드에 전일/이전 수집분 대비 증감 표시
- 예: 기사 수 `↑ +12.4%`, 긍정 비율 `↑ +3.2%`

### 전제 조건
- DB 누적 저장이 완료된 이후 구현 가능
- 직전 세션 데이터와 현재 세션 비교

### 계산 방식 (초안)
```ts
// 현재 세션 vs 직전 세션
const delta = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / previous * 100).toFixed(1);
```

### UI 표현
- 증가: `↑ +X%` (green)
- 감소: `↓ -X%` (red)
- 변동 없음: 배지 숨김

---

## 3. 크롤링 정책

- **트리거**: 수동 새로고침 버튼 클릭 시에만 실행
- **자동 수집 없음** (서버 비용, 네이버 크롤링 부하 고려)
- 추후 고려: 하루 1회 스케줄 크롤링 (Vercel Cron Job)

---

---

## 4. Supabase 실행 이력

### ✅ 최종 스키마 적용 완료 (2026-04-19)

초기 테이블 생성 후 장기 추적 적합성 검토 결과 누락 컬럼/인덱스 발견 → 전체 DROP 후 검토 완료된 스키마로 재생성.
현재 `section 1`의 스키마가 Supabase에 적용된 최신 상태.

**확인된 이슈 및 조치:**
- `model_used`, `is_error`, `error_msg` 컬럼 초기 누락 → 재생성으로 해결
- `keyword_stats.sentiment NOT NULL` 위험 → NOT NULL 제거
- 인덱스 5개 누락 → 재생성 시 포함
- `keyword_trends` View 미생성 → 재생성 시 포함
- RLS(Row Level Security) anon 키로 INSERT 차단 → `service_role` 키로 교체

---

## 5. UI 정리 — 불필요 요소 제거 (2026-04-19)

### ✅ 완료

| 위치 | 요소 | 조치 |
|------|------|------|
| Header | Bell 알림 버튼 + 빨간 뱃지 | 제거 완료 |
| Header | 아바타 이미지 | 제거 완료 |
| Sidebar 하단 | LogOut 버튼 | 제거 완료 |
| Sidebar 하단 | Settings | `activeTab = 'settings'` 연결 완료 |

---

## 6. Settings 페이지 (2026-04-19)

### ✅ 구현 완료

**파일:**
- `src/components/Settings.tsx` — 4섹션 설정 UI
- `src/context/SettingsContext.tsx` — 설정값 전역 관리 + localStorage 동기화

**섹션:**

| 섹션 | 항목 | 구현 상태 |
|------|------|-----------|
| 화면 | 라이트/다크 토글 | ✅ 헤더와 동기화 |
| 뉴스 수집 | 관심 카테고리 (6개) | ✅ localStorage 저장 |
| 뉴스 수집 | 세션당 기사 수 슬라이더 (6~30) | ✅ localStorage 저장 |
| AI 모델 | 현재 모델 표시 (읽기 전용) | ✅ |
| AI 모델 | Temperature 슬라이더 (0~1) | ✅ localStorage 저장 |
| 데이터 관리 | Supabase 연결 상태 배지 | ✅ |
| 데이터 관리 | 최근 검색어 초기화 버튼 | ✅ |

**미연동 항목 (향후):**
- 카테고리 필터 / 기사 수 / Temperature 설정값이 실제 API 요청에 반영되지 않음
- 구현 시: `/api/news-analysis?categories=정치,경제&limit=18&temperature=0.2` 형태로 전달

---

## 7. 데이터 조회 & Analytics 기간별 UI (2026-04-19)

### ✅ 구현 완료

**서버 추가 API:**

| 엔드포인트 | 파라미터 | 반환 |
|-----------|---------|------|
| `GET /api/history/sessions` | `period=today\|7d\|30d` | 세션 목록 (수집시각, 기사수, 모델, 에러여부) |
| `GET /api/history/keywords` | `period=7d\|30d` | 반복 키워드 TOP 20 (등장횟수, 평균점수, 감성) |
| `GET /api/history/sentiment` | `period=7d\|30d` | 일별 긍정/부정/중립 비율 |

**중복 세션 방지:**
- 새로고침 시 직전 세션과 URL 70% 이상 겹치면 DB 저장 생략
- Gemma 분석과 중복 체크를 `Promise.all`로 병렬 실행 → 응답 지연 없음

**Analytics 탭 구성:**

| 탭 | 내용 |
|----|------|
| 현재 세션 | 기존 실시간 분석 (주요 토픽 카드, 카테고리 비중, 트렌드 차트) |
| 오늘 | 오늘 수집 세션 목록 + 반복 키워드 + 감성 추이 |
| 7일 | 7일 세션 목록 + 반복 키워드 TOP 20 + 일별 감성 stacked bar |
| 30일 | 30일 세션 목록 + 반복 키워드 TOP 20 + 일별 감성 추이 |

**키워드 순위 정렬 수정:**
- 기존: Gemma 반환 순서 그대로 표시 (score와 순위 불일치)
- 수정: `score` 내림차순 정렬 → 01번이 실제 최고점 키워드

---

## 우선순위

| 작업 | 상태 |
|------|------|
| UI 개선 (다크모드 + 컴포넌트) | 🔨 진행 중 |
| DB 연결 (Supabase) | ✅ 완료 (`@supabase/supabase-js` 연동, `saveSessionToDb` 구현) |
| 데이터 누적 저장 | ✅ 완료 (새로고침 시 자동 저장) |
| UI 불필요 요소 제거 | ✅ 완료 (Bell 버튼, LogOut 버튼 제거) |
| Settings 페이지 구현 | ✅ 완료 (화면/수집/AI모델/데이터 4섹션) |
| 중복 세션 저장 방지 | ✅ 완료 (URL 70% 이상 겹치면 DB 저장 생략) |
| 히스토리 API 3개 | ✅ 완료 (`/api/history/sessions|keywords|sentiment`) |
| Analytics 기간별 UI | ✅ 완료 (현재세션 / 오늘 / 7일 / 30일 탭) |
| Delta 증감 수치 UI | ⏳ DB 누적 후 구현 가능 |
| 자동 스케줄 크롤링 | 💭 검토 중 |
