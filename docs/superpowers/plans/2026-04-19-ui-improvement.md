# UI 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 라이트/다크 공통 레이아웃 개선(스탯 카드 4개, 감성 분포 패널, 키워드 progress bar) + 다크 모드 배경을 딥 네이비 + orb 애니메이션으로 교체

**Architecture:** Tailwind CSS 기반 구조 유지. 다크 모드 배경은 `index.css`에 CSS로 추가하고 App.tsx에서 조건부 렌더링. 감성 분포는 `SentimentGauge.tsx` 신규 컴포넌트로 분리. 나머지는 기존 컴포넌트 수정.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite 6, lucide-react

---

## 파일 구조

| 파일 | 작업 |
|------|------|
| `src/index.css` | orb 애니메이션, 다크 배경 CSS 추가 |
| `src/App.tsx` | 다크 모드 orb 마크업 추가, 배경색 교체 |
| `src/components/GlassCard.tsx` | 다크 모드 글래스 스타일 강화 |
| `src/components/Sidebar.tsx` | 다크 active 인디케이터 추가 |
| `src/components/SentimentGauge.tsx` | 신규 생성 — 감성 분포 패널 |
| `src/components/Dashboard.tsx` | 스탯 카드 4개, 키워드 UI, SentimentGauge 삽입 |

---

## Task 0: 분석 모델 Gemma 전용으로 변경

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: GEMINI_MODELS 배열 교체 (완료)**

```ts
// 변경 전
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemma-3-1b-it', 'gemma-3-4b-it'];

// 변경 후
const GEMINI_MODELS = ['gemma-3-12b-it', 'gemma-3-27b-it'];
```

- Gemma 모델은 `responseMimeType: "application/json"` 미지원 → 기존 `isGemini` 조건 분기로 이미 처리됨 (변경 불필요)

- [ ] **Step 2: 브라우저에서 새로고침 → modelUsed 배지 확인**

