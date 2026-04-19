# 개발 이력 — news_dash

> 최근순 정렬

---

## 2026-04-19 (4차)

### Analytics 카테고리별 비중 — 전체 DB 누적 기반으로 변경
- 기존: 단일 세션(최대 18개 기사, 카테고리당 ~3개) 기반 → 항상 균등하게 표시됨
- 변경: 전체 `category_stats` 누적 합계 기반으로 표시 → 300여개 실제 분포 반영
- 카테고리명 옆에 총 기사 수 + 비율(%) 함께 표시
- DB 로드 전(초기 상태)은 기존 단일 세션 데이터 fallback 유지

### Analytics 트렌드 오버뷰 차트 — 시계열 기반으로 변경
- 기존: 단일 세션 카테고리별 count + averageSentiment를 x축 카테고리명으로 표시 → 트렌드 차트에 맞지 않는 구조
- 변경: 최근 7일 날짜별 수집 세션 수 + 긍정 비율 시계열 차트
- "현재 세션" 탭에서도 마운트 시 자동으로 7d 트렌드 데이터 로드

### 신규 API
- `GET /api/history/category-totals?period=all|today|7d|30d` — 카테고리별 전체 기사 수 누적 집계 반환

---

## 2026-04-19 (3차)

### Dashboard 섹션 헤더 폰트 통일
- 카드 섹션 헤더 불일치 수정 (`text-lg`, `text-base` 혼재)
- 전체 뉴스 트렌드 분석 / 최근 뉴스 요약 / 주요 카테고리 분포 → `text-sm` 통일
- 실시간 인기 키워드 / 감성 분포는 이미 `text-sm` → 5개 섹션 헤더 일관성 확보

### Dashboard 최근 뉴스 요약 헤더 모바일 개선
- 제목·버튼 영역이 모바일에서 두 줄로 나뉘던 문제 수정
- "전체 기사 보기" → "전체 기사"로 단축, `whitespace-nowrap` 추가
- "축소하기" → "축소"로 단축, 아이콘 `size={16}` → `size={13}`

### 모바일 사이드바 초기 상태 수정
- 기존: `sidebarOpen = true` → 모바일 진입 시 드로어가 즉시 펼쳐진 상태
- 변경: `useState(() => window.innerWidth >= 768)` → 모바일은 닫힘, 데스크탑은 열림으로 시작

---

## 2026-04-19 (2차)

### Dashboard 초기 로드 개선 — DB 최신 세션 자동 표시
- 기존: 마운트 시 `fetchData()` 호출 → 매번 크롤링 + Gemma 분석 실행
- 변경: 마운트 시 `/api/history/latest-session` 호출 → DB 최신 세션 즉시 표시
- 새로고침 버튼만 실제 크롤링 실행
- `collectedAt` 필드 추가 → Dashboard 헤더에 "4/19 14:30 수집" 형태로 수집 시점 표시
- `NewsContext`에 `collectedAt` 상태 추가

### 신규 API
- `GET /api/history/latest-session` — 최신 비에러 세션의 categories·keywords·articles 조합 반환

### 모바일 사이드바 드로어
- 기존: Sidebar `hidden md:flex` — 모바일에서 완전히 숨겨짐, 햄버거 버튼 동작 안 함
- 변경: 모바일 전용 오버레이 드로어 추가 (`fixed inset-0 z-50`)
  - 백드롭(반투명 오버레이) 탭 시 드로어 닫힘
  - 메뉴 항목 선택 시 자동 닫힘 (`handleNav`)
  - 데스크탑 사이드바(`hidden md:flex`)는 기존 동작 유지

### Articles 모바일 필터 UI 개선
- 감성 필터 버튼 4개가 모바일에서 세로 2줄로 표시되던 문제 수정
- 버튼 패딩 `px-3 py-1.5` → `px-2 py-1`, 폰트 `text-xs` → `text-[11px]`
- 아이콘 `size={12}` → `size={11}`, 간격·라벨 너비 축소
- 기사 수 카운트 `flex-shrink-0` 추가

---

## 2026-04-19 (1차)

### Articles 탭 DB 기반 전환
- 기존: `NewsContext.data.summaries` (현재 세션 메모리만 표시)
- 변경: 기간 탭 (현재 세션 / 오늘 / 7일 / 30일) 추가, 오늘 이후는 DB에서 조회
- 제목 기준 중복 기사 제거
- 새로고침 시 크롤링 후 DB 재로드 (`fetchData()` → `refreshKey` 증가)
- 헤더에 세션수·총 기사수 표시, 필터 우측에 현재 기사 수 표시

### Dashboard 주간·월간 통계 카드
- 4개 스탯 카드 하단에 주간·월간 카드 2개 추가
- 각 카드: 수집 기사수 / 세션수 / 긍정비율
- 화살표 클릭 → Analytics 탭 이동
- API: `GET /api/history/stats` (주간·월간 동시 반환)

