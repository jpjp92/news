# HISTORY - news_dash

> 최근순 정렬

## 2026-07-11

### 모바일 날씨 및 대시보드 트렌드 UI 개선

변경 파일:

- `app/globals.css`
- `src/components/Weather.tsx`
- `src/components/Dashboard.tsx`
- `docs/HISTORY.md`

변경 내용:

- 모바일 현재 날씨 카드를 세로형에서 온도와 아이콘이 나란히 보이는 요약형 레이아웃으로 변경
  - 모바일 카드 패딩, 온도 크기, 내부 여백 축소
  - 날씨 아이콘 크기를 줄이고 밝은 모드 배경과 그림자를 보강해 대비 개선
  - 데스크톱에서는 기존 크기와 배치를 유지
- 모바일 5일 예보를 단일 열 목록에서 가로 스크롤 카드로 변경
  - 첫 카드 너비를 88%로 설정해 다음 카드 일부를 스크롤 힌트로 노출
  - 스크롤 스냅을 적용해 카드 단위 탐색 지원
  - 전역 스크롤바 스타일보다 우선하는 `scrollbar-hidden` 유틸리티를 추가해 스크롤바는 숨기고 터치 스크롤은 유지
  - 태블릿과 데스크톱에서는 기존 2열 및 5열 그리드를 유지
- 대시보드의 `전체 뉴스 트렌드 분석` 모바일 가독성 개선
  - 장문 본문의 따옴표와 이탤릭을 제거하고 모바일 글자 크기 및 행간 확대
  - 모바일 본문을 기본 5줄로 제한하고 `더보기`와 `접기` 기능 추가
  - 긴 영향 요인을 pill 형태에서 최대 3개의 목록형 카드로 변경
  - 강조선 범위를 본문으로 한정하고 AI 분석 안내문의 크기와 대비 보강
  - 데스크톱에서는 트렌드 본문 전체를 기본 표시

검증:

- `npm run lint` 통과
- `npm run build` 통과
- `git diff --check` 통과
- 모바일 다크 모드 화면에서 현재 날씨 카드와 5일 예보 가로 스크롤 레이아웃 확인

## 2026-07-06

### 날씨 강수량 표시 및 KMA 강수 파싱 보강

변경 파일:

- `app/api/weather/route.ts`
- `src/components/Weather.tsx`
- `README.md`
- `docs/TODO.md`
- `docs/HISTORY.md`

변경 내용:

- 상단 날씨 지표의 `강수`를 `강수량`으로 명확히 변경
- 현재 관측 강수량이 있으면 `nmm 현재`, 현재 관측값이 0이고 오늘 예보 강수량이 있으면 `nmm 예상`으로 표시
- 5일 예보 카드에 일별 예상 강수량을 추가 표시
- KMA 강수량 문자열 파싱 보강
  - `강수없음`, `적설없음`은 0으로 처리
  - `1.0mm 미만` 같은 미만 표현은 기준값의 절반으로 근사
  - `30.0~50.0mm` 같은 범위 표현은 중간값으로 근사
- KMA 요약 문구에서 현재 강수량이 0이고 오늘 예보 강수량이 있으면 예상 강수량을 안내

검증:

- `npm run lint` 통과
- 로컬 개발 서버 `http://localhost:3020`에서 `GET /api/weather?city=서울` 응답 확인
  - 현재 환경에서는 KMA API Hub 연결 타임아웃으로 OpenWeather fallback 동작 확인
  - fallback 응답에서 오늘 예보 강수량 `10.7mm`가 정상 계산됨

## 2026-07-05

### KMA/OpenWeather 하이브리드 날씨 API 검증

#### 변경 파일

- `README.md`
- `docs/HISTORY.md`
- `docs/TODO.md`
- `scripts/probe-kma-api.mjs` (로컬 전용, git 제외)
- `scripts/probe-weather-provider-contract.mjs` (로컬 전용, git 제외)
- `scripts/benchmark-kma-weather-combos.mjs` (로컬 전용, git 제외)

#### 검증 내용

- 기상청 API Hub `KMA_API_KEY`로 실제 응답 구조 확인
- 기상청 API Hub는 인증키 발급만으로 모든 API가 열리지 않고, 사용할 엔드포인트별 활용신청이 필요함을 확인
  - 미신청 API는 403과 `활용신청이 필요한 API 입니다. 활용신청 후 다시 시도해 주십시오.` 메시지 반환
  - 날씨 탭 구현에 필요한 초단기실황, 초단기예보, 단기예보, 기상개황, 육상예보, 중기예보 계열 API를 개별 신청 후 재검증
