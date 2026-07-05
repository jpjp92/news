# TODO - news_dash

> 기준일: 2026-05-24
> 상태: `[Planned]` 구현 예정, `[Blocked]` 전제조건 필요, `[Idea]` 검토 후보

## High Priority

### [Planned] 기간 대비 변화 요약 추가

핵심 분석의 `오늘`, `7일`, `30일` 탭에서 현재 기간과 직전 동일 기간을 비교한다.

표시 후보:

- 기사 수 증감: `+12%`, `-8%`
- 긍정 비율 증감: `+5%p`, `-3%p`
- 신규 급상승 키워드
- 감소하거나 사라진 키워드

구현 범위:

- `GET /api/history/compare?period=today|7d|30d` 추가
- `src/lib/server/newsService.ts`에 기간 비교 집계 함수 추가
- `src/components/Analytics.tsx` 상단에 요약 카드 추가

### [Planned] 반복 키워드 랭킹 고도화

현재 반복 키워드는 `appearance_count` 중심이라 빈번하지만 중요도가 낮은 키워드가 상단에 노출될 수 있다.

개선 방향:

```ts
rankScore = appearance_count * 0.5 + avg_score * 0.4 + recencyScore * 0.1;
```

구현 범위:

- `GET /api/history/keywords` 응답에 `rank_score` 추가
- 등장 횟수, 평균 점수, 최근성을 조합해 정렬
- UI에는 등장 횟수, 평균 점수, 랭킹 근거를 함께 표시

### [Planned] 감성 계산 기준 통일

현재 화면마다 감성 기준이 다르다.

- Dashboard 상단 카드: 기사 요약 기준
- Dashboard 감성 분포: 키워드 기준
- Analytics 기간 탭: 키워드 통계 기준

개선 방향:

- 화면 라벨에 기준을 명확히 표시
- 또는 공통 기준을 기사 기준/키워드 기준 중 하나로 통일
- `src/components/SentimentGauge.tsx`에 `basisLabel` prop 추가 검토

### [Planned] 최신뉴스 정렬 기준 고도화

현재 최신뉴스 정렬은 세션 수집 시각(`collected_at`)과 `order_index` 기준이다. 기사 원문 발행 시각이 없어 같은 세션 안의 실제 발행순은 정확히 알 수 없다.

구현 후보:

- 네이버 목록에서 기사 발행 시각 파싱
- `article_summaries.published_at` 컬럼 추가
- 정렬 기준을 `published_at -> collected_at -> order_index` 순서로 적용

영향 범위:

- Supabase `article_summaries` 테이블
- `src/lib/server/newsService.ts`
- `src/components/Articles.tsx`

## Medium Priority

### [Planned] UI 개편 후 시각 검증 정리

2026-07-05 Warm Swiss 하이브리드 UI를 1차 적용했다. 기능 동작은 유지했지만, 실제 사용 데이터 기준의 시각 검증이 남아 있다.

확인 범위:

- Dashboard, Articles, Analytics, Settings의 light/dark mode 비교
- 390px 모바일, 1280px 노트북, 1440px 이상 데스크톱 레이아웃
- 긴 기사 제목, 긴 카테고리명, URL 없는 기사, 빈 데이터, 로딩, 에러 상태
- 차트 색상 대비와 tooltip 가독성
- 다크모드에서 amber/teal accent가 과하거나 부족하지 않은지 확인

완료 기준:

- 텍스트 겹침/잘림 없이 주요 정보가 먼저 보임
- light/dark mode가 같은 제품 톤으로 인식됨
- 남은 purple/indigo 계열이 의도치 않게 강조색으로 보이지 않음

### [Planned] 확장 분석 필드 DB 정규화

현재 `trendDrivers`, `dominantIssue`, `reason`은 `news_sessions.raw_data.data`에서 복원한다. 최신 세션 표시에는 충분하지만 기간별 분석에는 활용하기 어렵다.

DB 변경 후보:

```sql
ALTER TABLE news_sessions ADD COLUMN trend_drivers jsonb;
ALTER TABLE category_stats ADD COLUMN dominant_issue text;
ALTER TABLE keyword_stats ADD COLUMN reason text;
```

구현 범위:

- `saveSessionToDb()`에서 확장 필드 별도 저장
- `getLatestSession()`, `getKeywords()`, `getCategoryTotals()`에서 확장 필드 반환
- Analytics 기간별 뷰에서도 토픽 이유와 카테고리 대표 이슈 표시

### [Planned] AI 응답 실패 복구 개선

현재 JSON 파싱 실패 시 에러 세션으로 저장하고 UI에서는 빈 분석에 가까운 메시지를 보여준다. 운영 관점에서는 실패 원인 추적과 자동 복구가 필요하다.

구현 범위:

- 파싱 실패 시 1회 재요청
- 재요청 프롬프트는 더 짧은 JSON 스키마 사용
- 실패 응답 원문은 길이 제한 후 저장
- Settings 화면에 최근 AI 실패 로그 요약 표시

### [Planned] Settings 데이터 섹션에 모델별 성능 표시

Settings 화면에서 모델별 성공률과 에러율을 확인할 수 있게 한다.

```sql
SELECT model_used, COUNT(*) AS total,
  ROUND(AVG(CASE WHEN is_error THEN 0.0 ELSE 1.0 END) * 100, 1) AS success_rate_pct
FROM news_sessions
GROUP BY model_used;
```

구현 범위:

- `GET /api/history/model-stats` 추가
- `src/components/Settings.tsx` 데이터 관리 섹션에 테이블 추가

### [Planned] Dashboard 직전 세션 대비 delta 표시

직전 정상 세션과 최신 세션을 비교해 스탯 카드에 증감 배지를 표시한다.

표시 후보:

- 증가: `up +X%`
- 감소: `down -X%`
- 변동 없음: 배지 숨김

구현 범위:

- `GET /api/history/delta` 추가
- Dashboard 스탯 카드에 delta 배지 추가

## Operations

### [Planned] Vercel 환경변수 점검

운영 배포 시 아래 환경변수가 설정되어 있어야 한다.

```bash
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite
```

누락 시 Gemini 분석 또는 history API가 정상 동작하지 않는다.

### [Idea] 자동 스케줄 크롤링

현재는 사용자가 새로고침하거나 최신 세션이 없을 때만 수집한다. 하루 1회 자동 수집이 필요하면 Vercel Cron을 검토한다.

구현 후보:

```json
{
  "crons": [{ "path": "/api/cron/daily-collect", "schedule": "0 9 * * *" }]
}
```

고려사항:

- 네이버 크롤링 부하
- Gemini API 사용량
- 중복 세션 저장 방지 정책
- Cron 호출 인증 또는 secret 검증

## Backlog

### [Idea] 기사 원문 본문 저장

현재는 기사 제목, 요약, URL만 저장한다. RAG 기반 Q&A 또는 원문 근거 표시가 필요해지면 본문 저장을 검토한다.

고려사항:

- 기사 URL별 추가 fetch로 요청 수 증가
- Supabase 저장 용량 증가
- 언론사별 본문 DOM 구조 차이
- 저작권 및 원문 보관 정책

### [Blocked] 검색어 히스토리 DB 동기화

현재 최근 검색어는 `localStorage`에만 저장한다. 사용자 인증이 추가되면 Supabase `user_searches` 테이블로 동기화할 수 있다.

전제조건:

- 사용자 인증 도입
- 사용자별 데이터 분리 정책 결정
- 검색어 삭제/초기화 UX 확정
