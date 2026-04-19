# news_dash — AI 뉴스 트렌드 분석 대시보드

네이버 뉴스를 실시간 수집하고 Google Gemma AI로 트렌드·감성 분석을 수행합니다. 분석 결과는 Supabase에 누적 저장되어 일간·주간·월간 통계 조회가 가능합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, Vite 6, Tailwind CSS v4 |
| Backend | Node.js, Express, tsx |
| AI | Google Gemma 3 (12b-it / 27b-it 로테이션) |
| DB | Supabase (PostgreSQL) |
| 크롤링 | Cheerio |
| 배포 | Vercel |

---

## 데이터 흐름

```
새로고침 버튼
  │
  ├─ 네이버 뉴스 크롤링 (6개 섹션 × 최대 3개 = 18개)
  │
  ├─ isDuplicateSession() ──────── URL 70%↑ 겹침 → DB 저장 생략
  │   └─ Promise.all (Gemma 분석과 병렬)
  │
  ├─ Gemma 3 분석
  │   └─ 트렌드 요약 / 카테고리 집계 / 키워드 추출 / 감성 분석
  │
  ├─ Supabase 저장 (비동기, 응답 지연 없음)
  │   ├─ news_sessions
  │   ├─ category_stats
  │   ├─ keyword_stats
  │   └─ article_summaries
  │
  └─ 프론트엔드 응답 반환
```

---

## 디렉토리 구조

```
news_dash/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # 메인 대시보드 (스탯·키워드·뉴스요약·주간월간통계)
│   │   ├── Analytics.tsx       # 기간별 분석 (현재세션·오늘·7일·30일 탭)
│   │   ├── Articles.tsx        # 기사 목록 (DB 기반·기간탭·카테고리·감성 필터)
│   │   ├── Settings.tsx        # 설정 페이지 (테마·수집·AI모델·데이터관리)
│   │   ├── Header.tsx          # 헤더 (검색바, 테마 토글)
│   │   ├── Sidebar.tsx         # 사이드바 네비게이션
│   │   ├── GlassCard.tsx       # Glassmorphism 카드 공통 컴포넌트
│   │   ├── SentimentGauge.tsx  # 감성 분포 stacked bar 패널
│   │   └── TrendChart.tsx      # Recharts 카테고리 트렌드 차트
│   ├── context/
│   │   ├── NewsContext.tsx      # 뉴스 데이터·검색·감성필터 전역 상태
│   │   ├── SettingsContext.tsx  # 설정값 전역 상태 + localStorage 동기화
│   │   └── ThemeContext.tsx     # 다크/라이트 모드 상태
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # orb 애니메이션, glassmorphism 글로벌 스타일
├── docs/
│   ├── HISTORY.md              # 완료된 개발 이력
│   └── TODO.md                 # 예정 작업 목록
├── server.ts                   # Express 백엔드 (크롤링 + Gemma + Supabase)
├── vercel.json
└── package.json
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/news-analysis` | 실시간 크롤링 + Gemma 분석 + DB 저장 |
| GET | `/api/history/sessions?period=` | 기간별 세션 목록 |
| GET | `/api/history/keywords?period=` | 기간별 반복 키워드 TOP 20 |
| GET | `/api/history/sentiment?period=` | 기간별 일별 감성 추이 |
| GET | `/api/history/articles?period=` | 기간별 기사 목록 (중복 제거) |
| GET | `/api/history/stats` | 주간·월간 집계 통계 |

`period` 값: `today` / `7d` / `30d`

---

## DB 스키마 (Supabase)

```sql
news_sessions      -- 수집 세션 (수집시각, 기사수, 모델, is_error, overall_trend)
category_stats     -- 카테고리별 집계 (카테고리명, 기사수, 평균감성)
keyword_stats      -- 키워드 (키워드, score FLOAT, sentiment)
article_summaries  -- 기사 (제목, 요약, 카테고리, URL, sentiment, sentiment_score FLOAT)

VIEW keyword_trends -- 키워드 장기 트렌드 집계 (에러 세션 자동 제외)
```

---

## 로컬 실행

**Prerequisites:** Node.js v18+

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env)
GEMINI_API_KEY=...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service_role_key>   # service_role 키 사용 (anon 키 불가)

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

> `vercel dev`는 Express + Vite 구조와 충돌하므로 사용하지 않습니다.

### 빌드 명령어

```bash
npm run build       # 클라이언트 + 서버 빌드
npm run start       # 프로덕션 서버 실행
npm run lint        # TypeScript 타입 체크
```

---

## 주요 특이사항

**Gemma JSON 파싱**
Gemma 3은 `responseMimeType: "application/json"` 미지원. `extractAndFixJson()`으로 응답 보정 후 파싱. 실패 시 `is_error=TRUE`로 DB 저장하고 UI에 안내 메시지 표시.

**중복 세션 방지**
새로고침 시 직전 세션과 URL 70% 이상 겹치면 DB 저장 생략. 중복 체크와 Gemma 분석을 `Promise.all`로 병렬 실행해 응답 지연 없음.

**Supabase 인증**
RLS 정책으로 `anon` 키는 INSERT 불가. `service_role` 키를 서버 전용으로 사용.

---

## 문서

- `docs/HISTORY.md` — 날짜별 개발 이력
- `docs/TODO.md` — 예정 작업 및 우선순위

---

## 라이선스

Apache-2.0