`localhost:3000` → 새로고침 → 헤더 `gemma-3-12b-it` 또는 `gemma-3-27b-it` 표시 확인

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "feat: switch to Gemma-only model rotation (12b, 27b)"
```

---

## Task 1: 다크 모드 배경 — CSS orb 추가

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: `index.css`에 orb 애니메이션 및 다크 배경 CSS 추가**

기존 내용 아래에 추가:

```css
/* Dark mode — deep navy background */
.dark-bg {
  background:
    radial-gradient(ellipse at top left, #1a2b5c 0%, transparent 60%),
    radial-gradient(ellipse at bottom right, #0f1e3d 0%, transparent 55%),
    linear-gradient(160deg, #0a1428 0%, #0f1e3d 100%);
}

/* Orb animations */
.orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  animation: orbFloat 20s ease-in-out infinite;
}
.orb-1 {
  width: 520px; height: 520px;
  background: oklch(0.45 0.18 240);
  opacity: 0.45;
  top: -80px; left: -100px;
  animation-delay: 0s;
}
.orb-2 {
  width: 640px; height: 640px;
  background: oklch(0.5 0.16 210);
  opacity: 0.35;
  bottom: -200px; right: -150px;
  animation-delay: -7s;
}
.orb-3 {
  width: 400px; height: 400px;
  background: oklch(0.42 0.2 270);
  opacity: 0.28;
  top: 40%; left: 55%;
  animation-delay: -13s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(40px, -30px) scale(1.05); }
  66%       { transform: translate(-30px, 40px) scale(0.95); }
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /home/jpjp92/devs/github/news_monitoring/news_dash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: add dark mode orb animation CSS"
```

---

## Task 2: 다크 모드 배경 — App.tsx orb 마크업

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: App.tsx의 root div 배경색 및 orb 마크업 수정**

현재 `AppContent` 함수의 root div:
```tsx
<div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'} transition-colors duration-500 relative`}>
```

변경 후:
```tsx
<div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark dark-bg' : 'bg-slate-50'} transition-colors duration-500 relative`}>
```

- [ ] **Step 2: 기존 decorative circles 제거 후 조건부 orb 렌더링으로 교체**

현재 코드 (제거 대상):
```tsx
{/* Decorative Circles / Glow effects */}
<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

{/* Premium Vignette for Dark Mode */}
{theme === 'dark' && (
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>
)}
<div className={`absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full blur-[80px] pointer-events-none transition-colors duration-700 ${
  theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-300/30'
}`}></div>
```

위 코드 블록 전체를 아래로 교체:
```tsx
{/* Light mode decorative glow */}
{theme !== 'dark' && (
  <>
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>
    <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full blur-[80px] pointer-events-none bg-pink-300/30"></div>
  </>
)}
{/* Dark mode orbs */}
{theme === 'dark' && (
  <>
    <div className="orb orb-1"></div>
    <div className="orb orb-2"></div>
    <div className="orb orb-3"></div>
  </>
)}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 4: 브라우저에서 다크 모드 전환 확인**

`localhost:3000` 접속 → 다크 모드 토글 → 딥 네이비 배경 + orb 애니메이션 확인

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "style: replace dark mode background with deep navy + orb animation"
```

---

## Task 3: GlassCard 다크 모드 글래스 강화

**Files:**
- Modify: `src/components/GlassCard.tsx`

- [ ] **Step 1: GlassCard 다크 모드 클래스 교체**

현재:
```tsx
"bg-white/40 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] rounded-2xl transition-colors duration-300"
```

변경 후:
```tsx
"bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-2xl transition-colors duration-300 dark:bg-white/[0.055] dark:backdrop-blur-2xl dark:border-white/[0.11] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 3: 브라우저에서 다크 모드 카드 시각 확인**

다크 모드에서 카드들이 더 투명하고 배경 orb가 비치는지 확인

- [ ] **Step 4: Commit**

```bash
git add src/components/GlassCard.tsx
git commit -m "style: enhance dark mode glassmorphism on GlassCard"
```

---

## Task 4: Sidebar 다크 active 인디케이터

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: NavItem active 상태에 다크 모드 left accent bar 추가**

`Sidebar.tsx`의 `NavItem` 컴포넌트에서 active className을 다음과 같이 수정:

현재:
```tsx
active
  ? 'bg-white/60 dark:bg-white/10 text-indigo-700 dark:text-white shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] font-bold'
  : 'text-gray-600 dark:text-white/60 hover:bg-white/30 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white'
```

변경 후:
```tsx
active
  ? 'bg-white/60 dark:bg-white/[0.09] text-indigo-700 dark:text-white shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] font-bold dark:border dark:border-white/[0.18] relative'
  : 'text-gray-600 dark:text-white/60 hover:bg-white/30 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white'
```

- [ ] **Step 2: active 상태에 left glow bar span 추가**

`NavItem` 함수의 반환값에서 active일 때 왼쪽 인디케이터 추가:

```tsx
function NavItem({ icon, label, active = false, onClick, isOpen = true }: { ... }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-200 ${
        active
          ? 'bg-white/60 dark:bg-white/[0.09] text-indigo-700 dark:text-white shadow-sm font-bold dark:border dark:border-white/[0.18] relative'
          : 'text-gray-600 dark:text-white/60 hover:bg-white/30 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white'
      }`}
      title={!isOpen ? label : undefined}
    >
      {active && (
        <span className="hidden dark:block absolute -left-[17px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
      )}
      <div className="flex-shrink-0">{icon}</div>
      {isOpen && <span className="ml-3 whitespace-nowrap">{label}</span>}
    </button>
  );
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "style: add dark mode active indicator bar to sidebar nav items"
```

---

## Task 5: SentimentGauge 컴포넌트 신규 생성

**Files:**
- Create: `src/components/SentimentGauge.tsx`

- [ ] **Step 1: `SentimentGauge.tsx` 생성**

```tsx
import { useMemo } from 'react';
import { GlassCard } from './GlassCard';

interface SentimentGaugeProps {
  topics: { keyword: string; sentiment: string; score: number }[];
  loading?: boolean;
}