- `fct_shrt_reg.php`는 실제 예보값이 아니라 단기예보구역 코드 조회 API임을 확인
  - `text/plain;charset=EUC-KR`
  - 전체 row 1142개, 도시 타입 `C` 665개
- 주요 KMA JSON API 정상 응답 확인
  - `getUltraSrtNcst`: 초단기실황
  - `getUltraSrtFcst`: 초단기예보
  - `getVilageFcst`: 단기예보
  - `getWthrSituation`: 기상개황
  - `getLandFcst`: 육상예보 통보문
  - `getMidTa`: 중기기온
  - `getMidLandFcst`: 중기육상예보
  - `getMidFcst`: 중기전망
- KMA 응답을 현재 `Weather.tsx` 계약(`source/location/current/daily/notes`)으로 조립하는 스크립트 검증
  - `서울`은 KMA provider로 정상 조립
  - `마드리드`는 OpenWeather provider로 정상 조립

#### 조합별 레이턴시

서울 기준 병렬 호출 실측:

| 조합 | 호출 수 | 총 시간 | 병목 | 확보 날짜 |
|---|---:|---:|---|---:|
| 현재 + 단기 5일 | 2 | 1480ms | 단기예보 1347ms | 6일 |
| 현재 + 초단기 + 단기 | 3 | 1220ms | 단기예보 1216ms | 6일 |
| 현재 + 단기 + 육상문장 | 3 | 1200ms | 단기예보 1199ms | 6일 |
| 현재 + 단기 + 중기 | 4 | 1229ms | 단기예보 1227ms | 6일 |
| 풀 조합 | 7 | 1187ms | 단기예보 1185ms | 6일 |

#### 결론

- 현재 UI처럼 5일 예보만 표시할 경우 중기예보는 기본 호출에 포함하지 않아도 충분함
- 초기 KMA 조합은 `초단기실황 + 단기예보 + 육상예보`가 적절함
- 중기예보는 단기예보가 5일을 채우지 못하는 경우의 backfill 또는 향후 주간 전망 카드용으로 보류
- 한국 도시는 KMA 우선, 해외 도시는 OpenWeather, KMA 실패 시 OpenWeather fallback 구조가 적합함
- KMA와 OpenWeather 공통성이 낮은 기압/가시거리/돌풍은 기본 지표에서 제외하는 방향이 적합함

### KMA/OpenWeather 하이브리드 날씨 API 적용

변경 파일:

- `app/api/weather/route.ts`
- `src/components/Weather.tsx`
- `README.md`
- `docs/TODO.md`
- `docs/HISTORY.md`

변경 내용:

- 한국 주요 도시는 KMA를 우선 사용하도록 provider 분기 추가
- KMA 실패 또는 KMA 키 미설정 시 기존 OpenWeather 경로로 fallback
- 해외 도시는 기존처럼 OpenWeather 사용
- KMA 호출은 초기 적용 범위에서 `초단기실황 + 단기예보 + 육상예보` 조합 사용
- KMA의 `T1H`, `REH`, `WSD`, `RN1`, `SKY`, `PTY`, `TMP`, `TMN`, `TMX`, `POP`, `PCP`, `SNO` 값을 기존 Weather UI 계약으로 정규화
- 상세 지표를 기압/가시거리 대신 강수확률/체감온도로 교체해 KMA/OpenWeather 공통 필드 중심으로 정리

검증:

- `npm run lint` 통과
- `GET /api/weather?city=서울` 응답 확인
  - `source: KMA`
  - 응답 시간 약 2.3초
- `GET /api/weather?city=마드리드` 응답 확인
  - `source: OpenWeather`
  - 응답 시간 약 0.7초

### 개발 서버 포트 자동 선택

변경 파일:

- `dev.mjs`
- `README.md`

변경 내용:

- `npm run dev` 실행 시 기본 포트 `3000`이 사용 중이면 `3001`부터 순차적으로 빈 포트를 찾아 Next dev 서버를 실행
- `PORT=3001 npm run dev`처럼 포트를 명시한 경우에는 해당 포트가 사용 중일 때 실패하도록 유지
- 기존에 `3000`을 점유하던 프로세스는 종료
- 커밋되어야 하는 dev 런처는 로컬 전용 `scripts/` 폴더에서 루트 `dev.mjs`로 이동

### 루트 파일 정리

변경 파일:

- `metadata.json`
- `index.html`
- `docs/HISTORY.md`

검토 결과:

- `metadata.json`: 비어 있는 템플릿 메타 파일이며 Next 앱에서 참조하지 않아 삭제
- `index.html`: Vite 진입점 잔재이며 현재 앱은 `app/page.tsx`와 `app/layout.tsx`를 사용하므로 삭제
- `next-env.d.ts`: Next/TypeScript 타입 참조 파일이므로 유지
- `next.config.ts`, `postcss.config.mjs`, `instrumentation.ts`, `vercel.json`, `Dockerfile`, `.dockerignore`, `dev.mjs`: 현재 설정 또는 실행에 필요한 파일로 유지

