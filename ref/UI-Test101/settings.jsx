// Settings page
const SettingsPage = () => {
  const [tab, setTab] = React.useState('profile');
  const [density, setDensity] = React.useState('balanced');
  const [notif, setNotif] = React.useState({push: true, email: true, digest: false, breaking: true});
  const [keywords, setKeywords] = React.useState(['AI반도체', '전기차', 'OpenAI', '연준']);
  const [newKw, setNewKw] = React.useState('');
  const [sourcesEnabled, setSourcesEnabled] = React.useState(new Set(['연합뉴스', 'Bloomberg', 'Reuters', 'The Verge', 'TechCrunch']));

  const tabs = [
    {id: 'profile', label: '프로필', icon: 'user'},
    {id: 'preferences', label: '개인화', icon: 'sliders'},
    {id: 'notifications', label: '알림', icon: 'bell'},
    {id: 'sources', label: '뉴스 소스', icon: 'database'},
    {id: 'account', label: '계정 · 보안', icon: 'lock'},
  ];

  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)} style={{
      width: 40, height: 22,
      background: on ? 'var(--accent)' : 'var(--glass-bg-strong)',
      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--glass-border)'),
      borderRadius: 99, position: 'relative', cursor: 'pointer', padding: 0,
      transition: 'all .22s', boxShadow: on ? '0 0 12px var(--accent-soft)' : 'none',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16,
        background: 'white', borderRadius: '50%', transition: 'left .22s cubic-bezier(.2,.8,.2,1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}/>
    </button>
  );

  const Row = ({ label, desc, children }) => (
    <div className="row" style={{justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--glass-border)', gap: 20}}>
      <div style={{flex: 1}}>
        <div style={{fontSize: 14, fontWeight: 500}}>{label}</div>
        {desc && <div className="text-xs text-tertiary" style={{marginTop: 4, lineHeight: 1.5}}>{desc}</div>}
      </div>
      <div style={{flexShrink: 0}}>{children}</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title"><em>설정</em></h1>
          <div className="page-sub">대시보드 경험을 나에게 맞게 조정해 보세요</div>
        </div>
        <button className="btn primary"><Icon name="check" size={14}/> 변경사항 저장</button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14}}>
        {/* Tabs */}
        <Glass className="card fade-in" style={{padding: 10, alignSelf: 'start'}}>
          <div className="col" style={{gap: 2}}>
            {tabs.map(t => (
              <div key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} style={{padding: '10px 12px'}}>
                <Icon name={t.icon} size={16}/>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </Glass>

        {/* Content */}
        <Glass className="card fade-in" style={{animationDelay: '0.1s', padding: 28}}>
          {tab === 'profile' && (
            <div>
              <div className="text-serif" style={{fontSize: 26, marginBottom: 4}}>프로필</div>
              <div className="text-xs text-tertiary" style={{marginBottom: 24}}>다른 사용자에게 보이는 정보입니다</div>
              <div className="row gap-lg" style={{marginBottom: 24, padding: 18, background: 'var(--glass-bg)', borderRadius: 16, border: '1px solid var(--glass-border)'}}>
                <div className="avatar" style={{width: 72, height: 72, fontSize: 24, borderRadius: 18}}>주</div>
                <div style={{flex: 1}}>
                  <div className="text-serif" style={{fontSize: 24}}>김주현</div>
                  <div className="text-sm text-tertiary" style={{marginTop: 2}}>juhyun.kim@example.com</div>
                  <div className="row gap-sm mt-md">
                    <button className="btn text-sm">아바타 변경</button>
                    <button className="btn ghost text-sm">삭제</button>
                  </div>
                </div>
              </div>

              {[
                {label: '이름', value: '김주현'},
                {label: '조직', value: '지식 큐레이션팀'},
                {label: '역할', value: '시니어 애널리스트'},
              ].map(f => (
                <div key={f.label} style={{marginBottom: 14}}>
                  <label className="text-xs text-tertiary" style={{display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600}}>{f.label}</label>
                  <input defaultValue={f.value} style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  }} onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = 'var(--glass-bg-strong)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.background = 'var(--glass-bg)'; }}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'preferences' && (
            <div>
              <div className="text-serif" style={{fontSize: 26, marginBottom: 4}}>개인화</div>
              <div className="text-xs text-tertiary" style={{marginBottom: 24}}>피드와 추천에 반영됩니다</div>

              <Row label="정보 밀도" desc="카드 크기와 리스트 간격을 조절합니다">
                <div className="row gap-sm">
                  {['compact', 'balanced', 'comfortable'].map(d => (
                    <span key={d} className={`chip ${density === d ? 'active' : ''}`} onClick={() => setDensity(d)}>
                      {d === 'compact' ? '컴팩트' : d === 'balanced' ? '밸런스' : '컴포트'}
                    </span>
                  ))}
                </div>
              </Row>

              <Row label="관심 키워드" desc="이 키워드가 포함된 기사를 우선 노출합니다">
                <span className="text-xs text-tertiary">{keywords.length}개 등록됨</span>
              </Row>
              <div className="row" style={{flexWrap: 'wrap', gap: 6, padding: '14px 0'}}>
                {keywords.map(k => (
                  <span key={k} className="chip active" style={{padding: '5px 10px'}}>
                    #{k}
                    <button onClick={() => setKeywords(keywords.filter(x => x !== k))}
                      style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 2}}>
                      <Icon name="x" size={10}/>
                    </button>
                  </span>
                ))}
                <div style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>
                  <input value={newKw} onChange={e => setNewKw(e.target.value)} 
                    onKeyDown={e => {if (e.key === 'Enter' && newKw.trim()) { setKeywords([...keywords, newKw.trim()]); setNewKw(''); }}}
                    placeholder="+ 키워드 추가" style={{
                      background: 'var(--glass-bg)', border: '1px dashed var(--glass-border)', 
                      borderRadius: 99, padding: '5px 12px', fontSize: 11, color: 'var(--text-primary)',
                      fontFamily: 'inherit', outline: 'none', width: 120,
                  }}/>
                </div>
              </div>

              <Row label="AI 요약 자동 생성" desc="기사를 열면 Haiku가 3줄 요약을 생성합니다">
                <Toggle on={true} onChange={() => {}}/>
              </Row>
              <Row label="읽은 기사 숨기기" desc="한번 읽은 기사는 피드에서 자동으로 감춥니다">
                <Toggle on={false} onChange={() => {}}/>
              </Row>
              <Row label="감성 분석 표시" desc="각 기사에 긍정/중립/부정 태그를 노출합니다">
                <Toggle on={true} onChange={() => {}}/>
              </Row>
            </div>
          )}

          {tab === 'notifications' && (
            <div>
              <div className="text-serif" style={{fontSize: 26, marginBottom: 4}}>알림</div>
              <div className="text-xs text-tertiary" style={{marginBottom: 24}}>중요한 소식만 받아볼 수 있도록 설정하세요</div>

              <Row label="푸시 알림" desc="브라우저 데스크탑 푸시 알림을 허용합니다">
                <Toggle on={notif.push} onChange={v => setNotif({...notif, push: v})}/>
              </Row>
              <Row label="이메일 알림" desc="juhyun.kim@example.com 으로 전송됩니다">
                <Toggle on={notif.email} onChange={v => setNotif({...notif, email: v})}/>
              </Row>
              <Row label="일일 다이제스트" desc="매일 오전 8시, 하루치 핵심 뉴스 10건을 요약해 보내드립니다">
                <Toggle on={notif.digest} onChange={v => setNotif({...notif, digest: v})}/>
              </Row>
              <Row label="속보 알림" desc="등록된 키워드 관련 속보가 감지되면 즉시 알려드립니다">
                <Toggle on={notif.breaking} onChange={v => setNotif({...notif, breaking: v})}/>
              </Row>

              <div style={{marginTop: 24, padding: 18, background: 'var(--accent-soft)', borderRadius: 14, border: '1px solid var(--accent)'}}>
                <div className="row gap-sm" style={{marginBottom: 8}}>
                  <Icon name="bell" size={14}/>
                  <span className="text-sm" style={{fontWeight: 600, color: 'var(--accent)'}}>방해 금지 시간</span>
                </div>
                <div className="text-xs text-secondary" style={{marginBottom: 12}}>이 시간 동안에는 푸시 알림이 전송되지 않아요</div>
                <div className="row gap-sm">
                  <input type="time" defaultValue="22:00" style={{background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12}}/>
                  <span className="text-sm text-tertiary">—</span>
                  <input type="time" defaultValue="07:00" style={{background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12}}/>
                </div>
              </div>
            </div>
          )}

          {tab === 'sources' && (
            <div>
              <div className="text-serif" style={{fontSize: 26, marginBottom: 4}}>뉴스 소스</div>
              <div className="text-xs text-tertiary" style={{marginBottom: 24}}>구독 중인 매체를 관리합니다 · {sourcesEnabled.size}개 활성</div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10}}>
                {SOURCES.map(s => {
                  const on = sourcesEnabled.has(s);
                  return (
                    <div key={s} onClick={() => {
                      const n = new Set(sourcesEnabled);
                      on ? n.delete(s) : n.add(s);
                      setSourcesEnabled(n);
                    }} style={{
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      background: on ? 'var(--glass-bg-strong)' : 'var(--glass-bg)',
                      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--glass-border)'),
                      transition: 'all .2s',
                    }}>
                      <div className="row" style={{justifyContent: 'space-between'}}>
                        <div>
                          <div style={{fontSize: 14, fontWeight: 500}}>{s}</div>
                          <div className="text-xs text-tertiary mt-sm">{Math.floor(Math.random()*200)+50} articles</div>
                        </div>
                        <Toggle on={on} onChange={() => {}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn ghost text-sm" style={{marginTop: 16}}><Icon name="plus" size={12}/> 커스텀 RSS 추가</button>
            </div>
          )}

          {tab === 'account' && (
            <div>
              <div className="text-serif" style={{fontSize: 26, marginBottom: 4}}>계정 · 보안</div>
              <div className="text-xs text-tertiary" style={{marginBottom: 24}}>로그인과 데이터 관련 설정입니다</div>
              <Row label="비밀번호 변경" desc="마지막 변경: 2026-02-14">
                <button className="btn text-sm"><Icon name="key" size={12}/> 변경</button>
              </Row>
              <Row label="2단계 인증" desc="OTP 앱을 통해 로그인 시 추가 인증을 요구합니다">
                <Toggle on={true} onChange={() => {}}/>
              </Row>
              <Row label="데이터 내보내기" desc="북마크·관심 키워드·읽음 기록을 JSON으로 다운로드">
                <button className="btn text-sm"><Icon name="external" size={12}/> 내보내기</button>
              </Row>
              <Row label="로그인 세션" desc="현재 3개 기기에서 로그인 중입니다">
                <button className="btn ghost text-sm">관리</button>
              </Row>
              <div style={{marginTop: 24, padding: 18, borderRadius: 14, border: '1px solid oklch(0.72 0.16 20 / 0.3)', background: 'oklch(0.72 0.16 20 / 0.06)'}}>
                <div className="text-sm" style={{fontWeight: 600, color: 'var(--negative)', marginBottom: 4}}>위험 구역</div>
                <div className="text-xs text-tertiary" style={{marginBottom: 12}}>계정을 삭제하면 모든 북마크·설정·읽음 기록이 영구 삭제됩니다</div>
                <button className="btn text-sm" style={{color: 'var(--negative)', borderColor: 'oklch(0.72 0.16 20 / 0.3)'}}>계정 삭제</button>
              </div>
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
};

window.SettingsPage = SettingsPage;
