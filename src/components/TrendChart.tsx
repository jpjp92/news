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
}

const defaultData = [
  { label: '09:00', articles: 120, sentiment: 45 },
  { label: '10:00', articles: 210, sentiment: 52 },
  { label: '11:00', articles: 180, sentiment: 48 },
  { label: '12:00', articles: 290, sentiment: 61 },
  { label: '13:00', articles: 150, sentiment: 55 },
  { label: '14:00', articles: 320, sentiment: 65 },
  { label: '15:00', articles: 410, sentiment: 58 },
  { label: '16:00', articles: 380, sentiment: 62 },
];

export function TrendChart({ data, hideHeader = false, transparent = false, className = "" }: TrendChartProps) {
  const Container = (transparent ? 'div' : GlassCard) as any;
  const chartData = data || defaultData;
  
  if (data) {
    console.log('TrendChart received dynamic data:', data);
  } else {
    console.log('TrendChart using default/mock data');
  }
  
  return (
    <Container className={`p-6 h-full flex flex-col ${className}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">뉴스 발행량 및 감성 분석</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">분석된 보도 자료의 집계된 감정 동향</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
              <span className="text-gray-600 dark:text-gray-400">기사 발행량</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400"></span>
              <span className="text-gray-600 dark:text-gray-400">감성 분석</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
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
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 border border-white/50 dark:border-white/10 rounded-2xl shadow-xl">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-8">
                          <span className="text-sm text-gray-600 dark:text-gray-300">기사 발행량</span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{articles}개</span>
                        </div>
                        <div className="flex justify-between items-center gap-8">
                          <span className="text-sm text-gray-600 dark:text-gray-300">감성 분석</span>
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
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorArticles)" 
            />
            <Area 
              type="monotone" 
              dataKey="sentiment" 
              stroke="#a855f7" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSentiment)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Container>
  );
}
