# TODO — news_dash

> 우선순위 순 정렬 · 상태: 📋 계획 / ⏳ 전제조건 있음 / 💭 검토 중

> 주: 아래 항목은 Next.js 마이그레이션 이후 기준으로 다시 정리할 수 있다.

---

## 📋 기간 대비 변화 요약 추가

핵심 분석의 `오늘`, `7일`, `30일` 탭에 이전 기간 대비 변화를 요약한다.

**UI 표현:**
- 기사 수 증감: `+12%`, `-8%`
- 긍정 비율 증감: `+5%p`, `-3%p`
- 신규 급상승 키워드
- 감소 또는 사라진 키워드

**구현 내용:**
- `GET /api/history/compare?period=7d|30d`
- 현재 기간과 직전 동일 길이 기간을 비교
- Analytics 기간별 히스토리 뷰 상단에 요약 카드 추가

**영향 파일:**
- `server.ts`
- `src/components/Analytics.tsx`

---

## 📋 반복 키워드 랭킹 고도화

현재 반복 키워드는 등장 횟수 중심이다. 빈번하지만 중요도가 낮은 키워드가 상단에 나올 수 있다.

**개선 점수 예시:**
```ts
rankScore = appearance_count * 0.5 + avg_score * 0.4 + recencyScore * 0.1;
```

**구현 내용:**
- `GET /api/history/keywords` 응답에 `rank_score` 추가
- 등장 횟수, 평균 score, 최근성을 조합해 정렬
- UI에는 등장 횟수와 평균 점수를 함께 표시

**영향 파일:**
- `server.ts`
- `src/components/Analytics.tsx`

---

## 📋 최신뉴스 정렬 기준 고도화

현재 최신뉴스 `최신순/오래된순`은 세션 수집 시각(`collected_at`)과 `order_index`를 기준으로 정렬한다. 기사 원문 발행 시간이 없어서 같은 세션 안의 정확한 기사 발행순은 알 수 없다.

**구현 후보:**
- 네이버 목록에서 기사 발행 시각 파싱
- `article_summaries.published_at` 컬럼 추가
- 최신뉴스 정렬 기준을 `published_at -> collected_at -> order_index` 순으로 적용

**영향 파일:**
- `server.ts`
- Supabase `article_summaries` 테이블
- `src/components/Articles.tsx`

---

## 📋 확장 분석 필드 DB 정규화

현재 `trendDrivers`, `dominantIssue`, `reason`은 `news_sessions.raw_data.data`에서 복원한다. 최신 세션 표시에는 충분하지만, 기간별 분석에는 활용하기 어렵다.

**DB 후보:**
```sql
ALTER TABLE news_sessions ADD COLUMN trend_drivers jsonb;
ALTER TABLE category_stats ADD COLUMN dominant_issue text;
ALTER TABLE keyword_stats ADD COLUMN reason text;
```

**구현 내용:**
- `saveSessionToDb()`에서 확장 필드 별도 저장
- `/api/history/keywords`, `/api/history/category-totals`에서 확장 필드 반환
- Analytics 기간별 뷰에서도 토픽 이유와 카테고리 대표 이슈 표시

**영향 파일:**
- Supabase schema
- `server.ts`
- `src/components/Analytics.tsx`

---

## 📋 감성 계산 기준 통일

현재 화면마다 감성 계산 기준이 다르다.

- Dashboard 상단 카드: 기사 요약 기준
- Dashboard 감성 분포: 키워드 기준
- Analytics 기간 탭: 키워드 통계 기준

**개선 방향:**
- 화면 라벨에 기준을 명확히 표시
- 또는 공통 기준을 기사 기준/키워드 기준 중 하나로 통일
- `SentimentGauge`에 `basisLabel` prop 추가

**영향 파일:**
- `src/components/Dashboard.tsx`
- `src/components/SentimentGauge.tsx`
- `src/components/Analytics.tsx`

---

## 📋 AI 응답 실패 복구 개선

현재 JSON 파싱 실패 시 에러 세션으로 저장하고 화면에서는 숨긴다. 운영 관점에서는 실패 원인 추적과 자동 재시도가 필요하다.

