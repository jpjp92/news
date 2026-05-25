// Dashboard page
const DashboardPage = ({ openArticle }) => {
  const topArticles = ARTICLES.filter(a => a.trending).slice(0, 3);
  const recentArticles = ARTICLES.slice(0, 5);

  // 24h trend data
  const trendData = [12, 18, 15, 22, 30, 28, 35, 42, 38, 45, 52, 48, 55, 62, 58, 65, 72, 68, 75, 70, 78, 82, 88, 94];
  const positiveData = [20, 22, 25, 28, 30, 32, 35, 38, 42, 45, 48, 50];
  const negativeData = [15, 18, 16, 20, 22, 20, 25, 24, 26, 28, 25, 30];
  const neutralData = [30, 32, 35, 40, 38, 42, 45, 48, 50, 52, 55, 58];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">좋은 오후입니다, <em>주현</em></h1>
          <div className="page-sub">지난 24시간 동안 <span className="text-mono" style={{color: 'var(--accent)'}}>1,248건</span>의 뉴스가 수집되었어요</div>
        </div>
        <div className="row gap-sm">
          <div className="live-pill"><span className="pulse"></span>LIVE · 실시간 수집중</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18}}>
        {[
          { label: '수집된 기사', value: '1,248', delta: '+12.4%', dir: 'up', spark: trendData, color: 'var(--accent)' },
          { label: '긍정 비율', value: '42%', delta: '+3.2%', dir: 'up', spark: positiveData, color: 'var(--positive)' },
          { label: '부정 비율', value: '21%', delta: '-1.8%', dir: 'down', spark: negativeData, color: 'var(--negative)' },
          { label: '핵심 키워드', value: '186', delta: '+24', dir: 'up', spark: neutralData, color: 'var(--accent-2)' },
        ].map((s, i) => (
          <Glass key={i} className="card fade-in" style={{animationDelay: `${i*0.06}s`}}>
            <div className="stat-label">{s.label}</div>
            <div className="row" style={{justifyContent: 'space-between', alignItems: 'flex-end'}}>
              <div>
                <div className={s.label.includes('%') || s.label.includes('키워드') ? 'stat-value mono' : 'stat-value'}>{s.value}</div>
                <div className="mt-sm"><span className={`delta ${s.dir}`}>{s.dir === 'up' ? '↑' : '↓'} {s.delta}</span></div>
              </div>
              <Sparkline data={s.spark} color={s.color} width={100} height={44} />
            </div>
          </Glass>
        ))}
      </div>

      {/* Main grid */}
      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 18}}>
        {/* Top stories */}
        <Glass className="card fade-in" style={{animationDelay: '0.25s'}}>
          <div className="row" style={{justifyContent: 'space-between', marginBottom: 18}}>
            <div>
              <div className="text-serif" style={{fontSize: 22}}>오늘의 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>주요 뉴스</em></div>
              <div className="text-xs text-tertiary mt-sm">가장 많이 언급되고 있는 스토리</div>
            </div>
            <button className="btn ghost text-sm"><Icon name="arrowRight" size={14}/> 전체보기</button>
          </div>
          <div className="col">
            {topArticles.map((a, i) => (
              <div key={a.id} onClick={() => openArticle(a)} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 16, padding: '14px 2px',
                borderTop: i === 0 ? 'none' : '1px solid var(--glass-border)', cursor: 'pointer',
              }} className="story-row">
                <div style={{fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--text-tertiary)', lineHeight: 1}}>0{i+1}</div>
                <div style={{minWidth: 0}}>
                  <div style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6}}>
                    <span className="text-xs text-mono" style={{color: 'var(--accent)'}}>{a.source}</span>
                    <span className="text-xs text-tertiary">·</span>
                    <span className="text-xs text-tertiary">{a.categoryLabel}</span>
                    <span className="text-xs text-tertiary">·</span>
                    <span className="text-xs text-tertiary">{a.time}</span>
                    <span className={`sentiment-dot ${a.sentiment}`} style={{marginLeft: 4}}></span>
                  </div>
                  <div style={{fontSize: 15, fontWeight: 500, lineHeight: 1.35, marginBottom: 4}}>{a.title}</div>
                  <div className="text-xs text-tertiary truncate" style={{maxWidth: 480}}>{a.summary}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div className="text-mono text-xs" style={{color: 'var(--text-secondary)'}}>{a.reads}</div>
                  <div className="text-xs text-tertiary">reads</div>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        {/* Sentiment gauge */}
        <Glass className="card fade-in" style={{animationDelay: '0.3s'}}>
          <div className="text-serif" style={{fontSize: 22, marginBottom: 4}}>감성 분포</div>
          <div className="text-xs text-tertiary" style={{marginBottom: 20}}>지난 24시간</div>

          {/* Stacked bar */}
          <div style={{display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 16}}>
            <div style={{width: '42%', background: 'var(--positive)'}}></div>
            <div style={{width: '37%', background: 'var(--neutral)'}}></div>
            <div style={{width: '21%', background: 'var(--negative)'}}></div>
          </div>

          <div className="col gap-sm">
            {[
              {label: '긍정', value: 42, cls: 'pos', count: 524},
              {label: '중립', value: 37, cls: 'neu', count: 462},
              {label: '부정', value: 21, cls: 'neg', count: 262},
            ].map(s => (
              <div key={s.label} className="row" style={{justifyContent: 'space-between'}}>
                <div className="row gap-sm">
                  <span className={`sentiment-dot ${s.cls}`}></span>
                  <span className="text-sm">{s.label}</span>
                </div>
                <div className="row gap-sm">
                  <span className="text-mono text-sm" style={{color: 'var(--text-secondary)'}}>{s.count}</span>
                  <span className="text-mono text-sm" style={{color: 'var(--text-tertiary)', width: 40, textAlign: 'right'}}>{s.value}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <div className="text-xs text-tertiary" style={{marginBottom: 10}}>긍정 비율 7일 추이</div>
          <Sparkline data={[35, 38, 36, 40, 39, 41, 42]} color="var(--positive)" width={240} height={48} />
        </Glass>
      </div>

      {/* Bottom grid */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14}}>
        {/* Trending keywords */}
        <Glass className="card fade-in" style={{animationDelay: '0.35s'}}>
          <div className="row" style={{justifyContent: 'space-between', marginBottom: 18}}>
            <div className="text-serif" style={{fontSize: 22}}>급상승 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>키워드</em></div>
            <span className="chip"><Icon name="trending" size={12}/> 24h</span>
          </div>
          <div className="col">
            {KEYWORDS.slice(0, 6).map((k, i) => (
              <div key={k.word} className="row" style={{justifyContent: 'space-between', padding: '8px 0', borderBottom: i === 5 ? 'none' : '1px solid var(--glass-border)'}}>
                <div className="row gap-sm">
                  <span className="text-mono text-xs text-tertiary" style={{width: 20}}>{String(i+1).padStart(2, '0')}</span>
                  <span style={{fontSize: 14, fontWeight: 500}}>{k.word}</span>
                  {k.trend === 'up' && <span className="delta up" style={{padding: '1px 6px', fontSize: 10}}>↑</span>}
                  {k.trend === 'down' && <span className="delta down" style={{padding: '1px 6px', fontSize: 10}}>↓</span>}
                </div>
                <div style={{width: 80, height: 4, background: 'var(--glass-bg)', borderRadius: 2, overflow: 'hidden'}}>
                  <div style={{width: `${k.weight}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))'}}></div>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        {/* Recent feed */}
        <Glass className="card fade-in" style={{animationDelay: '0.4s'}}>
          <div className="row" style={{justifyContent: 'space-between', marginBottom: 14}}>
            <div className="text-serif" style={{fontSize: 22}}>실시간 <em style={{color: 'var(--accent)', fontStyle: 'italic'}}>피드</em></div>
            <span className="live-pill"><span className="pulse"></span>LIVE</span>
          </div>
          <div className="col" style={{gap: 2}}>
            {recentArticles.map((a, i) => (
              <div key={a.id} onClick={() => openArticle(a)} style={{
                padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                transition: 'background .18s',
              }} className="feed-row">
                <div className="row gap-sm" style={{marginBottom: 3}}>
                  <span className={`sentiment-dot ${a.sentiment}`}></span>
                  <span className="text-xs text-mono" style={{color: 'var(--accent)'}}>{a.source}</span>
                  <span className="text-xs text-tertiary">·</span>
                  <span className="text-xs text-tertiary">{a.time}</span>
                </div>
                <div style={{fontSize: 13, fontWeight: 500, lineHeight: 1.35}} className="truncate">{a.title}</div>
              </div>
            ))}
          </div>
        </Glass>
      </div>
    </div>
  );
};

window.DashboardPage = DashboardPage;
