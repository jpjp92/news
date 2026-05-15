# Dashboard & Analytics Improvements

작성일: 2026-05-16
최근 업데이트: 2026-05-16

## 목적

대시보드와 핵심 분석 화면의 역할을 명확히 분리하고, AI 분석 결과가 화면에서 더 신뢰성 있게 보이도록 개선한다.

- 대시보드: 최신 세션의 핵심 상황을 빠르게 파악
- 핵심 분석: 현재 세션과 기간별 누적 흐름을 비교 분석
- 서버 분석: UI에서 활용 가능한 근거 필드를 추가하고 응답을 정규화

## 적용된 변경

### 1. 차트 mock 데이터 제거

파일: `src/components/TrendChart.tsx`

기존에는 `data`가 없으면 시간대별 mock 데이터가 표시됐다. 이 때문에 실제 분석 데이터가 없는 상황에서도 차트가 있는 것처럼 보일 수 있었다.

변경 후:

- mock fallback 제거
- 데이터가 없으면 빈 상태 메시지 표시
- 차트 제목, 부제, 범례 라벨을 호출부에서 지정 가능

### 2. Dashboard 지표 기준 정리

파일: `src/components/Dashboard.tsx`

기존 긍정/부정 비율은 `keyTopics` 기준이었다. 사용자가 보기에는 기사 기준인지 키워드 기준인지 모호했다.

변경 후:

- 긍정/부정 비율을 `summaries` 기사 요약 기준으로 계산
- 라벨을 `기사 긍정 비율`, `기사 부정 비율`로 변경
- 카테고리 차트 제목을 `카테고리별 기사 수 및 감성`으로 변경
- 동적 Tailwind 클래스(`bg-${color}`)를 정적 class map으로 변경

### 3. AI 분석 스키마 확장

파일: `server.ts`, `src/context/NewsContext.tsx`

기존 응답은 전체 요약, 카테고리, 키워드, 기사 요약 중심이었다. 화면에서 “왜 이 키워드가 중요한지”, “카테고리별 대표 이슈가 무엇인지”를 보여주기 어려웠다.

추가 필드:

```ts
trendDrivers?: string[];

categories: {
  name: string;
  count: number;
  averageSentiment?: number;
  dominantIssue?: string;
}[];

keyTopics: {
  keyword: string;
  sentiment: string;
  score: number;
  reason?: string;
}[];
```

서버에서 `normalizeAnalysis()`를 추가해 다음을 보정한다.

- 배열 필드 기본값 처리
- 감성값을 `positive | neutral | negative`로 제한
- 숫자 필드 변환
- 빈 키워드 제거
- `trendDrivers` 최대 5개 제한

### 4. Dashboard 분석 근거 표시

파일: `src/components/Dashboard.tsx`

변경 후:

- 전체 뉴스 트렌드 분석 아래에 `trendDrivers`를 해시태그 형태로 표시
- 주요 카테고리 분포에 `dominantIssue` 표시

기존 DB 세션에 확장 필드가 없으면 빈 값으로 안전하게 처리된다.

### 5. 핵심 분석 토픽 카드 개선

파일: `src/components/Analytics.tsx`

변경 후:

- 주요 토픽 분석 카드에 `reason` 표시
- 카테고리별 비중에 평균 감성 점수 표시

### 6. 최신뉴스 필터 UI 정리

파일: `src/components/Articles.tsx`

최신뉴스 화면의 카테고리/감성 필터와 기사 카드 배지의 글자 크기를 조정했다.

변경 후:

- 상단 필터의 `카테고리`, `감성` 라벨 폰트 기준 통일
- 카테고리 버튼과 감성 버튼을 동일한 크기 체계로 정리
- 카테고리 필터는 줄바꿈 대신 가로 스크롤 유지
- 기사 카드의 카테고리 배지는 한 줄 유지
  - `whitespace-nowrap`
  - `truncate`
  - `max-w-[7rem]`

### 7. 최신뉴스 날짜순 정렬 추가

파일: `src/components/Articles.tsx`, `server.ts`

카테고리/감성/검색어 필터 적용 후 날짜순으로 정렬할 수 있도록 `정렬` 필터를 추가했다.

추가 옵션:

- 최신순
- 오래된순

서버 변경:

- `/api/history/articles` 응답에 `collected_at` 추가
- 기사별 `order_index` 추가
- 중복 제거 전 최신 세션 기준으로 정렬
- 같은 수집 시각 안에서도 `order_index`를 보조 정렬키로 사용

프론트 변경:

