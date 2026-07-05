import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from './GlassCard';

interface TrendDataPoint {
  label: string;
  articles: number;
  sentiment: number;
}

interface TrendChartProps {
  data?: TrendDataPoint[];
  hideHeader?: boolean;
  transparent?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  articlesLabel?: string;
  sentimentLabel?: string;
}

export function TrendChart({
  data,
  hideHeader = false,
  transparent = false,
  className = "",
  title = "뉴스 발행량 및 감성 분석",
  subtitle = "분석된 보도 자료의 집계된 감정 동향",
  articlesLabel = "기사 발행량",
  sentimentLabel = "감성 분석",
}: TrendChartProps) {
  const Container = (transparent ? 'div' : GlassCard) as any;
  const chartData = data || [];
  const hasData = chartData.length > 0;
  
  return (
    <Container className={`p-4 md:p-6 h-full flex flex-col ${className}`}>
      {!hideHeader && (
        <div className="flex items-start justify-between gap-3 mb-4 md:mb-6 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm md:text-lg font-bold text-gray-800 dark:text-white leading-tight">{title}</h3>
            <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{subtitle}</p>
          </div>
          <div className="flex flex-col xs:flex-row gap-1.5 xs:gap-3 md:gap-4 text-[10px] md:text-sm shrink-0">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#c83a32] dark:bg-[#d7a36f]"></span>
              <span className="text-gray-600 dark:text-gray-400">{articlesLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#1f6f68] dark:bg-[#7fb2a8]"></span>
              <span className="text-gray-600 dark:text-gray-400">{sentimentLabel}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 w-full min-h-0">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c83a32" stopOpacity={0.26}/>
                <stop offset="95%" stopColor="#c83a32" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f6f68" stopOpacity={0.24}/>
                <stop offset="95%" stopColor="#1f6f68" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,110,96,0.16)" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const articles = payload[0].value;
                  const sentiment = Math.round(Number(payload[1].value));
                  
                  let emoji = '😐';
                  let sentimentText = '중립적';
                  let sentimentColor = 'text-gray-500';

                  if (sentiment >= 80) {
                    emoji = '😊';
                    sentimentText = '매우 긍정';
                    sentimentColor = 'text-emerald-500';
                  } else if (sentiment >= 60) {
                    emoji = '🙂';
                    sentimentText = '긍정적';
                    sentimentColor = 'text-emerald-400';
                  } else if (sentiment <= 30) {
                    emoji = '😟';
                    sentimentText = '부정적';
                    sentimentColor = 'text-rose-500';
                  } else if (sentiment <= 45) {
                    emoji = '😕';
                    sentimentText = '다소 부정';
                    sentimentColor = 'text-rose-400';
                  }

                  return (
                    <div className="bg-white/90 dark:bg-[#191a18]/94 backdrop-blur-md p-4 border border-white/50 dark:border-white/10 rounded-xl shadow-xl">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-8">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{articlesLabel}</span>
                          <span className="text-sm font-bold text-[#c83a32] dark:text-[#d7a36f]">{articles}개</span>
                        </div>
                        <div className="flex justify-between items-center gap-8">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{sentimentLabel}</span>
                          <div className={`flex items-center gap-1.5 text-sm font-bold ${sentimentColor}`}>
                            <span>{emoji}</span>
                            <span>{sentimentText}</span>
                            <span className="text-[10px] opacity-50">({sentiment})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="articles" 
              stroke="#c83a32" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorArticles)" 
            />
            <Area 
              type="monotone" 
              dataKey="sentiment" 
              stroke="#1f6f68" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSentiment)" 
            />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full min-h-[180px] flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-white/20 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-400 dark:text-white/30">표시할 분석 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </Container>
  );
}
