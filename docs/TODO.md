# TODO — news_dash

> 우선순위 순 정렬 · 상태: 📋 계획 / ⏳ 전제조건 있음 / 💭 검토 중

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
- `server.ts`: `req.query`에서 파라미터 파싱 후 크롤링 카테고리 필터링 + Gemma `temperature` 적용

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
- 네이버 크롤링 부하 및 Gemma API RPD 한도 확인 필요
- 무료 티어 Gemma RPD: 1,500회/일 (12b), 50회/일 (27b) → 27b는 하루 1회만 가능

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
