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
    { label: '긍정', pct: posPct, dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]', textClass: 'text-emerald-500 dark:text-emerald-400' },
    { label: '중립', pct: neuPct, dotClass: 'bg-slate-400',                                          textClass: 'text-slate-500 dark:text-slate-400' },
    { label: '부정', pct: negPct, dotClass: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.7)]',   textClass: 'text-rose-500 dark:text-rose-400' },
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
          <div className="space-y-1">
            {rows.map(({ label, pct, dotClass, textClass }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-black/5 dark:border-white/10 last:border-0">
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
