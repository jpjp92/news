# TODO - news_dash

> 기준일: 2026-05-24
> 상태: `[Planned]` 구현 예정, `[Blocked]` 전제조건 필요, `[Idea]` 검토 후보

## High Priority

### [Planned] 반복 키워드 랭킹 고도화

현재 반복 키워드는 `appearance_count`와 `avg_score` 중심이라 빈번하지만 중요도가 낮은 키워드가 상단에 노출될 수 있다. Analytics는 TOP 20까지 표시하지만, 정렬 공식은 아직 단순하다.

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

### [Planned] 최신뉴스 서버 검색 고도화

현재 Sidebar 검색은 전역 검색어를 설정한 뒤 최신뉴스 탭에서 로드된 기사 목록을 클라이언트 필터링한다. 데이터가 많아지면 서버에서 검색어를 받아 필요한 기사만 조회하는 방식이 필요하다.

구현 후보:

- `GET /api/history/articles?period=today|7d|30d|all&q=...` 지원
- 제목, 요약, 카테고리 기준 검색
- 검색어가 있을 때는 최신뉴스 진입 시 기본 기간을 `today`로 유지할지 `all`로 확장할지 UX 검토
- 검색 결과 수와 적용 기간을 UI에 명확히 표시

## Medium Priority

### [Planned] 날씨 API KMA/OpenWeather 하이브리드 전환

현재 날씨 탭은 OpenWeather 기반이다. 2026-07-05 로컬 검증 결과, 한국 도시는 기상청 API(KMA), 해외 도시는 OpenWeather를 사용하는 하이브리드 구조가 적합하다.

구현 정책:

- 한국 도시: KMA 우선
- 해외 도시: OpenWeather 사용
- KMA 실패: OpenWeather fallback
- 환경변수는 `KMA_API_KEY`만 사용 (`MA_API_KEY` legacy fallback 없음)
- KMA API Hub에서 필요한 엔드포인트를 개별 활용신청해야 함
  - 미신청 API는 403 응답을 반환하므로 운영 환경 키의 신청 범위 확인 필요
- 초기 KMA 호출 조합: `getUltraSrtNcst + getVilageFcst + getLandFcst`
- 중기예보(`getMidTa`, `getMidLandFcst`)는 단기예보가 5일을 채우지 못할 때만 backfill
- 현재 UI는 유지하고 API 응답만 기존 `WeatherData` 계약에 맞게 정규화

검증 결과:

- `getVilageFcst`가 주요 병목이며 약 1.2초
- 단기예보만으로 서울 기준 5~6일치 예보 확보 가능
- 전체 KMA 풀 조합도 병렬 호출 시 약 1.2초였지만 호출 수가 많아 초기 구현에는 과함
- KMA는 기압, 가시거리, 돌풍 값이 부족하므로 UI에서 `-` 표시 보정 필요

구현 범위:

- `app/api/weather/route.ts`에 KMA provider 추가
- 국내 도시 alias에 `nx`, `ny`, `shortRegId`, `midTempRegId`, `midLandRegId`, `midStnId`, `openWeatherQuery` 추가
- KMA category 코드(`T1H`, `TMP`, `SKY`, `PTY`, `POP`, `REH`, `WSD`, `TMN`, `TMX`)를 UI 필드로 변환
- `source`에 `KMA` 또는 `OpenWeather` 표시
- KMA 값 없음 필드의 UI 표시 보정

### [Planned] 날씨 도시명 정규화 Gemini fallback

날씨 탭은 현재 주요 도시 한글 alias와 OpenWeather Geocoding API를 우선 사용한다. alias와 geocoding으로 해결되지 않는 자연어 입력은 Gemini fallback을 검토한다.

대상 입력 예:

- `스페인 수도`
- `LA`
- `호치민 근처`
- `제주도 남쪽`

구현 방향:

- `resolveCity()`의 최후 단계로 Gemini 도시명 정규화 호출
- 결과는 `{ city, countryCode, confidence }` 형태의 짧은 JSON으로 제한
- confidence가 낮으면 사용자에게 영어 도시명 입력 안내
- 자주 성공한 입력은 alias 목록에 편입

### [Planned] 날씨 도시 alias 확장

현재 alias는 주요 국내/해외 도시 중심이다. 사용 로그를 기준으로 자주 실패하는 한글 도시명을 추가한다.

확장 후보:

- 국내: 안양, 안산, 평택, 천안, 원주, 순천, 경주, 진주
- 해외: 리스본, 이스탄불, 두바이, 뭄바이, 델리, 멕시코시티, 상파울루

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
OPENWEATHER_API_KEY=...
KMA_API_KEY=...
```

누락 시 Gemini 분석, history API 또는 날씨 탭이 정상 동작하지 않는다. 한국 도시 KMA 조회는 `KMA_API_KEY`가 필요하며, 해외 도시 및 fallback은 `OPENWEATHER_API_KEY`가 필요하다.

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