export function SentimentGauge({ topics, loading }: SentimentGaugeProps) {
  const counts = useMemo(() => {
    if (!topics.length) return { pos: 0, neu: 0, neg: 0, total: 1 };
    const pos = topics.filter(t => t.sentiment === 'positive').length;
    const neg = topics.filter(t => t.sentiment === 'negative').length;
    const neu = topics.length - pos - neg;
    return { pos, neu, neg, total: topics.length };
  }, [topics]);

  const posPct = Math.round((counts.pos / counts.total) * 100);
  const neuPct = Math.round((counts.neu / counts.total) * 100);
  const negPct = 100 - posPct - neuPct;

  const rows = [
    { label: '긍정', pct: posPct, dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]', textClass: 'text-emerald-400' },
    { label: '중립', pct: neuPct, dotClass: 'bg-slate-400',                                          textClass: 'text-slate-400' },
    { label: '부정', pct: negPct, dotClass: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.7)]',   textClass: 'text-rose-400' },
  ];

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">감성 분포</h3>
      <p className="text-xs text-gray-500 dark:text-white/40 mb-4">키워드 기반 · 전체 {counts.total}개</p>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-white/30 rounded-full w-full"></div>
          <div className="h-4 bg-white/30 rounded w-3/4"></div>
          <div className="h-4 bg-white/30 rounded w-3/4"></div>
          <div className="h-4 bg-white/30 rounded w-3/4"></div>
        </div>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            <div style={{ width: `${posPct}%` }} className="bg-emerald-400 transition-all duration-500" />
            <div style={{ width: `${neuPct}%` }} className="bg-slate-400 transition-all duration-500" />
            <div style={{ width: `${negPct}%` }} className="bg-rose-400 transition-all duration-500" />
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map(({ label, pct, dotClass, textClass }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-white/10 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                  <span className="text-sm text-gray-700 dark:text-white/80">{label}</span>
                </div>
                <span className={`text-sm font-semibold ${textClass}`}>{pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add src/components/SentimentGauge.tsx
git commit -m "feat: add SentimentGauge component"
```

---

## Task 6: Dashboard — 스탯 카드 4개로 확장

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: 감성 비율 계산 useMemo 추가**

`Dashboard.tsx`의 기존 `useMemo` 블록들 아래에 추가:

```tsx
const sentimentStats = useMemo(() => {
  const topics = data?.keyTopics || [];
  if (!topics.length) return { posPct: 0, negPct: 0 };
  const pos = topics.filter(t => t.sentiment === 'positive').length;
  const neg = topics.filter(t => t.sentiment === 'negative').length;
  const posPct = Math.round((pos / topics.length) * 100);
  const negPct = Math.round((neg / topics.length) * 100);
  return { posPct, negPct };
}, [data?.keyTopics]);
```

- [ ] **Step 2: 스탯 카드 grid를 4개로 교체**

현재 스탯 카드 섹션 (`{/* Stats Row */}` 블록 전체) 교체:

```tsx
{/* Stats Row */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
  {/* 기사 수 */}
  <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
    <div className="p-2 md:p-3 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
      <BookOpen size={20} className="md:w-6 md:h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">기사 수</p>
      <h3 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">
        {loading ? '..' : data?.summaries?.length || 0}
      </h3>
    </div>
  </GlassCard>

  {/* 긍정 비율 */}
  <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
    <div className="p-2 md:p-3 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
      <TrendingUp size={20} className="md:w-6 md:h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">긍정 비율</p>
      <h3 className="text-xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
        {loading ? '..' : `${sentimentStats.posPct}%`}
      </h3>
    </div>
  </GlassCard>

  {/* 부정 비율 */}
  <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
    <div className="p-2 md:p-3 bg-rose-100/50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
      <TrendingDown size={20} className="md:w-6 md:h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">부정 비율</p>
      <h3 className="text-xl md:text-3xl font-bold text-rose-500 dark:text-rose-400">
        {loading ? '..' : `${sentimentStats.negPct}%`}
      </h3>
    </div>
  </GlassCard>

  {/* 키워드 수 */}
  <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
    <div className="p-2 md:p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
      <Hash size={20} className="md:w-6 md:h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">키워드</p>
      <h3 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">
        {loading ? '..' : data?.keyTopics?.length || 0}
      </h3>
    </div>
  </GlassCard>
</div>
```

- [ ] **Step 3: import에 TrendingUp, TrendingDown 추가**

현재 import 줄:
```tsx
import { Activity, BookOpen, Hash, RefreshCw, AlertCircle, ChevronDown, ChevronUp, ArrowRight, Sparkles } from 'lucide-react';
```

변경 후:
```tsx
import { BookOpen, Hash, RefreshCw, AlertCircle, ChevronDown, ChevronUp, ArrowRight, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 5: 브라우저에서 스탯 카드 4개 확인**

`localhost:3000` → 대시보드 → 상단 카드 4개 확인 (기사 수 / 긍정% / 부정% / 키워드)

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: expand stat cards from 3 to 4 with sentiment ratio"
```

---

## Task 7: Dashboard — 키워드 UI를 progress bar로 교체

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: 키워드 섹션 교체**

기존 `{/* 실시간 인기 키워드 */}` GlassCard 블록 전체를 교체:

```tsx
<GlassCard className="p-5">
  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">실시간 인기 키워드</h3>
  <div className="space-y-0">
    {loading ? (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <div className="h-3 w-5 bg-white/30 rounded"></div>
            <div className="h-3 flex-1 bg-white/30 rounded"></div>
            <div className="h-2 w-16 bg-white/30 rounded"></div>
          </div>
        ))}
      </div>
    ) : (() => {
      const topics = data?.keyTopics || [];
      const maxScore = Math.max(...topics.map(t => t.score), 1);
      return topics.map((topic, idx) => (
        <div key={idx} className="flex items-center gap-2 py-2 border-b border-white/10 last:border-0">
          <span className="text-[10px] text-gray-400 dark:text-white/30 font-mono w-5 flex-shrink-0">
            {String(idx + 1).padStart(2, '0')}
          </span>
          <span className="text-sm text-gray-700 dark:text-white/85 font-medium flex-1 truncate">
            {topic.keyword}
          </span>
          <span className={`text-xs flex-shrink-0 ${
            topic.sentiment === 'positive' ? 'text-emerald-500' :
            topic.sentiment === 'negative' ? 'text-rose-500' :
            'text-slate-400'
          }`}>
            {topic.sentiment === 'positive' ? '↑' : topic.sentiment === 'negative' ? '↓' : '—'}
          </span>
          <div className="w-16 h-1 bg-white/10 dark:bg-white/[0.07] rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
              style={{ width: `${Math.round((topic.score / maxScore) * 100)}%` }}
            />
          </div>
        </div>
      ));
    })()}
  </div>
</GlassCard>
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 3: 브라우저에서 키워드 UI 확인**

키워드가 순위+progress bar 형태로 표시되는지 확인

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: replace keyword pills with ranked progress bar list"
```

---

## Task 8: Dashboard — SentimentGauge 우측 컬럼에 삽입

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: SentimentGauge import 추가**

`Dashboard.tsx` 상단 import에 추가:
```tsx
import { SentimentGauge } from './SentimentGauge';
```

- [ ] **Step 2: 우측 컬럼 최상단에 SentimentGauge 삽입**

`{/* Main Content Grid */}` 내 우측 `<div className="space-y-6">` 의 첫 번째 자식으로 추가:

```tsx
<div className="space-y-6">
  <SentimentGauge topics={data?.keyTopics || []} loading={loading} />

  {/* 주요 카테고리 분포 — 기존 유지 */}
  <GlassCard className="p-6">
    ...
  </GlassCard>

  {/* 실시간 인기 키워드 — Task 7에서 수정된 블록 */}
  <GlassCard className="p-5">
    ...
  </GlassCard>
</div>
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 4: 브라우저 — 라이트/다크 양쪽 최종 확인**

확인 항목:
- [ ] 라이트 모드: 4 카드 / 감성 분포 패널 / 키워드 바 정상 표시
- [ ] 다크 모드: 딥 네이비 배경 + orb / 글래스카드 투명도 / 사이드바 active 인디케이터
- [ ] 로딩 상태: skeleton 정상 표시
- [ ] 새로고침: 데이터 업데이트 후 감성 비율 반영

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: integrate SentimentGauge into dashboard right column"
```

---

## Self-Review

**스펙 커버리지 확인:**
- [x] 라이트/다크 공통 — 스탯 카드 4개 (Task 6)
- [x] 라이트/다크 공통 — 감성 분포 패널 (Task 5, 8)
- [x] 라이트/다크 공통 — 키워드 progress bar (Task 7)
- [x] 다크 모드 전용 — 딥 네이비 배경 + orb (Task 1, 2)
- [x] 다크 모드 전용 — GlassCard 강화 (Task 3)
- [x] 다크 모드 전용 — Sidebar active 인디케이터 (Task 4)

**타입 일관성:**
- `keyTopics: { keyword: string; sentiment: string; score: number }[]` — NewsContext에서 정의된 타입과 일치
- SentimentGauge props의 `topics` 타입이 Dashboard.tsx에서 넘기는 `data?.keyTopics` 타입과 일치
- `TrendingUp`, `TrendingDown` lucide-react에서 named export로 제공됨 (확인됨)
