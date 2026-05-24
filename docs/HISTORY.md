# HISTORY - news_dash

> 최근순 정렬

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
