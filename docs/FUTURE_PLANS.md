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

```sql
-- ① 수집 세션 테이블
CREATE TABLE news_sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  article_count INT,
  overall_trend TEXT,
  model_used   TEXT,
  raw_data     JSONB       -- 전체 API 응답 백업
);

-- ② 카테고리별 집계
CREATE TABLE category_stats (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID  NOT NULL REFERENCES news_sessions(id) ON DELETE CASCADE,
  category     TEXT  NOT NULL,
  count        INT   NOT NULL DEFAULT 0,
  avg_sentiment FLOAT
);

-- ③ 키워드
CREATE TABLE keyword_stats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES news_sessions(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  score      INT  NOT NULL DEFAULT 0,
  sentiment  TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative'))
);

-- ④ 기사 요약
CREATE TABLE article_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES news_sessions(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  summary         TEXT,
  category        TEXT,
  url             TEXT,
  sentiment       TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score INT
);

-- 인덱스 (시계열 조회용)
CREATE INDEX idx_news_sessions_collected_at ON news_sessions(collected_at DESC);
CREATE INDEX idx_keyword_stats_session     ON keyword_stats(session_id);
CREATE INDEX idx_category_stats_session    ON category_stats(session_id);
```

### 주요 쿼리 예시

```sql
-- 최근 10개 세션 목록
SELECT id, collected_at, article_count, model_used
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
  )
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
GROUP BY 1
ORDER BY 1;
```

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

## 우선순위

| 작업 | 상태 |
|------|------|
| UI 개선 (다크모드 + 컴포넌트) | 🔨 진행 중 |
| DB 연결 (Supabase) | 📋 계획 |
| 데이터 누적 저장 | 📋 계획 |
| Delta 증감 수치 UI | ⏳ DB 완료 후 |
| 자동 스케줄 크롤링 | 💭 검토 중 |
