# news_dash

Next.js 기반 AI 뉴스 트렌드 대시보드입니다. 네이버 뉴스 섹션별 헤드라인을 수집하고 Gemini로 트렌드, 키워드, 감성, 기사 요약을 분석한 뒤 Supabase에 세션 이력으로 저장합니다.

## 주요 기능

- 네이버 뉴스 6개 섹션 수집: 정치, 경제, 사회, 생활/문화, 세계, IT/과학
- Gemini 기반 분석: 전체 트렌드, 주요 키워드, 카테고리별 이슈, 기사별 요약/감성
- 최신 세션 자동 로드: 저장된 최신 정상 세션을 먼저 보여주고, 없으면 1회 자동 분석
- 히스토리 분석: 오늘, 7일, 30일, 전체 기준 세션/키워드/감성/기사 조회
- 기간 비교 분석: 오늘/7일/30일 데이터를 직전 동일 기간과 비교해 기사 수, 감성 비율, 신규·급상승·소멸 키워드 표시
- Supabase 저장: 세션, 카테고리 통계, 키워드 통계, 기사 요약 분리 저장
- 반응형 UI: 대시보드, 핵심 분석, 최신뉴스, 설정 화면 제공 및 탭 전환 시 스크롤 위치 초기화
- 하이브리드 UI: 웜 그레이 기반의 Swiss 정보 구조와 절제된 glass/gradient 포인트를 light/dark mode에 적용
- 로컬 감성 분류 모델 학습: 누적된 기사 데이터로 한국어 감성 분류 모델(KLUE-RoBERTa 등)을 Colab에서 파인튜닝 (`colab_training/`)

## 기술 스택

- Framework: Next.js 15 App Router
- UI: React 19, Tailwind CSS v4, motion
- Chart: Recharts
- AI: `@google/generative-ai`
- Crawling: cheerio
- Database: Supabase
- Language: TypeScript

## 프로젝트 구조

```text
app/
  page.tsx                         # 클라이언트 대시보드 진입점
  layout.tsx                       # 루트 레이아웃
  globals.css                      # 전역 스타일 및 Tailwind
  api/
    news-analysis/route.ts         # 뉴스 수집 + AI 분석 실행
    history/
      articles/route.ts            # 기간별 기사 목록
      compare/route.ts             # 직전 동일 기간 대비 변화 요약
      category-totals/route.ts     # 카테고리별 누적 집계
      keywords/route.ts            # 반복 키워드 집계
      latest-session/route.ts      # 최신 정상 세션
      sentiment/route.ts           # 일별 감성 추이
      sessions/route.ts            # 기간별 세션 목록
      stats/route.ts               # 주간/월간 요약 통계
src/
  components/                      # Dashboard, Analytics, Articles, Settings 등
  context/                         # News, Settings, Theme 전역 상태
  lib/server/
    newsService.ts                 # 수집, 분석, DB 저장/조회 비즈니스 로직
    logger.ts                      # 서버 로그 유틸
scripts/
  dev.mjs                          # 3000 포트 고정 개발 서버 실행
  migrate-supabase.mjs             # Supabase 스키마 마이그레이션 (git 제외)
colab_training/                    # 감성 분류 모델 학습 파이프라인 (Colab T4)
  train_sentiment.py               # KLUE-RoBERTa 파인튜닝 본 스크립트
  test_electra.py                  # 백본 비교 실험 (ELECTRA/FinBert/kf-deberta 등)
  run_training.sh                  # 월간 학습 실행 래퍼
  save_checkpoint.sh               # 단일 백본 학습 + 체크포인트 로컬 회수
models/sentiment/                  # 학습 산출물 (가중치는 git 제외, 로컬 전용)
  experiments/<날짜>/<모델>/        # 실험별 eval_report.json
  checkpoints/<날짜>/<모드>/         # 보관 체크포인트 (가중치 로컬, eval_report만 커밋)
docs/
  TODO.md                          # 남은 작업과 개선 후보
  HISTORY.md                       # 개발 이력
  TRAINING.md                      # 감성 분류 모델 학습 현황과 실험 비교
```

## 실행 방법

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다. `scripts/dev.mjs`가 포트 충돌을 먼저 검사하므로 3000 포트가 이미 사용 중이면 서버를 시작하지 않고 실패합니다. 다른 포트를 쓰려면 `PORT=3001 npm run dev`처럼 환경변수로 지정합니다.

## 빌드와 검증

```bash
npm run lint
npm run build
npm run start
```

- `npm run lint`: TypeScript 타입 검사(`tsc --noEmit`)
- `npm run build`: Next.js 프로덕션 빌드
- `npm run start`: 빌드 결과 실행

## UI 디자인 방향

현재 UI는 `Warm Swiss Dashboard` 방향을 기준으로 정리합니다.

