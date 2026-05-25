// Shared icons, mock data, primitives
// Exposes to window for cross-script access.

const Icon = ({ name, size = 18, stroke = 1.6 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
    news: <><path d="M4 5h12a2 2 0 0 1 2 2v11a2 2 0 0 0 2-2V7"/><path d="M4 5v13a2 2 0 0 0 2 2h12"/><path d="M7 9h6M7 13h6M7 17h4"/></>,
    chart: <><path d="M3 20h18"/><path d="M7 16V10"/><path d="M12 16V6"/><path d="M17 16v-8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>,
    filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>,
    sort: <><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></>,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="m10 14 11-11"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    tag: <><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></>,
    trending: <><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></>,
    x: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    close: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    arrowRight: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    palette: <><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.52-4.48-10-10-10z"/></>,
    sliders: <><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 9.15-9.15"/><path d="m16 8 3-3"/><path d="m18 10 3-3"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    pause: <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    spark: <path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.5 8.5 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.5-8.5 2.1-2.1"/>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className="ico">
      {paths[name]}
    </svg>
  );
};

// ============================================================
// Mock data
// ============================================================
const CATEGORIES = [
  { id: 'all', label: '전체', count: 1248 },
  { id: 'world', label: '세계', count: 287 },
  { id: 'tech', label: 'IT/과학', count: 342 },
  { id: 'society', label: '사회', count: 198 },
  { id: 'life', label: '생활/문화', count: 156 },
  { id: 'economy', label: '경제', count: 189 },
  { id: 'politics', label: '정치', count: 76 },
];

const SOURCES = ['연합뉴스', '조선일보', '한겨레', 'The Verge', 'Bloomberg', 'Reuters', 'TechCrunch', 'BBC', '중앙일보', 'MIT Tech Review'];

const ARTICLES = [
  {
    id: 1,
    title: 'AI 반도체 시장, 2026년 1조 달러 돌파 전망... 글로벌 경쟁 격화',
    summary: '시장조사기관 가트너는 AI 가속기 및 추론 칩 수요가 폭발적으로 증가하면서 내년에는 시장 규모가 1조 달러를 넘어설 것으로 전망했다. 삼성전자와 SK하이닉스의 HBM 점유율도 주목.',
    source: 'Bloomberg',
    category: 'tech',
    categoryLabel: 'IT/과학',
    time: '8분 전',
    timeAbs: '2026-04-19 14:22',
    sentiment: 'pos',
    reads: '12.4K',
    trending: true,
    tags: ['AI반도체', 'HBM', '삼성전자', '가트너'],
    pinned: false,
  },
  {
    id: 2,
    title: '연준, 6월 금리 동결 시사... 시장 반응 엇갈려',
    summary: '제롬 파월 연준 의장이 최근 연설에서 "인플레이션이 목표치에 근접했으나 지속성에 대한 확신이 필요하다"고 발언하며 6월 FOMC에서 금리 동결 가능성을 시사했다.',
    source: 'Reuters',
    category: 'economy',
    categoryLabel: '경제',
    time: '23분 전',
    timeAbs: '2026-04-19 14:07',
    sentiment: 'neu',
    reads: '8.2K',
    trending: true,
    tags: ['연준', 'FOMC', '금리', '파월'],
  },
  {
    id: 3,
    title: '기후 이상현상, 아시아 전역 4월 최고기온 갱신',
    summary: '세계기상기구(WMO)는 한국, 일본, 인도 등 아시아 12개국에서 4월 최고기온 기록이 경신됐다고 발표. 농업 생산성 감소 우려.',
    source: 'BBC',
    category: 'world',
    categoryLabel: '세계',
    time: '41분 전',
    timeAbs: '2026-04-19 13:49',
    sentiment: 'neg',
    reads: '5.7K',
    tags: ['기후변화', 'WMO', '이상기온'],
  },
  {
    id: 4,
    title: '전기차 충전 인프라, 전국 주요소 수 추월',
    summary: '국토교통부 통계에 따르면 공공·민간 충전기 수가 전국 주유소 수를 공식적으로 앞섰다. 정부는 2030년까지 200만기 확충 목표.',
    source: '연합뉴스',
    category: 'society',
    categoryLabel: '사회',
    time: '1시간 전',
    timeAbs: '2026-04-19 13:30',
    sentiment: 'pos',
    reads: '9.1K',
    tags: ['전기차', '충전인프라', '국토부'],
  },
  {
    id: 5,
    title: 'Apple Vision Pro 2세대, WWDC26서 공개 유력',
    summary: '블룸버그에 따르면 Apple은 WWDC 2026에서 경량화된 Vision Pro 2세대를 공개할 전망. 가격은 약 2,500달러로 인하될 가능성.',
    source: 'The Verge',
    category: 'tech',
    categoryLabel: 'IT/과학',
    time: '1시간 전',
    timeAbs: '2026-04-19 13:10',
    sentiment: 'pos',
    reads: '18.7K',
    trending: true,
    tags: ['Apple', 'VisionPro', 'WWDC', 'XR'],
  },
  {
    id: 6,
    title: '주요 대학 정시 경쟁률 하락... 의대는 여전히 30:1',
    summary: '2026학년도 정시 경쟁률이 전반적으로 하락했으나 의·약대는 평균 경쟁률 30:1로 여전히 높은 수치를 유지했다.',
    source: '중앙일보',
    category: 'society',
    categoryLabel: '사회',
    time: '2시간 전',
    timeAbs: '2026-04-19 12:40',
    sentiment: 'neu',
    reads: '4.2K',
    tags: ['정시', '대입', '의대'],
  },
  {
    id: 7,
    title: '한국영화 칸영화제 경쟁부문 2편 진출',
    summary: '제79회 칸영화제 공식 경쟁부문에 한국 감독의 신작 2편이 초청됐다. 주목할 만한 시선 부문에도 1편이 선정됐다.',
    source: '한겨레',
    category: 'life',
    categoryLabel: '생활/문화',
    time: '3시간 전',
    timeAbs: '2026-04-19 11:30',
    sentiment: 'pos',
    reads: '6.8K',
    tags: ['칸영화제', '한국영화', '문화'],
  },
  {
    id: 8,
    title: 'OpenAI, 오픈소스 모델 GPT-OSS 공개... 생태계 재편',
    summary: 'OpenAI가 최초로 공개한 오픈웨이트 모델 GPT-OSS(120B)가 Hugging Face에서 다운로드 1위를 기록. Meta Llama와의 경쟁 본격화.',
    source: 'TechCrunch',
    category: 'tech',
    categoryLabel: 'IT/과학',
    time: '4시간 전',
    timeAbs: '2026-04-19 10:20',
    sentiment: 'pos',
    reads: '24.1K',
    trending: true,
    tags: ['OpenAI', 'GPT-OSS', '오픈소스', 'Meta'],
  },
  {
    id: 9,
    title: '국내 스타트업 투자, 3분기 연속 감소세 지속',
    summary: '한국벤처캐피탈협회 발표에 따르면 1분기 국내 스타트업 투자 규모가 전년 동기 대비 18% 감소했다. 시드 단계 투자는 더 크게 위축.',
    source: '조선일보',
    category: 'economy',
    categoryLabel: '경제',
    time: '5시간 전',
    timeAbs: '2026-04-19 09:15',
    sentiment: 'neg',
    reads: '7.9K',
    tags: ['스타트업', '투자', 'VC'],
  },
  {
    id: 10,
    title: '유럽연합, 빅테크 디지털세 강화 법안 합의',
    summary: 'EU 회원국들이 글로벌 빅테크의 디지털 서비스 매출에 7% 디지털세를 부과하는 방안에 합의. 2027년 시행 예정.',
    source: 'Reuters',
    category: 'world',
    categoryLabel: '세계',
    time: '6시간 전',
    timeAbs: '2026-04-19 08:30',
    sentiment: 'neu',
    reads: '5.3K',
    tags: ['EU', '디지털세', '빅테크'],
  },
  {
    id: 11,
    title: '서울시, 공공자전거 따릉이 이용료 인상 논란',
    summary: '서울시가 2026년 7월부터 따릉이 기본 이용료를 1,000원에서 1,500원으로 인상한다고 발표하면서 시민 반발이 일고 있다.',
    source: '연합뉴스',
    category: 'society',
    categoryLabel: '사회',
    time: '8시간 전',
    timeAbs: '2026-04-19 06:10',
    sentiment: 'neg',
    reads: '11.2K',
    tags: ['따릉이', '서울시', '공공자전거'],
  },
  {
    id: 12,
    title: 'MIT, 차세대 양자 컴퓨터 오류율 획기적 감소',
    summary: 'MIT 연구진이 위상학적 큐비트 기반 양자 컴퓨터에서 오류율을 10분의 1로 줄이는 데 성공. 실용화 단계 앞당길 전망.',
    source: 'MIT Tech Review',
    category: 'tech',
    categoryLabel: 'IT/과학',
    time: '9시간 전',
    timeAbs: '2026-04-19 05:00',
    sentiment: 'pos',
    reads: '8.8K',
    tags: ['MIT', '양자컴퓨팅', '큐비트'],
  },
];

