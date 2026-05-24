# news_dash - Next.js 기반 AI 뉴스 트렌드 대시보드

네이버 뉴스를 수집하고 Gemini로 트렌드/감성 분석을 수행하는 대시보드입니다.
프론트와 백엔드를 Next.js(App Router + Route Handler)로 통합해 운영 구조를 단순화했습니다.

## 핵심 구조

- 프레임워크: Next.js 15
- UI: React 19 + Tailwind CSS v4
- 차트: Recharts
- AI 분석: @google/generative-ai
- 데이터 저장: Supabase

## 디렉토리 구조

```text
app/
  page.tsx                         # 클라이언트 대시보드 진입
  layout.tsx                       # 루트 레이아웃
  globals.css                      # 전역 스타일 + Tailwind
  api/
    news-analysis/route.ts         # 뉴스 수집 + AI 분석
    history/
      sessions/route.ts
      keywords/route.ts
      sentiment/route.ts
      articles/route.ts
      category-totals/route.ts
      stats/route.ts
      latest-session/route.ts
src/
  App.tsx
  components/
  context/
  lib/server/newsService.ts        # 서버 비즈니스 로직(분석/히스토리 집계)
```

## API 개요

- GET/POST /api/news-analysis
  - POST body로 설정 전달 가능
  - enabledCategories: string[]
  - articleLimit: number (6~30)
  - temperature: number (0~1)
- GET /api/history/sessions?period=7d|30d|today
- GET /api/history/keywords?period=7d|30d|today
- GET /api/history/sentiment?period=7d|30d|today
- GET /api/history/articles?period=today|7d|30d
- GET /api/history/category-totals?period=all|7d|30d|today
- GET /api/history/stats
- GET /api/history/latest-session

## 실행 방법

```bash
npm install
npm run dev
```

- 개발 서버: http://localhost:3000

## 빌드/검증

```bash
npm run lint
npm run build
npm run start
```

## 환경 변수

```bash
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
# 선택: 모델 로테이션 커스텀
GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite
```

## 배포

Vercel에서 Next.js 프레임워크로 바로 배포합니다.
vercel.json은 framework=nextjs만 유지합니다.