### 날씨 UI 공통 지표 및 기본값 정리

변경 파일:

- `src/components/Weather.tsx`
- `docs/HISTORY.md`
- `docs/TODO.md`
- `README.md`

변경 내용:

- 날씨 탭 기본 도시를 `Seoul`에서 `서울`로 변경
- 5일 예보 날짜를 `7/5 (일)`처럼 요일 포함 형식으로 변경
- KMA/OpenWeather 공통성이 낮은 기압/가시거리 대신 강수확률/체감온도 지표를 표시
- 상세 지표를 습도, 풍속, 강수, 강수확률, 구름, 체감온도 중심으로 정리

검증:

- `npm run lint` 통과

### 모바일 Sidebar 닫기 아이콘 정리

변경 파일:

- `src/components/Sidebar.tsx`
- `README.md`

변경 내용:

- 모바일 Sidebar 드로어의 닫기 버튼을 오른쪽에서 왼쪽 상단으로 이동
- 닫기 아이콘을 Sidebar 전용 아이콘에서 모바일 기본에 가까운 3줄 메뉴 아이콘으로 변경
- 데스크톱 Sidebar 접기/펼치기 아이콘은 기존 동작 유지

검증:

- `npm run lint` 통과

---

### Sidebar 검색 UX 및 모바일 닫기 아이콘 정리

#### 변경 파일

- `src/components/Sidebar.tsx`
- `src/components/Articles.tsx`
- `.gitignore`
- `README.md`

#### 변경 내용

- Sidebar 검색창에서 Enter 입력 시 최신뉴스 탭으로 이동하도록 연결
- 최근 검색어 선택 시에도 최신뉴스 탭으로 이동하고 해당 검색어로 기사 목록 필터링
- 최신뉴스 필터 영역에 현재 검색어 표시와 검색 해제 버튼 추가
- 검색어 하이라이트 정규식을 escape 처리해 특수문자 입력 시 렌더링 오류 방지
- 모바일 Sidebar 닫기 버튼을 `X`에서 Sidebar 계열 아이콘으로 변경
- `scripts/` 폴더 전체를 `.gitignore`에 추가해 로컬 전용 스크립트가 커밋되지 않도록 정리

#### 검증

- `npm run lint` 통과

---

### 다크모드 초기 깜빡임 방지

#### 변경 파일

- `app/layout.tsx`
- `app/globals.css`
- `src/index.css`

#### 변경 내용

- React 하이드레이션 전에 `localStorage.news-dash-theme`를 읽는 초기 테마 스크립트 추가
- 저장된 테마가 없으면 `prefers-color-scheme` 기준으로 초기 테마 결정
- 첫 페인트 전에 `html.dark`, `data-theme`, `color-scheme`을 적용해 다크모드 저장 상태에서 라이트모드가 잠깐 보이는 현상 완화
- SSR에서 `warm-bg`가 잠깐 남아도 `.dark .warm-bg`가 다크 배경으로 보이도록 CSS fallback 추가
- 다크모드에서 light orb가 노출되지 않도록 CSS fallback 추가

#### 검증

- `npm run lint` 통과

---

### Sidebar 날씨 탭 및 도시명 정규화

#### 변경 파일

- `app/api/weather/route.ts`
- `src/components/Weather.tsx`
- `src/components/Sidebar.tsx`
- `src/App.tsx`
- `.env.example`
- `tsconfig.json`

#### 변경 내용

- Sidebar에 `날씨` 탭 추가
- `GET /api/weather?city=...` 추가
  - OpenWeather 현재 날씨와 5일 예보 조회
  - `서울`, `마드리드`, `도쿄`, `뉴욕` 등 주요 한글 도시명을 영문 도시명/국가 코드로 alias 정규화
  - OpenWeather Geocoding API로 위경도를 확인한 뒤 `lat/lon` 기반으로 날씨 조회
- Weather 화면 추가
  - 현재 기온, 체감온도, 습도, 풍속, 강수, 기압, 가시거리, 구름량 표시
  - 5일 예보와 날씨 요약 카드 표시
  - 로딩 스피너/스켈레톤 추가
- 도시 조회 실패 시 `CITY_NOT_FOUND`로 분리하고, 사용자 UI에는 간단한 안내 문구만 표시
- OpenWeather 환경 변수 예시 `OPENWEATHER_API_KEY` 추가
- 레퍼런스 폴더 `ref`가 TypeScript 검사 대상에 포함되지 않도록 `tsconfig.json` exclude에 추가