const KEYWORDS = [
  { word: 'AI반도체', weight: 98, trend: 'up' },
  { word: 'OpenAI', weight: 94, trend: 'up' },
  { word: '연준', weight: 82, trend: 'up' },
  { word: 'HBM', weight: 78, trend: 'up' },
  { word: 'Apple', weight: 74, trend: 'flat' },
  { word: '양자컴퓨팅', weight: 68, trend: 'up' },
  { word: '전기차', weight: 65, trend: 'flat' },
  { word: '기후변화', weight: 60, trend: 'up' },
  { word: '스타트업', weight: 54, trend: 'down' },
  { word: 'WWDC', weight: 52, trend: 'up' },
  { word: '디지털세', weight: 48, trend: 'up' },
  { word: '칸영화제', weight: 44, trend: 'flat' },
  { word: '의대정시', weight: 42, trend: 'down' },
  { word: 'VisionPro', weight: 40, trend: 'up' },
  { word: '따릉이', weight: 36, trend: 'down' },
  { word: 'Meta Llama', weight: 34, trend: 'flat' },
  { word: '삼성전자', weight: 32, trend: 'up' },
  { word: '금리동결', weight: 30, trend: 'flat' },
  { word: 'WMO', weight: 28, trend: 'up' },
  { word: 'FOMC', weight: 26, trend: 'flat' },
];

// Simple sparkline SVG
const Sparkline = ({ data, color, height = 40, width = 120, fill = true }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = fill ? `${path} L${width},${height} L0,${height} Z` : null;
  const id = React.useId();
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`}/>
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="3" fill={color}/>
    </svg>
  );
};

// ============================================================
// Glass card wrapper
// ============================================================
const Glass = ({ children, className = '', strong = false, ...rest }) => (
  <div className={`glass ${strong ? 'glass-strong' : ''} ${className}`} {...rest}>{children}</div>
);

Object.assign(window, { Icon, Sparkline, Glass, CATEGORIES, SOURCES, ARTICLES, KEYWORDS });