- `sortOrder` 상태 추가
- 카테고리, 감성, 검색어 필터 적용 후 정렬 수행
- 같은 `collected_at`을 가진 기사도 최신순/오래된순 선택 시 순서가 실제로 바뀌도록 처리

주의:

- DB 모드(`오늘`, `7일`, `30일`)는 `collected_at` 기준으로 정확히 정렬된다.
- 현재 세션 모드는 저장 전 메모리 데이터라 개별 수집 시각이 없으므로 원본 순서와 `order_index`를 기준으로 보조 정렬된다.

### 8. 핵심 분석 세션 목록 노이즈 제거

파일: `src/components/Analytics.tsx`, `server.ts`

핵심 분석의 기간별 세션 목록에서 분석 실패 또는 빈 세션은 보여주지 않도록 정리했다.

변경 후:

- `/api/history/sessions`에서 `is_error = false` 세션만 반환
- `/api/history/sessions`에서 `article_count > 0` 세션만 반환
- 프론트에서도 `article_count > 0`으로 한 번 더 방어 필터 적용
- 세션 목록의 `파싱 오류` 표시 분기 제거

효과:

- 7일/30일 탭에서 `파싱 오류` 세션이 보이지 않음
- 기사 수 `0개` 세션이 보이지 않음
- 세션 목록의 총 개수는 실제 표시되는 정상 세션 수와 일치

### 9. 일별 감성 추이 표시 개선

파일: `src/components/Analytics.tsx`

일별 감성 추이에서 빈 값인 항목은 표시하지 않고, 목록이 길어지면 카드 내부에서 스크롤되도록 변경했다.

변경 후:

- `session_count > 0`인 항목만 표시
- 긍정/부정/중립 합계가 0보다 큰 항목만 표시
- 목록 영역에 `max-h-72 overflow-y-auto` 적용

효과:

- 빈 날짜가 화면을 차지하지 않음
- 긴 기간 데이터에서도 카드 높이가 과도하게 늘어나지 않음

## 데이터 저장 방식

현재 DB 스키마 변경은 하지 않았다.

- 기존 테이블 저장 구조는 유지
- 확장 필드는 `news_sessions.raw_data.data`에 보존
- `/api/history/latest-session`에서 `raw_data`를 읽어 `trendDrivers`, `dominantIssue`, `reason`을 복원

이 방식은 마이그레이션 없이 적용 가능하지만, 장기적으로 기간별 분석에서도 확장 필드를 쓰려면 별도 컬럼 또는 테이블 구조 개선이 필요하다.

## 새 세션에서 기대되는 화면 변화

새로고침으로 AI 분석을 다시 실행하면 다음 정보가 추가로 표시된다.

- 대시보드 전체 트렌드 근거 키워드
- 카테고리별 대표 이슈
- 핵심 분석 토픽별 중요 이유

기존 세션은 확장 필드가 없으므로 기존 화면과 유사하게 표시된다.

## 남은 개선 후보

### 1. 기간 대비 변화 추가

핵심 분석의 `오늘`, `7일`, `30일` 탭에 이전 기간 대비 변화를 추가한다.

예:

- 기사 수 `+12%`
- 긍정 비율 `-8%p`
- 신규 급상승 키워드
- 사라진 키워드

### 2. 반복 키워드 랭킹 고도화

현재 반복 키워드는 등장 횟수 중심이다. 다음 값을 조합한 랭킹으로 개선할 수 있다.

- 등장 횟수
- 평균 score
- 최근성
- 감성 방향성

### 3. 확장 필드 DB 정규화

`reason`, `dominantIssue`, `trendDrivers`를 장기 분석에 활용하려면 DB 구조를 확장한다.

후보:

- `keyword_stats.reason`
- `category_stats.dominant_issue`
- `news_sessions.trend_drivers jsonb`

### 4. 감성 계산 기준 통일

현재 화면마다 감성 계산 기준이 조금 다르다.

- Dashboard 상단 카드: 기사 요약 기준
- SentimentGauge: 키워드 기준
- Analytics 기간 탭: 키워드 통계 기준

화면별 라벨을 더 명확히 하거나, 공통 계산 정책을 정하는 것이 좋다.

### 5. 프롬프트 안정성 개선

Gemini 응답이 JSON 파싱에 실패하지 않도록 구조를 더 강하게 제한할 수 있다.

후보:

- JSON 예시를 더 짧게 유지
- 필드별 최대 길이 명시
- 카테고리명을 허용 목록으로 제한
- URL은 입력 URL 그대로 복사하도록 명시

## 검증

실행한 검증:

```bash
npm run lint
```

결과:

- TypeScript 타입 체크 통과