#### 검증

- `npm run lint` 통과
- `/api/weather?city=서울` 정상 응답 확인
- `/api/weather?city=마드리드` 정상 응답 확인
- 존재하지 않는 도시명은 404 + `CITY_NOT_FOUND` 반환 확인

---

### 핵심 분석 기간 비교 및 전체 누적 키워드 보강

#### 변경 파일

- `app/api/history/compare/route.ts`
- `src/lib/server/newsService.ts`
- `src/components/Analytics.tsx`

#### 변경 내용

- `GET /api/history/compare?period=today|7d|30d` 추가
  - 현재 기간과 직전 동일 기간의 기사 수, 수집 세션 수, 긍정/부정 비율 비교
  - 신규 키워드, 소멸 키워드, 급상승 키워드 계산
  - 잘못된 period는 400 반환
- Analytics `오늘`, `7일`, `30일` 탭 상단에 `기간 대비 변화 요약` 카드 추가
- Analytics `전체` 탭에 `전체 누적 키워드 요약` 카드 추가
  - 반복 키워드 수, 긍정/부정 우세 키워드 수, 최다 등장 키워드, 누적 TOP 키워드 표시
- `GET /api/history/keywords` 응답을 TOP 10에서 TOP 20까지 확장

#### 검증

- `npm run lint` 통과
- `/api/history/compare?period=7d` 정상 응답 확인
- `/api/history/compare?period=bad` 400 반환 확인
- `/api/history/keywords?period=all` 정상 응답 및 20개 반환 확인

---

### Warm Swiss 하이브리드 UI 개편

#### 변경 파일

- `app/globals.css`
- `src/index.css`
- `src/App.tsx`
- `src/components/GlassCard.tsx`
- `src/components/Header.tsx`
- `src/components/Sidebar.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Articles.tsx`
- `src/components/Analytics.tsx`
- `src/components/Settings.tsx`
- `src/components/TrendChart.tsx`
- `.gitignore`

#### 변경 내용

- 전체 light mode 배경을 순백/보라 계열에서 웜 그레이 기반 `warm-bg`로 변경
- 공통 카드(`GlassCard`)를 큰 라운드와 강한 glass shadow에서 낮은 라운드, 약한 보더, paper surface 톤으로 조정
- Header/Sidebar의 purple/indigo gradient 브랜드 톤을 차콜/웜 액센트 기반으로 정리
- Dashboard 상단을 얕은 aurora/glass hero 스타일로 재구성하고 KPI 카드 색상을 muted red/teal 계열로 조정
- Dashboard, Articles, Analytics, Settings, TrendChart에 남아 있던 강한 indigo/purple 액센트를 제거하고 light/dark 공통 팔레트로 통일
- Dark mode를 deep navy 중심에서 차콜 배경 + muted amber/teal accent로 변경
- scrollbar와 orb 색상도 새 팔레트에 맞춰 조정
- 로컬 디자인 샘플 `public/hybrid-dashboard-sample.html`을 `.gitignore`에 추가
- Header에 있던 뉴스 검색창과 최근 검색어 드롭다운을 Sidebar로 이동
  - Header는 모바일 메뉴 버튼과 테마 토글 중심으로 단순화
  - Sidebar가 열린 상태와 모바일 드로어에서 검색창 표시
  - 기존 검색어 상태, Enter 저장, 최근 검색어 선택/초기화 동작 유지

#### 검증

- `npm run lint` 통과
- `http://localhost:3002` dev server에서 Next 컴파일 에러 없음

---

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
  - 원문 URL이 없는 기사는 저장·조회·기사 수 통계에서 제외
  - 실제 기사 수가 0건이면 category/keyword 통계 insert 생략
  - 중복 세션 판정과 history 조회 함수들이 `article_count > 0` 세션만 사용하도록 정리
  - 카테고리 합계는 `category_stats` 대신 URL 있는 `article_summaries` 기준으로 집계
- 기존 DB 데이터 보정
  - 원문 URL이 없는 기사를 제외한 실제 URL 기사 수 기준으로 10개 세션의 `article_count` 재계산
- Gemini 응답 안정화
  - `maxOutputTokens`를 6000에서 12000으로 상향
  - JSON 파싱 실패 시 다음 모델로 분석 재시도
- Dashboard 빈 상태 설명 문구를 짧게 조정
- `30일` 이후 데이터까지 확인할 수 있도록 Articles/Analytics 기간 탭과 history API에 `전체` 기간 추가
- Analytics `오늘` 탭에서 keywords/sentiment API가 `today`를 허용하지 않아 400이 발생하던 문제 수정
- Analytics 수집 세션 목록에서 행 끝의 모델명 표기 제거

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
