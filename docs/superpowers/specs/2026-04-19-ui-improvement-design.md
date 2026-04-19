# UI 개선 설계 스펙

> 작성일: 2026-04-19
> 기준 레퍼런스: `ref/UI-Test101/`

---

## 1. 개요

현재 Tailwind CSS 기반 UI를 유지하면서 두 가지 축으로 개선한다.

1. **레이아웃 개선** (라이트/다크 공통): 스탯 카드 확장, 감성 분포 패널 신규 추가, 키워드 UI 개선
2. **다크 모드 비주얼 개선**: 배경을 딥 네이비 + orb 애니메이션으로 교체, 글래스카드 강화

---

## 2. 변경 범위

### 2-1. 레이아웃 (라이트 · 다크 공통)

#### 스탯 카드 — `Dashboard.tsx`
- **현재**: 3개 (기사 수 / 키워드 / 분류)
- **변경**: 4개로 확장
  - 기사 수 (유지)
  - 긍정 비율 % (신규) — `keyTopics`에서 sentiment === 'positive' 비율 계산
  - 부정 비율 % (신규) — `keyTopics`에서 sentiment === 'negative' 비율 계산
  - 키워드 수 (유지, 분류 카드 제거 후 대체)
- delta 증감 수치는 추후 DB 연결 후 구현 (→ `docs/FUTURE_PLANS.md`)

#### 감성 분포 패널 — 신규 컴포넌트 `SentimentGauge.tsx`
- 위치: 우측 컬럼 최상단 (카테고리 분포 위)
- 구성:
  - 긍정/중립/부정 스택 바 (height: 12px, border-radius)
  - 각 항목 행: 색상 dot + 레이블 + 비율 %
- 데이터 소스: `keyTopics` 배열의 sentiment 필드 집계
  ```ts
  const pos = topics.filter(t => t.sentiment === 'positive').length
  const neg = topics.filter(t => t.sentiment === 'negative').length
  const neu = topics.length - pos - neg
  ```

#### 키워드 UI — `Dashboard.tsx`
- **현재**: pill 뱃지 (색상으로 감성 구분)
- **변경**: 순위 리스트 형태
  - 순위 번호 (01, 02 ...) — monospace
  - 키워드명
  - 트렌드 방향 (↑ 긍정, ↓ 부정, — 중립)
  - progress bar (너비 = `score / maxScore * 100%`)
- 데이터: `keyTopics[].keyword`, `keyTopics[].score`, `keyTopics[].sentiment`

---

### 2-2. 다크 모드 비주얼 — `App.tsx`, `index.css`

#### 배경
- **현재**: `dark:bg-slate-950` + indigo/purple blur circles (Tailwind)
- **변경**: CSS custom property 기반 딥 네이비 그라디언트 + 3개 orb 애니메이션

```css
/* dark mode 배경 */
.dark .bg-scene {
  background:
    radial-gradient(ellipse at top left, #1a2b5c 0%, transparent 60%),
    radial-gradient(ellipse at bottom right, #0f1e3d 0%, transparent 55%),
    linear-gradient(160deg, #0a1428 0%, #0f1e3d 100%);
}

/* orb */
.dark .orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; }
.dark .orb-1 { width: 520px; height: 520px; background: oklch(0.45 0.18 240); opacity: 0.45; top: -80px; left: -100px; animation: orbFloat 20s ease-in-out infinite; }
.dark .orb-2 { width: 640px; height: 640px; background: oklch(0.5 0.16 210); opacity: 0.35; bottom: -200px; right: -150px; animation: orbFloat 20s ease-in-out infinite; animation-delay: -7s; }
.dark .orb-3 { width: 400px; height: 400px; background: oklch(0.42 0.2 270); opacity: 0.28; top: 40%; left: 55%; animation: orbFloat 20s ease-in-out infinite; animation-delay: -13s; }

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(40px, -30px) scale(1.05); }
  66%       { transform: translate(-30px, 40px) scale(0.95); }
}
```

#### 글래스카드 — `GlassCard.tsx`
- **현재 다크**: `dark:bg-slate-900/60 dark:border-white/5`
- **변경 다크**: `dark:bg-white/[0.055] dark:border-white/[0.11]`
- backdrop-filter: `blur(24px) saturate(140%)` (현재보다 강화)
- 내부 shine 레이어 추가 (::before pseudo-element, linear-gradient mask)

#### 사이드바 다크 모드
- `dark:bg-white/[0.055]` (현재 `dark:bg-slate-900/60`)
- active nav item: 왼쪽 3px accent 바 + glow 유지 (현재 없음 → 신규)

---

## 3. 영향 파일

| 파일 | 변경 유형 |
|------|-----------|
| `src/components/Dashboard.tsx` | 스탯 카드 4개, 키워드 UI 변경 |
| `src/components/GlassCard.tsx` | 다크 모드 글래스 스타일 강화 |
| `src/components/Sidebar.tsx` | 다크 모드 active 인디케이터 추가 |
| `src/components/SentimentGauge.tsx` | 신규 생성 |
| `src/App.tsx` | 다크 배경 orb 마크업 추가 |
| `src/index.css` | orb 애니메이션, 다크 배경 CSS 추가 |

---

## 4. 데이터 요구사항

| 데이터 | 소스 | 상태 |
|--------|------|------|
| 긍정/부정/중립 비율 | `keyTopics[].sentiment` 집계 | ✅ 현재 API 제공 |
| 키워드 score | `keyTopics[].score` | ✅ 현재 API 제공 |
| delta 증감 수치 | 이전 세션 데이터 필요 | ⏳ 추후 (DB 연결 후) |

---

## 5. 범위 외 (이번 작업 제외)

- 언론사 출처 표시 (데이터 미수집)
- LIVE pill (우선순위 낮음)
- delta 증감 배지 (DB 미연결)
- Analytics 페이지 개선 (별도 작업)
- 레퍼런스의 serif/mono 폰트 시스템 도입 (별도 검토)