**구현 내용:**
- 파싱 실패 시 1회 재요청
- 재요청 프롬프트는 더 짧은 JSON 스키마 사용
- 실패 응답 원문 길이 제한 저장
- Settings에 최근 AI 실패 로그 요약 표시

**영향 파일:**
- `server.ts`
- `src/components/Settings.tsx`

---

## 📋 Analytics 현재 세션 뷰 — 카테고리 집계 기간 선택

현재 `category-totals`는 `period=all` 고정으로 마운트 시 1회 로드.  
향후 "현재 세션" 뷰에서 기간 드롭다운(전체/7d/30d)을 추가해 카테고리 비중 필터링 가능하게 개선 가능.

---

## 📋 Vercel 환경변수 확인

Vercel 배포 시 아래 3개 환경변수가 설정되어 있어야 함. 누락 시 history API 전체 503 반환.

```
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_KEY   # service_role 키 (anon 키 불가)
```

---

## 📋 Settings 설정값 API 실제 반영

현재 Settings에서 저장한 값이 API 요청에 반영되지 않음.

**구현 내용:**
- `NewsContext.fetchData()`에서 `SettingsContext` 값 읽어 쿼리 파라미터로 전달
  ```
  /api/news-analysis?categories=정치,경제&limit=18&temperature=0.2
  ```
- `server.ts`: `req.query`에서 파라미터 파싱 후 크롤링 카테고리 필터링 + Gemini `temperature` 적용

**영향 파일:**
- `src/context/NewsContext.tsx` — fetchData() 수정
- `server.ts` — query 파라미터 처리 추가

---

## ⏳ Delta 증감 수치 UI (DB 2개 이상 세션 필요)

직전 세션 대비 증감을 스탯 카드 배지로 표시.

**UI 표현:**
- 증가: `↑ +X%` (green)
- 감소: `↓ -X%` (red)
- 변동 없음: 배지 숨김

**계산 로직:**
```ts
const delta = (curr: number, prev: number) =>
  prev === 0 ? null : ((curr - prev) / prev * 100).toFixed(1);
```

**구현 내용:**
- `GET /api/history/delta` — 직전 세션 vs 현재 세션 비교 API
- Dashboard 스탯 카드에 배지 추가

---

## 📋 모델별 성능 모니터링 (Settings 데이터 섹션)

Settings 페이지 데이터 관리 섹션에 모델별 에러율 표시.

```sql
SELECT model_used, COUNT(*) AS total,
  ROUND(AVG(CASE WHEN is_error THEN 0.0 ELSE 1.0 END) * 100, 1) AS success_rate_pct
FROM news_sessions GROUP BY model_used;
```

**구현 내용:**
- `GET /api/history/model-stats` — 모델별 성공률 반환
- Settings 데이터 섹션에 테이블로 표시

---

## 💭 자동 스케줄 크롤링 (Vercel Cron Job)

현재: 수동 새로고침 시에만 크롤링.  
목표: 하루 1회 자동 수집.

**고려사항:**
- Vercel Cron: `vercel.json`에 `crons` 설정
- 네이버 크롤링 부하 및 Gemini API 사용량 한도 확인 필요
- 모델은 `GEMINI_MODELS` 환경변수로 조정 가능

**구현 예시:**
```json
// vercel.json
{
  "crons": [{ "path": "/api/cron/daily-collect", "schedule": "0 9 * * *" }]
}
```

---

## 💭 기사 원문 본문 저장

현재: 기사 제목·요약·URL만 저장. 원문 본문은 저장하지 않음.

**고려사항:**
- 본문 크롤링 시 각 기사 URL 개별 fetch → 요청 수 대폭 증가
- Supabase 저장 용량 증가
- 추후 RAG 기반 Q&A 기능 도입 시 필요

---

## 💭 검색어 히스토리 DB 동기화

현재: 최근 검색어를 `localStorage`에만 저장.  
목표: Supabase `user_searches` 테이블로 동기화 (세션 간 유지).  
전제: 사용자 인증 기능 추가 후 구현 가능.
