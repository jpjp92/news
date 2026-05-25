// Analytics page — sentiment + keyword cloud + breakdowns
const AnalyticsPage = () => {
  const [range, setRange] = React.useState('24h');

  // 24-hour sentiment data (12 buckets)
  const pos = [22, 25, 28, 30, 32, 35, 42, 45, 48, 52, 50, 54];
  const neu = [30, 32, 35, 38, 40, 42, 45, 42, 40, 43, 45, 47];
  const neg = [15, 18, 16, 20, 22, 20, 25, 24, 26, 28, 25, 30];
  const labels = ['06', '08', '10', '12', '14', '16', '18', '20', '22', '00', '02', '04'];

  // Source breakdown
  const sources = [
    { name: '연합뉴스', count: 248, pct: 19.9 },
    { name: 'Bloomberg', count: 186, pct: 14.9 },
    { name: 'Reuters', count: 172, pct: 13.8 },
    { name: 'The Verge', count: 134, pct: 10.7 },
    { name: '조선일보', count: 112, pct: 9.0 },
    { name: 'TechCrunch', count: 98, pct: 7.9 },
    { name: 'BBC', count: 88, pct: 7.1 },
    { name: '기타', count: 210, pct: 16.7 },
  ];

  // Category breakdown for donut
  const categoryDist = [
    { label: 'IT/과학', value: 342, color: 'oklch(0.75 0.14 220)' },
    { label: '세계', value: 287, color: 'oklch(0.7 0.16 270)' },
    { label: '사회', value: 198, color: 'oklch(0.78 0.12 180)' },
    { label: '경제', value: 189, color: 'oklch(0.72 0.14 30)' },
    { label: '생활/문화', value: 156, color: 'oklch(0.82 0.1 90)' },
    { label: '정치', value: 76, color: 'oklch(0.65 0.14 310)' },
  ];
  const totalCat = categoryDist.reduce((s, c) => s + c.value, 0);

  // Donut path calc
  let acc = 0;
  const donutSegments = categoryDist.map(c => {
    const start = acc / totalCat;
    acc += c.value;
    const end = acc / totalCat;
    return { ...c, start, end };
  });

  const polarPoint = (pct, r) => {
    const a = (pct * 2 * Math.PI) - Math.PI / 2;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  };
  const arcPath = (startPct, endPct, rOuter, rInner) => {
    const large = endPct - startPct > 0.5 ? 1 : 0;
    const [sx, sy] = polarPoint(startPct, rOuter);
    const [ex, ey] = polarPoint(endPct, rOuter);
    const [isx, isy] = polarPoint(endPct, rInner);
    const [iex, iey] = polarPoint(startPct, rInner);
    return `M ${sx} ${sy} A ${rOuter} ${rOuter} 0 ${large} 1 ${ex} ${ey} L ${isx} ${isy} A ${rInner} ${rInner} 0 ${large} 0 ${iex} ${iey} Z`;
  };

  // Chart dimensions
  const chartW = 620, chartH = 220, padL = 36, padR = 12, padT = 16, padB = 28;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const maxVal = Math.max(...pos, ...neu, ...neg) * 1.15;
  const pathFor = (arr) => {
    const step = innerW / (arr.length - 1);
    return arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${padL + i * step},${padT + innerH - (v / maxVal) * innerH}`).join(' ');
  };
  const areaFor = (arr) => {
    const step = innerW / (arr.length - 1);
    const path = arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${padL + i * step},${padT + innerH - (v / maxVal) * innerH}`).join(' ');
    return `${path} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`;
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><em>분석</em> 인사이트</h1>
          <div className="page-sub">뉴스 감성, 키워드, 미디어 분포를 한눈에</div>
        </div>
        <div className="row gap-sm">
          {[
            {id: '24h', label: '24시간'},
            {id: '7d', label: '7일'},
            {id: '30d', label: '30일'},
          ].map(r => (
            <span key={r.id} className={`chip ${range === r.id ? 'active' : ''}`} onClick={() => setRange(r.id)}>{r.label}</span>
          ))}
        </div>
      </div>

      {/* Sentiment timeline */}
      <Glass className="card fade-in" style={{marginBottom: 14}}>
        <div className="row" style={{justifyContent: 'space-between', marginBottom: 18}}>
          <div>
            <div className="text-serif" style={{fontSize: 22}}>감성 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>타임라인</em></div>
            <div className="text-xs text-tertiary mt-sm">시간대별 긍정/중립/부정 기사 수</div>
          </div>
          <div className="row gap-sm">
            {[
              {label: '긍정', cls: 'pos'},
              {label: '중립', cls: 'neu'},
              {label: '부정', cls: 'neg'},
            ].map(l => (
              <div key={l.label} className="row gap-sm text-xs text-secondary"><span className={`sentiment-dot ${l.cls}`}></span>{l.label}</div>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{width: '100%', height: 'auto', display: 'block'}}>
          <defs>
            <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="var(--positive)" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="gradNeu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neutral)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--neutral)" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--negative)" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="var(--negative)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <g key={p}>
              <line x1={padL} y1={padT + innerH * p} x2={chartW - padR} y2={padT + innerH * p} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4"/>
              <text x={padL - 8} y={padT + innerH * p + 4} fill="rgba(203,213,225,0.4)" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
                {Math.round(maxVal * (1 - p))}
              </text>
            </g>
          ))}
          {/* X labels */}
          {labels.map((l, i) => {
            const step = innerW / (labels.length - 1);
            return <text key={i} x={padL + i * step} y={chartH - 8} fill="rgba(203,213,225,0.4)" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">{l}</text>;
          })}
          <path d={areaFor(pos)} fill="url(#gradPos)"/>
          <path d={areaFor(neu)} fill="url(#gradNeu)"/>
          <path d={areaFor(neg)} fill="url(#gradNeg)"/>
          <path d={pathFor(pos)} stroke="var(--positive)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <path d={pathFor(neu)} stroke="var(--neutral)" strokeWidth="1.8" fill="none" strokeDasharray="4 3" strokeLinecap="round"/>
          <path d={pathFor(neg)} stroke="var(--negative)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          {/* End dots */}
          {[{a: pos, c: 'var(--positive)'}, {a: neu, c: 'var(--neutral)'}, {a: neg, c: 'var(--negative)'}].map((s, i) => {
            const step = innerW / (s.a.length - 1);
            const x = padL + (s.a.length - 1) * step;
            const y = padT + innerH - (s.a[s.a.length-1] / maxVal) * innerH;
            return <circle key={i} cx={x} cy={y} r="3.5" fill={s.c}/>;
          })}
        </svg>
      </Glass>

      {/* Keyword cloud + Category donut */}
      <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14}}>
        <Glass className="card fade-in" style={{animationDelay: '0.1s'}}>
          <div className="row" style={{justifyContent: 'space-between', marginBottom: 18}}>
            <div>
              <div className="text-serif" style={{fontSize: 22}}>키워드 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>클라우드</em></div>
              <div className="text-xs text-tertiary mt-sm">크기 = 언급 빈도, 색상 = 트렌드</div>
            </div>
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center', padding: '20px 0', minHeight: 220}}>
            {KEYWORDS.map((k, i) => {
              const size = 12 + (k.weight / 100) * 28;
              const color = k.trend === 'up' ? 'var(--accent)' : k.trend === 'down' ? 'var(--negative)' : 'var(--text-secondary)';
              const opacity = 0.5 + (k.weight / 100) * 0.5;
              return (
                <span key={k.word} style={{
                  fontSize: size, color, opacity,
                  fontWeight: 500 + Math.floor((k.weight / 100) * 3) * 100,
                  fontFamily: k.weight > 70 ? 'var(--font-serif)' : 'var(--font-sans)',
                  fontStyle: k.weight > 70 ? 'italic' : 'normal',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  transition: 'transform .2s, opacity .2s',
                  letterSpacing: '-0.02em',
                }} className="cloud-word">{k.word}</span>
              );
            })}
          </div>
        </Glass>

        <Glass className="card fade-in" style={{animationDelay: '0.15s'}}>
          <div className="text-serif" style={{fontSize: 22, marginBottom: 4}}>카테고리 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>분포</em></div>
          <div className="text-xs text-tertiary" style={{marginBottom: 16}}>전체 {totalCat.toLocaleString()}건</div>
          <div className="row" style={{alignItems: 'center', gap: 16}}>
            <svg viewBox="0 0 100 100" style={{width: 140, height: 140, flexShrink: 0}}>
              {donutSegments.map((s, i) => (
                <path key={i} d={arcPath(s.start, s.end, 45, 28)} fill={s.color} opacity={0.85}>
                  <title>{s.label}: {s.value}</title>
                </path>
              ))}
              <text x="50" y="48" textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontFamily="var(--font-serif)">{totalCat.toLocaleString()}</text>
              <text x="50" y="60" textAnchor="middle" fill="var(--text-tertiary)" fontSize="5" fontFamily="var(--font-mono)" letterSpacing="1">ARTICLES</text>
            </svg>
            <div className="col" style={{flex: 1, gap: 6}}>
              {categoryDist.map(c => (
                <div key={c.label} className="row" style={{justifyContent: 'space-between'}}>
                  <div className="row gap-sm"><span style={{width: 8, height: 8, borderRadius: 2, background: c.color}}></span><span className="text-xs">{c.label}</span></div>
                  <span className="text-xs text-mono text-tertiary">{Math.round(c.value/totalCat*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Glass>
      </div>

      {/* Source breakdown + AI digest */}
      <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14}}>
        <Glass className="card fade-in" style={{animationDelay: '0.2s'}}>
          <div className="text-serif" style={{fontSize: 22, marginBottom: 4}}>매체별 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>발행량</em></div>
          <div className="text-xs text-tertiary" style={{marginBottom: 20}}>24시간 기준 기사 수</div>
          <div className="col" style={{gap: 10}}>
            {sources.map(s => (
              <div key={s.name}>
                <div className="row" style={{justifyContent: 'space-between', marginBottom: 5}}>
                  <span className="text-sm">{s.name}</span>
                  <div className="row gap-sm">
                    <span className="text-xs text-mono text-tertiary">{s.count}</span>
                    <span className="text-xs text-mono" style={{color: 'var(--text-secondary)', width: 40, textAlign: 'right'}}>{s.pct}%</span>
                  </div>
                </div>
                <div style={{height: 6, background: 'var(--glass-bg)', borderRadius: 3, overflow: 'hidden'}}>
                  <div style={{width: `${s.pct * 4}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 3}}></div>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        <Glass className="card fade-in" style={{animationDelay: '0.25s', background: 'linear-gradient(145deg, var(--accent-soft), var(--glass-bg))'}}>
          <div className="row gap-sm" style={{marginBottom: 14}}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="spark" size={14} />
            </div>
            <div className="text-xs text-mono" style={{color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em'}}>AI 인사이트</div>
          </div>
          <div className="text-serif" style={{fontSize: 22, lineHeight: 1.3, marginBottom: 16}}>
            오늘의 주요 흐름은 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>AI 반도체와 거시경제</em>에 집중되어 있어요.
          </div>
          <div className="text-sm text-secondary" style={{lineHeight: 1.65, marginBottom: 16}}>
            AI 칩 관련 긍정 언급이 전일 대비 <strong style={{color: 'var(--positive)'}}>+18%</strong> 증가했고, 
            연준 금리 동결 시사 이후 경제 섹션에서 중립 논조가 주를 이루고 있습니다. 
            부정 이슈는 이상기온·스타트업 투자 위축 관련입니다.
          </div>
          <button className="btn" style={{width: '100%', justifyContent: 'center'}}><Icon name="spark" size={14}/> 전체 리포트 생성</button>
        </Glass>
      </div>
    </div>
  );
};

window.AnalyticsPage = AnalyticsPage;