### 신규 API
- `GET /api/history/articles?period=today|7d|30d` — DB 기사 조회, 중복 제거
- `GET /api/history/stats` — 주간·월간 집계 통계

### Articles 필터 UI 통합
- 카테고리(rounded-full)·감성(rounded-xl) 분리 → GlassCard 하나로 통합, 동일 스타일(rounded-lg)

### Analytics 기간별 UI
- 탭: 현재 세션 / 오늘 / 7일 / 30일
- 세션 목록 / 반복 키워드 TOP 20 / 일별 감성 stacked bar

### 히스토리 API 3종
- `GET /api/history/sessions?period=today|7d|30d`
- `GET /api/history/keywords?period=7d|30d`
- `GET /api/history/sentiment?period=7d|30d`

### 중복 세션 저장 방지
- 직전 세션과 URL 70% 이상 겹치면 DB 저장 생략
- `isDuplicateSession()` + Gemma 분석을 `Promise.all` 병렬 실행 → 지연 없음

### Settings 페이지
- 파일: `src/components/Settings.tsx`, `src/context/SettingsContext.tsx`
- 섹션: 화면(테마) / 뉴스 수집(카테고리·기사수) / AI 모델(모델표시·Temperature) / 데이터 관리(DB상태·검색어초기화)
- 설정값 localStorage 동기화

### UI 정리
- Header: Bell 알림 버튼·아바타 이미지 제거
- Sidebar: LogOut 버튼 제거, Settings 버튼 `activeTab='settings'` 연결

### Supabase 연동
- `@supabase/supabase-js` 설치, `service_role` 키 사용 (RLS bypass)
- `saveSessionToDb()`: 세션·카테고리·키워드·기사 4개 테이블 저장
- 에러 세션: `is_error=TRUE`로 저장

### Supabase 스키마 확정
- 테이블: `news_sessions`, `category_stats`, `keyword_stats`, `article_summaries`
- View: `keyword_trends` (에러 세션 자동 제외)
- 인덱스 8개 (시계열·키워드 추적·JOIN 최적화)
- `sentiment_score`, `score` FLOAT (Gemma 소수점 반환 대응)
- `keyword_stats.sentiment` NOT NULL 제거 (Gemma 예외 응답 대비)

### AI 모델 변경
- Gemini → Gemma 3 전용 (`gemma-3-12b-it` / `gemma-3-27b-it` 로테이션)
- JSON 모드 미지원 → `extractAndFixJson()` 파싱 보정
- 파싱 실패 시 `is_error=TRUE` 저장 + UI 안내 메시지

### 키워드 순위 정렬 수정
- 기존: Gemma 반환 순서 그대로 (score와 순위 불일치)
- 수정: `score` 내림차순 정렬

### SentimentGauge 컴포넌트
- 키워드 기반 긍정/중립/부정 분포 stacked bar + 비율 행 표시

### Dashboard 스탯 카드 4개
- 기사 수 / 긍정 비율 / 부정 비율 / 키워드 수

---

## 2026-04-15

### 타입 정합성 확보
- `NewsAnalysis` 인터페이스에 `averageSentiment`, `sentiment`, `sentimentScore` 추가
- 서버 응답 ↔ 프론트 타입 일치 → 감성 필터 정상화

### 보안 수정
- `vite.config.ts` `define`에서 `GEMINI_API_KEY` 클라이언트 번들 노출 제거

### 환경변수 로딩 개선
- `.env.local` (Vercel CLI pull) → `.env` 순으로 로드

### `vercel dev` 비권장 확정
- Express + Vite 통합 구조와 충돌 → `npm run dev` 통일

---

## 2026-03-15

### Vercel 서버리스 배포 안정화
- `@vercel/static-build` + `@vercel/node` 혼합 구성으로 배포 안정성 확보
- Vite lazy loading (동적 import)으로 서버리스 500 에러 해결

### 라이트 모드 대비 개선
- 흰색 배경 텍스트 가독성 문제 해결 (색상 대비 전면 수정)

### Tailwind v4 다크 모드
- `selector` 방식으로 설정, 테마 토글 일관성 확보

### AI 감성 분석 고도화
- 프롬프트 상세화로 긍정/부정/중립 분류 정확도 향상
- 감성 점수 1~100 범위 도입

---

## 프로젝트 초기 (2026-03 이전)

- React 19 + Vite + Express 기반 프로젝트 구성
- 네이버 뉴스 6개 섹션 크롤링 (cheerio)
- Google Gemini AI 연동 및 한글 로컬라이징
- 다크/라이트 모드 + Glassmorphism UI
- NewsContext, ThemeContext 전역 상태 관리
- 검색·감성 필터·최근 검색어 기능
