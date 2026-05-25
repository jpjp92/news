// News list page
const NewsListPage = ({ openArticle }) => {
  const [cat, setCat] = React.useState('all');
  const [sort, setSort] = React.useState('recent');
  const [sentFilter, setSentFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [bookmarked, setBookmarked] = React.useState(new Set([2, 5]));

  const toggleBookmark = (id, e) => {
    e.stopPropagation();
    setBookmarked(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  let list = ARTICLES.slice();
  if (cat !== 'all') list = list.filter(a => a.category === cat);
  if (sentFilter !== 'all') list = list.filter(a => a.sentiment === sentFilter);
  if (q) list = list.filter(a => (a.title + a.summary + a.tags.join(' ')).toLowerCase().includes(q.toLowerCase()));
  if (sort === 'popular') list = list.sort((a,b) => parseFloat(b.reads) - parseFloat(a.reads));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><em>뉴스</em> 리스트</h1>
          <div className="page-sub"><span className="text-mono" style={{color: 'var(--accent)'}}>{list.length}</span>건의 기사가 필터링되었어요</div>
        </div>
        <div className="row gap-sm">
          <button className="btn"><Icon name="filter" size={14}/> 고급 필터</button>
          <button className="btn primary"><Icon name="plus" size={14}/> 새 알림 생성</button>
        </div>
      </div>

      {/* Filter bar */}
      <Glass className="card" style={{marginBottom: 14, padding: 18}}>
        <div className="col" style={{gap: 14}}>
          {/* Search + sort */}
          <div className="row" style={{gap: 12}}>
            <div className="search" style={{flex: 1, maxWidth: 'none'}}>
              <Icon name="search" size={16}/>
              <input placeholder="제목, 내용, 태그 검색..." value={q} onChange={e => setQ(e.target.value)}/>
              {q && <button className="icon-btn" style={{width: 24, height: 24, background: 'transparent', border: 'none'}} onClick={() => setQ('')}><Icon name="close" size={12}/></button>}
            </div>
            <div className="row gap-sm">
              <span className="text-xs text-tertiary">정렬</span>
              {[
                {id: 'recent', label: '최신순'},
                {id: 'popular', label: '조회수순'},
              ].map(s => (
                <span key={s.id} className={`chip ${sort === s.id ? 'active' : ''}`} onClick={() => setSort(s.id)}>{s.label}</span>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="row" style={{gap: 6, flexWrap: 'wrap'}}>
            {CATEGORIES.map(c => (
              <span key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
                {c.label} <span className="text-mono text-xs" style={{opacity: 0.6}}>{c.count}</span>
              </span>
            ))}
          </div>

          {/* Sentiment filter */}
          <div className="row gap-sm">
            <span className="text-xs text-tertiary" style={{marginRight: 4}}>감성</span>
            {[
              {id: 'all', label: '전체', dot: null},
              {id: 'pos', label: '긍정', dot: 'pos'},
              {id: 'neu', label: '중립', dot: 'neu'},
              {id: 'neg', label: '부정', dot: 'neg'},
            ].map(s => (
              <span key={s.id} className={`chip ${sentFilter === s.id ? 'active' : ''}`} onClick={() => setSentFilter(s.id)}>
                {s.dot && <span className={`sentiment-dot ${s.dot}`}></span>}
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </Glass>

      {/* List */}
      <div className="col" style={{gap: 10}}>
        {list.length === 0 && (
          <Glass className="card" style={{textAlign: 'center', padding: 40}}>
            <div className="text-serif" style={{fontSize: 22, marginBottom: 8}}>검색 결과가 없어요</div>
            <div className="text-sm text-tertiary">필터를 조정하거나 다른 키워드를 시도해 보세요</div>
          </Glass>
        )}
        {list.map((a, i) => (
          <Glass key={a.id} className="fade-in article-card" style={{padding: 18, animationDelay: `${Math.min(i*0.03, 0.3)}s`, cursor: 'pointer'}} onClick={() => openArticle(a)}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 20}}>
              <div>
                <div className="row gap-sm" style={{marginBottom: 10}}>
                  <span className="chip" style={{padding: '3px 8px', fontSize: 10}}>{a.categoryLabel}</span>
                  <span className="text-xs text-mono" style={{color: 'var(--accent)'}}>{a.source}</span>
                  <span className="text-xs text-tertiary">·</span>
                  <span className="text-xs text-tertiary">{a.time}</span>
                  <span className="row gap-sm text-xs" style={{marginLeft: 4}}>
                    <span className={`sentiment-dot ${a.sentiment}`}></span>
                    <span className={`sentiment-text ${a.sentiment}`} style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600}}>
                      {a.sentiment === 'pos' ? '긍정' : a.sentiment === 'neg' ? '부정' : '중립'}
                    </span>
                  </span>
                  {a.trending && <span className="chip" style={{padding: '3px 8px', fontSize: 10, color: 'var(--accent)', borderColor: 'var(--accent)'}}><Icon name="trending" size={10}/> 트렌딩</span>}
                </div>
                <div style={{fontSize: 17, fontWeight: 500, lineHeight: 1.35, marginBottom: 8, letterSpacing: '-0.01em'}}>{a.title}</div>
                <div className="text-sm text-secondary" style={{lineHeight: 1.55, marginBottom: 12, maxWidth: 780}}>{a.summary}</div>
                <div className="row gap-sm" style={{flexWrap: 'wrap'}}>
                  {a.tags.map(t => <span key={t} className="chip" style={{padding: '2px 8px', fontSize: 10}}>#{t}</span>)}
                </div>
              </div>
              <div className="col" style={{alignItems: 'flex-end', justifyContent: 'space-between'}}>
                <div className="row gap-sm">
                  <button className="icon-btn" style={{width: 32, height: 32}} onClick={(e) => toggleBookmark(a.id, e)}
                    title="북마크">
                    <Icon name="bookmark" size={14} />
                    {bookmarked.has(a.id) && <span style={{position: 'absolute', inset: 0, background: 'var(--accent-soft)', borderRadius: 'inherit'}}></span>}
                  </button>
                  <button className="icon-btn" style={{width: 32, height: 32}} onClick={(e) => e.stopPropagation()} title="공유"><Icon name="share" size={14}/></button>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div className="text-mono" style={{fontSize: 15, color: 'var(--text-secondary)'}}>{a.reads}</div>
                  <div className="text-xs text-tertiary">reads</div>
                </div>
              </div>
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
};

window.NewsListPage = NewsListPage;