- Light mode: 순백 배경 대신 웜 그레이/페이퍼 톤을 사용해 장시간 모니터링 피로도를 낮춤
- Dark mode: 기존 navy/indigo 중심 톤을 줄이고 깊은 차콜 배경과 muted amber/teal accent 사용
- Glass/gradient: 전체 화면 장식보다 Header, KPI, 핵심 요약 영역에만 제한적으로 적용
- 정보 구조: 카드 라운드와 그림자를 낮추고, 보더·여백·타이포 위계로 기사/통계/분석 데이터를 우선 노출
- 탐색 구조: Header는 전역 액션 중심으로 가볍게 유지하고, 검색/최근 검색어는 Sidebar에 배치
- 로컬 디자인 샘플: `public/hybrid-dashboard-sample.html`은 실험용 파일이며 `.gitignore`로 제외

## 환경 변수

```bash
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite
```

- `GEMINI_API_KEY`: Gemini API 호출에 필요합니다.
- `SUPABASE_URL`: Supabase 프로젝트 URL입니다.
- `SUPABASE_KEY`: 서버에서 DB 저장/조회에 사용하는 키입니다. 운영 환경에서는 service role 키 사용을 전제로 합니다.
- `GEMINI_MODELS`: 선택값입니다. 쉼표로 구분된 모델 목록을 순환 사용하며 기본값은 `gemini-2.5-flash,gemini-2.5-flash-lite`입니다. 429/503 등 재시도 가능한 에러 발생 시 목록의 다음 모델로 자동 폴백합니다.

## API

### 뉴스 분석

- `GET /api/news-analysis`: 기본 설정으로 뉴스 수집과 AI 분석을 실행합니다.
- `POST /api/news-analysis`: 설정값을 body로 전달해 분석을 실행합니다.

```json
{
  "enabledCategories": ["정치", "경제", "IT/과학"],
  "articleLimit": 18,
  "temperature": 0
}
```

`articleLimit`은 6~30 범위에서 6의 배수로 보정되며, `temperature`는 0~1 범위로 보정됩니다.

Gemini API 429/503 에러 시 `GEMINI_MODELS` 목록의 다음 모델로 자동 재시도합니다. 모든 모델이 실패하면 해당 HTTP 상태코드(429 또는 503)를 그대로 반환하며, 에러 원문은 서버 로그에만 기록됩니다.

### 히스토리

- `GET /api/history/latest-session`
- `GET /api/history/sessions?period=today|7d|30d`
- `GET /api/history/articles?period=today|7d|30d`
- `GET /api/history/keywords?period=7d|30d`
- `GET /api/history/sentiment?period=7d|30d`
- `GET /api/history/category-totals?period=all|today|7d|30d`
- `GET /api/history/compare?period=today|7d|30d`
- `GET /api/history/stats`

## 데이터 저장 개요

Supabase에는 다음 테이블 구성을 전제로 저장합니다.

- `news_sessions`: 분석 세션, 모델명, 수집 시각, 원본 AI 응답, 에러 여부
- `category_stats`: 세션별 카테고리 기사 수와 평균 감성
- `keyword_stats`: 세션별 키워드, 점수, 감성
- `article_summaries`: 세션별 기사 제목, 요약, URL, 감성

현재 `trendDrivers`, `dominantIssue`, `reason` 같은 확장 필드는 별도 컬럼이 아니라 `news_sessions.raw_data.data`에서 복원합니다.

스키마 마이그레이션은 `scripts/migrate-supabase.mjs`로 수행합니다.

```bash
npm run db:migrate:dry-run   # 적용 없이 변경 내역만 출력
npm run db:migrate:apply     # 실제 적용
```

## 감성 분류 모델 학습 (선택)

Gemini API 의존을 줄이고 배치 감성 분석의 속도·비용을 개선하기 위해, Supabase에 누적된 `article_summaries` 데이터로 로컬 한국어 감성 분류 모델을 파인튜닝합니다. 학습은 Colab T4에서 실행되며, 가중치는 git에서 제외되어 로컬에만 보관됩니다(실험 결과 `eval_report.json`만 커밋).

- 현재 채택 모델: `klue/roberta-large` (positive/neutral/negative 3분류, 입력 `title + summary`)
- 학습 실행: `colab_training/run_training.sh` (월간 파인튜닝), `colab_training/save_checkpoint.sh` (단일 백본 체크포인트 보관)
- 백본 비교 실험: `colab_training/test_electra.py` (ELECTRA / FinBert / koelectra / kf-deberta / roberta-large)
- 상세 현황·실험 비교·경로 규칙은 [docs/TRAINING.md](docs/TRAINING.md) 참고

## 배포

Vercel의 Next.js 프레임워크로 배포합니다. `vercel.json`은 다음처럼 프레임워크 지정만 유지합니다.

```json
{
  "framework": "nextjs"
}
```

Docker로 실행할 경우 `Dockerfile`은 `npm install`, `npm run build`, `npm start` 순서로 앱을 실행합니다.

## 문서

- [TODO.md](docs/TODO.md): 앞으로 구현할 작업과 개선 후보
- [HISTORY.md](docs/HISTORY.md): 주요 개발 이력과 검증 기록
- [TRAINING.md](docs/TRAINING.md): 감성 분류 모델 학습 현황과 실험 비교
