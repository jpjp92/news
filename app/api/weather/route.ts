import { NextResponse } from 'next/server';
import { logger } from '@/src/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WeatherEntry = {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind?: {
    speed: number;
    deg?: number;
    gust?: number;
  };
  clouds?: {
    all: number;
  };
  pop?: number;
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
  visibility?: number;
};

type CurrentResponse = WeatherEntry & {
  name: string;
  sys?: {
    country?: string;
  };
  timezone?: number;
};

type ForecastResponse = {
  city?: {
    name?: string;
    country?: string;
    timezone?: number;
  };
  list?: WeatherEntry[];
};

type GeoResponse = Array<{
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}>;

type CityAlias = {
  query: string;
  label?: string;
};

type DailyWeather = {
  date: string;
  minTemp: number;
  maxTemp: number;
  description: string;
  main: string;
  icon: string;
  avgHumidity: number;
  precipitationChance: number;
  rainMm: number;
  snowMm: number;
};

type WeatherData = {
  source: 'KMA' | 'OpenWeather';
  updatedAt: string;
  location: {
    name: string;
    country: string;
    resolvedName?: string;
    input?: string;
    source?: string;
    timezone: number;
  };
  current: {
    temp: number;
    feelsLike: number;
    minTemp: number;
    maxTemp: number;
    humidity: number;
    pressure: number | null;
    windSpeed: number;
    windGust: number | null;
    clouds: number;
    visibilityKm: number | null;
    description: string;
    main: string;
    icon: string;
    rainMm: number;
    snowMm: number;
    observedAt: string;
  };
  daily: DailyWeather[];
  notes: string[];
};

type KmaCityMeta = {
  label: string;
  openWeatherQuery: string;
  nx: number;
  ny: number;
  shortRegId: string;
  stnId: number;
};

type KmaApiItem = Record<string, string | number | undefined>;

const KMA_BASE = 'https://apihub.kma.go.kr/api';

const CITY_ALIASES: Record<string, CityAlias> = {
  서울: { query: 'Seoul,KR', label: '서울' },
  서울시: { query: 'Seoul,KR', label: '서울' },
  부산: { query: 'Busan,KR', label: '부산' },
  대구: { query: 'Daegu,KR', label: '대구' },
  인천: { query: 'Incheon,KR', label: '인천' },
  광주: { query: 'Gwangju,KR', label: '광주' },
  대전: { query: 'Daejeon,KR', label: '대전' },
  울산: { query: 'Ulsan,KR', label: '울산' },
  세종: { query: 'Sejong,KR', label: '세종' },
  수원: { query: 'Suwon,KR', label: '수원' },
  성남: { query: 'Seongnam,KR', label: '성남' },
  용인: { query: 'Yongin,KR', label: '용인' },
  고양: { query: 'Goyang,KR', label: '고양' },
  제주: { query: 'Jeju,KR', label: '제주' },
  제주시: { query: 'Jeju,KR', label: '제주' },
  서귀포: { query: 'Seogwipo,KR', label: '서귀포' },
  춘천: { query: 'Chuncheon,KR', label: '춘천' },
  강릉: { query: 'Gangneung,KR', label: '강릉' },
  청주: { query: 'Cheongju,KR', label: '청주' },
  전주: { query: 'Jeonju,KR', label: '전주' },
  포항: { query: 'Pohang,KR', label: '포항' },
  창원: { query: 'Changwon,KR', label: '창원' },
  여수: { query: 'Yeosu,KR', label: '여수' },
  목포: { query: 'Mokpo,KR', label: '목포' },
  도쿄: { query: 'Tokyo,JP', label: '도쿄' },
  오사카: { query: 'Osaka,JP', label: '오사카' },
  교토: { query: 'Kyoto,JP', label: '교토' },
  후쿠오카: { query: 'Fukuoka,JP', label: '후쿠오카' },
  삿포로: { query: 'Sapporo,JP', label: '삿포로' },
  베이징: { query: 'Beijing,CN', label: '베이징' },
  상하이: { query: 'Shanghai,CN', label: '상하이' },
  홍콩: { query: 'Hong Kong,HK', label: '홍콩' },
  타이베이: { query: 'Taipei,TW', label: '타이베이' },
  방콕: { query: 'Bangkok,TH', label: '방콕' },
  싱가포르: { query: 'Singapore,SG', label: '싱가포르' },
  하노이: { query: 'Hanoi,VN', label: '하노이' },
  호치민: { query: 'Ho Chi Minh City,VN', label: '호치민' },
  마닐라: { query: 'Manila,PH', label: '마닐라' },
  자카르타: { query: 'Jakarta,ID', label: '자카르타' },
  런던: { query: 'London,GB', label: '런던' },
  파리: { query: 'Paris,FR', label: '파리' },
  베를린: { query: 'Berlin,DE', label: '베를린' },
  로마: { query: 'Rome,IT', label: '로마' },
  밀라노: { query: 'Milan,IT', label: '밀라노' },
  마드리드: { query: 'Madrid,ES', label: '마드리드' },
  바르셀로나: { query: 'Barcelona,ES', label: '바르셀로나' },
  암스테르담: { query: 'Amsterdam,NL', label: '암스테르담' },
  취리히: { query: 'Zurich,CH', label: '취리히' },
  빈: { query: 'Vienna,AT', label: '빈' },
  프라하: { query: 'Prague,CZ', label: '프라하' },
  뉴욕: { query: 'New York,US', label: '뉴욕' },
  '뉴욕시': { query: 'New York,US', label: '뉴욕' },
  워싱턴: { query: 'Washington,US', label: '워싱턴' },
  로스앤젤레스: { query: 'Los Angeles,US', label: '로스앤젤레스' },
  엘에이: { query: 'Los Angeles,US', label: '로스앤젤레스' },
  시카고: { query: 'Chicago,US', label: '시카고' },
  샌프란시스코: { query: 'San Francisco,US', label: '샌프란시스코' },
  시애틀: { query: 'Seattle,US', label: '시애틀' },
  라스베이거스: { query: 'Las Vegas,US', label: '라스베이거스' },
  토론토: { query: 'Toronto,CA', label: '토론토' },
  밴쿠버: { query: 'Vancouver,CA', label: '밴쿠버' },
  시드니: { query: 'Sydney,AU', label: '시드니' },
  멜버른: { query: 'Melbourne,AU', label: '멜버른' },
  오클랜드: { query: 'Auckland,NZ', label: '오클랜드' },
};

const KMA_CITIES: Record<string, KmaCityMeta> = {
  서울: { label: '서울', openWeatherQuery: 'Seoul,KR', nx: 60, ny: 127, shortRegId: '11B10101', stnId: 109 },
  서울시: { label: '서울', openWeatherQuery: 'Seoul,KR', nx: 60, ny: 127, shortRegId: '11B10101', stnId: 109 },
  부산: { label: '부산', openWeatherQuery: 'Busan,KR', nx: 98, ny: 76, shortRegId: '11H20201', stnId: 159 },
  대구: { label: '대구', openWeatherQuery: 'Daegu,KR', nx: 89, ny: 90, shortRegId: '11H10701', stnId: 143 },
  인천: { label: '인천', openWeatherQuery: 'Incheon,KR', nx: 55, ny: 124, shortRegId: '11B20201', stnId: 109 },
  광주: { label: '광주', openWeatherQuery: 'Gwangju,KR', nx: 58, ny: 74, shortRegId: '11F20501', stnId: 156 },
  대전: { label: '대전', openWeatherQuery: 'Daejeon,KR', nx: 67, ny: 100, shortRegId: '11C20401', stnId: 133 },
  울산: { label: '울산', openWeatherQuery: 'Ulsan,KR', nx: 102, ny: 84, shortRegId: '11H20101', stnId: 159 },
  세종: { label: '세종', openWeatherQuery: 'Sejong,KR', nx: 66, ny: 103, shortRegId: '11C20404', stnId: 133 },
  수원: { label: '수원', openWeatherQuery: 'Suwon,KR', nx: 60, ny: 121, shortRegId: '11B20601', stnId: 109 },
  성남: { label: '성남', openWeatherQuery: 'Seongnam,KR', nx: 63, ny: 124, shortRegId: '11B20605', stnId: 109 },
  용인: { label: '용인', openWeatherQuery: 'Yongin,KR', nx: 64, ny: 119, shortRegId: '11B20612', stnId: 109 },
  고양: { label: '고양', openWeatherQuery: 'Goyang,KR', nx: 57, ny: 128, shortRegId: '11B20302', stnId: 109 },
  제주: { label: '제주', openWeatherQuery: 'Jeju,KR', nx: 52, ny: 38, shortRegId: '11G00201', stnId: 184 },
  제주시: { label: '제주', openWeatherQuery: 'Jeju,KR', nx: 52, ny: 38, shortRegId: '11G00201', stnId: 184 },
  서귀포: { label: '서귀포', openWeatherQuery: 'Seogwipo,KR', nx: 52, ny: 33, shortRegId: '11G00401', stnId: 184 },
  춘천: { label: '춘천', openWeatherQuery: 'Chuncheon,KR', nx: 73, ny: 134, shortRegId: '11D10301', stnId: 105 },
  강릉: { label: '강릉', openWeatherQuery: 'Gangneung,KR', nx: 92, ny: 131, shortRegId: '11D20501', stnId: 105 },
  청주: { label: '청주', openWeatherQuery: 'Cheongju,KR', nx: 69, ny: 106, shortRegId: '11C10301', stnId: 131 },
  전주: { label: '전주', openWeatherQuery: 'Jeonju,KR', nx: 63, ny: 89, shortRegId: '11F10201', stnId: 146 },
  포항: { label: '포항', openWeatherQuery: 'Pohang,KR', nx: 102, ny: 94, shortRegId: '11H10201', stnId: 143 },
  창원: { label: '창원', openWeatherQuery: 'Changwon,KR', nx: 90, ny: 77, shortRegId: '11H20301', stnId: 159 },
  여수: { label: '여수', openWeatherQuery: 'Yeosu,KR', nx: 73, ny: 66, shortRegId: '11F20401', stnId: 156 },
  목포: { label: '목포', openWeatherQuery: 'Mokpo,KR', nx: 50, ny: 67, shortRegId: '21F20801', stnId: 156 },
};

const PTY_LABELS: Record<number, string | null> = {
  0: null,
  1: '비',
  2: '비 또는 눈',
  3: '눈',
  4: '소나기',
  5: '빗방울',
  6: '빗방울 또는 눈날림',
  7: '눈날림',
};

const SKY_LABELS: Record<number, string> = {
  1: '맑음',
  3: '구름많음',
  4: '흐림',
};

function openWeatherKey() {
  return process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_KEY;
}

function kmaKey() {
  return process.env.KMA_API_KEY;
}

function normalizeCityInput(city: string) {
  return city.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function compactCity(city: string) {
  return normalizeCityInput(city).replace(/\s+/g, '').toLowerCase();
}

function cityAlias(city: string) {
  const normalized = normalizeCityInput(city);
  const compact = compactCity(normalized);
  return CITY_ALIASES[normalized] || CITY_ALIASES[compact];
}

function kmaCity(city: string) {
  const normalized = normalizeCityInput(city);
  const compact = compactCity(normalized);
  return KMA_CITIES[normalized] || KMA_CITIES[compact];
}

function localDate(epochSeconds: number, timezoneSeconds = 0) {
  return new Date((epochSeconds + timezoneSeconds) * 1000).toISOString().slice(0, 10);
}

function formatKst(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return { ymd: `${yyyy}${mm}${dd}`, h: hh };
}

function latestHourlyBase() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  now.setUTCMinutes(0, 0, 0);
  now.setUTCHours(now.getUTCHours() - 1);
  const { ymd, h } = formatKst(now);
  return { baseDate: ymd, baseTime: `${h}00` };
}

function latestVillageForecastBase() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const slots = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const available = slots
    .map(slot => ({ slot, minutes: Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2)) + 20 }))
    .filter(item => currentMinutes >= item.minutes);

  if (!available.length) now.setUTCDate(now.getUTCDate() - 1);

  const { ymd } = formatKst(now);
  return { baseDate: ymd, baseTime: available.at(-1)?.slot || '2300' };
}

function isoFromKst(ymd: string, hm: string) {
  const yyyy = Number(ymd.slice(0, 4));
  const mm = Number(ymd.slice(4, 6));
  const dd = Number(ymd.slice(6, 8));
  const hh = Number(hm.slice(0, 2));
  const min = Number(hm.slice(2, 4) || 0);
  return new Date(Date.UTC(yyyy, mm - 1, dd, hh - 9, min)).toISOString();
}

function dateFromYmd(ymd: string) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function numericValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (value === '강수없음' || value === '적설없음') return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function dominantWeather(entries: WeatherEntry[]) {
  const counts = new Map<string, { count: number; description: string; icon: string; main: string }>();
  for (const entry of entries) {
    const weather = entry.weather?.[0];
    if (!weather) continue;
    const key = weather.description || weather.main;
    const prev = counts.get(key);
    counts.set(key, {
      count: (prev?.count || 0) + 1,
      description: weather.description,
      icon: weather.icon,
      main: weather.main,
    });
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)[0] || {
    description: '정보 없음',
    icon: '01d',
    main: 'Unknown',
  };
}

function summarizeForecast(forecast: ForecastResponse): DailyWeather[] {
  const timezone = forecast.city?.timezone || 0;
  const grouped = new Map<string, WeatherEntry[]>();

  for (const entry of forecast.list || []) {
    const date = localDate(entry.dt, timezone);
    grouped.set(date, [...(grouped.get(date) || []), entry]);
  }

  return Array.from(grouped.entries()).slice(0, 5).map(([date, entries]) => {
    const weather = dominantWeather(entries);
    const temps = entries.flatMap(entry => [entry.main.temp_min, entry.main.temp_max]);
    const humidity = entries.reduce((sum, entry) => sum + entry.main.humidity, 0) / entries.length;
    const pop = Math.max(...entries.map(entry => entry.pop || 0));
    const rain = entries.reduce((sum, entry) => sum + (entry.rain?.['3h'] || 0), 0);
    const snow = entries.reduce((sum, entry) => sum + (entry.snow?.['3h'] || 0), 0);

    return {
      date,
      minTemp: Math.round(Math.min(...temps)),
      maxTemp: Math.round(Math.max(...temps)),
      description: weather.description,
      main: weather.main,
      icon: weather.icon,
      avgHumidity: Math.round(humidity),
      precipitationChance: Math.round(pop * 100),
      rainMm: Number(rain.toFixed(1)),
      snowMm: Number(snow.toFixed(1)),
    };
  });
}

function weatherNotes(current: CurrentResponse, forecast: ForecastResponse) {
  const notes: string[] = [];
  const today = summarizeForecast(forecast)[0];
  const temp = Math.round(current.main.temp);
  const wind = current.wind?.speed || 0;

  if (today && today.precipitationChance >= 50) {
    notes.push(`오늘 강수 확률이 ${today.precipitationChance}%로 높습니다.`);
  }
  if (today && today.rainMm > 0) {
    notes.push(`예상 강수량은 약 ${today.rainMm}mm입니다.`);
  }
  if (temp >= 30) {
    notes.push('기온이 높아 야외 일정은 더위 대비가 필요합니다.');
  } else if (temp <= 0) {
    notes.push('영하권 기온입니다. 결빙과 체감온도에 유의하세요.');
  }
  if (wind >= 8) {
    notes.push(`바람이 강한 편입니다. 현재 풍속은 ${wind.toFixed(1)}m/s입니다.`);
  }

  return notes.length > 0 ? notes : ['현재 확인되는 특이 기상 이슈는 없습니다.'];
}

async function fetchOpenWeather<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 600 },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `OpenWeather request failed (${response.status})`);
  }

  return data as T;
}

async function resolveCity(city: string, apiKey: string, queryOverride?: string) {
  const normalizedCity = normalizeCityInput(city);
  const alias = cityAlias(normalizedCity);
  const query = queryOverride || alias?.query || normalizedCity;
  const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
  const geo = await fetchOpenWeather<GeoResponse>(geocodeUrl);
  const match = geo[0];

  if (!match) {
    const error = new Error('도시를 찾지 못했습니다. 도시 이름을 영어로 입력해보세요.');
    (error as any).status = 404;
    (error as any).code = 'CITY_NOT_FOUND';
    throw error;
  }

  return {
    input: normalizedCity,
    query,
    label: alias?.label || match.local_names?.ko || match.name,
    name: match.name,
    country: match.country,
    state: match.state,
    lat: match.lat,
    lon: match.lon,
    source: alias ? 'alias' : 'geocoding',
  };
}

async function buildOpenWeatherData(city: string, queryOverride?: string): Promise<WeatherData> {
  const apiKey = openWeatherKey();
  if (!apiKey) {
    const error = new Error('날씨 서비스 설정을 확인해야 합니다.');
    (error as any).status = 500;
    (error as any).code = 'WEATHER_CONFIG_MISSING';
    throw error;
  }

  const resolved = await resolveCity(city, apiKey, queryOverride);
  const params = `lat=${resolved.lat}&lon=${resolved.lon}&appid=${apiKey}&units=metric&lang=kr`;

  const [current, forecast] = await Promise.all([
    fetchOpenWeather<CurrentResponse>(`https://api.openweathermap.org/data/2.5/weather?${params}`),
    fetchOpenWeather<ForecastResponse>(`https://api.openweathermap.org/data/2.5/forecast?${params}`),
  ]);

  const daily = summarizeForecast(forecast);

  return {
    source: 'OpenWeather',
    updatedAt: new Date().toISOString(),
    location: {
      name: resolved.label || current.name || forecast.city?.name || city,
      country: current.sys?.country || forecast.city?.country || resolved.country || '',
      resolvedName: resolved.name,
      input: resolved.input,
      source: resolved.source,
      timezone: current.timezone || forecast.city?.timezone || 0,
    },
    current: {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      minTemp: Math.round(current.main.temp_min),
      maxTemp: Math.round(current.main.temp_max),
      humidity: current.main.humidity,
      pressure: current.main.pressure,
      windSpeed: Number((current.wind?.speed || 0).toFixed(1)),
      windGust: current.wind?.gust ? Number(current.wind.gust.toFixed(1)) : null,
      clouds: current.clouds?.all || 0,
      visibilityKm: current.visibility ? Number((current.visibility / 1000).toFixed(1)) : null,
      description: current.weather?.[0]?.description || '정보 없음',
      main: current.weather?.[0]?.main || 'Unknown',
      icon: current.weather?.[0]?.icon || '01d',
      rainMm: current.rain?.['1h'] || 0,
      snowMm: current.snow?.['1h'] || 0,
      observedAt: new Date(current.dt * 1000).toISOString(),
    },
    daily,
    notes: weatherNotes(current, forecast),
  };
}

function kmaItems(json: any): KmaApiItem[] {
  const item = json?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

async function fetchKma(path: string, query: Record<string, string>) {
  const apiKey = kmaKey();
  if (!apiKey) {
    const error = new Error('KMA_API_KEY가 없습니다.');
    (error as any).code = 'KMA_CONFIG_MISSING';
    throw error;
  }

  const params = new URLSearchParams({ ...query, authKey: apiKey });
  const response = await fetch(`${KMA_BASE}${path}?${params.toString()}`, {
    headers: { Accept: 'application/json,*/*', 'User-Agent': 'news-dash-weather/1.0' },
    next: { revalidate: 600 },
  });
  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`KMA JSON 파싱 실패 (${response.status})`);
  }

  const header = data?.response?.header;
  if (!response.ok || (header && header.resultCode !== '00')) {
    throw new Error(header?.resultMsg || `KMA request failed (${response.status})`);
  }

  return data;
}

function kmaCategoryMap(rows: KmaApiItem[], valueField: 'obsrValue' | 'fcstValue') {
  const values: Record<string, string> = {};
  for (const row of rows) {
    const category = String(row.category || '');
    if (!category) continue;
    values[category] = String(row[valueField] ?? '');
  }
  return values;
}

function groupKmaForecast(rows: KmaApiItem[]) {
  const grouped = new Map<string, { fcstDate: string; fcstTime: string; values: Record<string, string> }>();

  for (const row of rows) {
    const fcstDate = String(row.fcstDate || '');
    const fcstTime = String(row.fcstTime || '');
    const category = String(row.category || '');
    if (!fcstDate || !fcstTime || !category) continue;

    const key = `${fcstDate}${fcstTime}`;
    const entry = grouped.get(key) || { fcstDate, fcstTime, values: {} };
    entry.values[category] = String(row.fcstValue ?? '');
    grouped.set(key, entry);
  }

  return Array.from(grouped.values()).sort((a, b) => `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`));
}

function kmaCondition(values: Record<string, string>) {
  const pty = Number(values.PTY || 0);
  if (pty && PTY_LABELS[pty]) return PTY_LABELS[pty] || '정보 없음';
  return SKY_LABELS[Number(values.SKY || 1)] || '정보 없음';
}

function kmaIcon(values: Record<string, string>) {
  const pty = Number(values.PTY || 0);
  const sky = Number(values.SKY || 1);
  if ([1, 4, 5].includes(pty)) return '10d';
  if ([2, 3, 6, 7].includes(pty)) return '13d';
  if (sky === 4) return '04d';
  if (sky === 3) return '03d';
  return '01d';
}

function mainFromDescription(description: string) {
  if (description.includes('비')) return 'Rain';
  if (description.includes('눈')) return 'Snow';
  if (description.includes('흐림') || description.includes('구름')) return 'Clouds';
  if (description.includes('맑음')) return 'Clear';
  return 'Unknown';
}

function summarizeKmaDaily(villageRows: KmaApiItem[]): DailyWeather[] {
  const groupedByDate = new Map<string, Record<string, string>[]>();

  for (const row of groupKmaForecast(villageRows)) {
    const date = dateFromYmd(row.fcstDate);
    groupedByDate.set(date, [...(groupedByDate.get(date) || []), row.values]);
  }

  return Array.from(groupedByDate.entries()).slice(0, 5).map(([date, entries]) => {
    const temps = entries.map(v => numericValue(v.TMP)).filter((v): v is number => v !== null);
    const humidity = entries.map(v => numericValue(v.REH)).filter((v): v is number => v !== null);
    const pop = entries.map(v => numericValue(v.POP)).filter((v): v is number => v !== null);
    const rain = entries.map(v => numericValue(v.PCP)).filter((v): v is number => v !== null);
    const snow = entries.map(v => numericValue(v.SNO)).filter((v): v is number => v !== null);
    const representative = entries.find(v => Number(v.PTY || 0) > 0) || entries[Math.floor(entries.length / 2)] || {};
    const description = kmaCondition(representative);
    const tmn = entries.map(v => numericValue(v.TMN)).find((v): v is number => v !== null);
    const tmx = entries.map(v => numericValue(v.TMX)).find((v): v is number => v !== null);
    const minTemp = tmn ?? (temps.length ? Math.min(...temps) : 0);
    const maxTemp = tmx ?? (temps.length ? Math.max(...temps) : minTemp);

    return {
      date,
      minTemp: Math.round(minTemp),
      maxTemp: Math.round(maxTemp),
      description,
      main: mainFromDescription(description),
      icon: kmaIcon(representative),
      avgHumidity: Math.round(humidity.reduce((sum, value) => sum + value, 0) / (humidity.length || 1)),
      precipitationChance: Math.max(0, ...pop),
      rainMm: Number(rain.reduce((sum, value) => sum + value, 0).toFixed(1)),
      snowMm: Number(snow.reduce((sum, value) => sum + value, 0).toFixed(1)),
    };
  });
}

function kmaNotes(currentValues: Record<string, string>, firstDaily?: DailyWeather, landMessage?: KmaApiItem) {
  const notes: string[] = [];
  const rain = numericValue(currentValues.RN1) || 0;
  const wind = numericValue(currentValues.WSD) || 0;

  if (firstDaily && firstDaily.precipitationChance >= 50) {
    notes.push(`오늘 강수 확률이 ${firstDaily.precipitationChance}%로 높습니다.`);
  }
  if (rain > 0) {
    notes.push(`최근 1시간 강수량은 ${rain}mm입니다.`);
  }
  if (wind >= 8) {
    notes.push(`바람이 강한 편입니다. 현재 풍속은 ${wind.toFixed(1)}m/s입니다.`);
  }

  const landSummary = String(landMessage?.wf || '').trim();
  if (landSummary) notes.push(landSummary.slice(0, 90));

  return notes.length > 0 ? notes : ['현재 확인되는 특이 기상 이슈는 없습니다.'];
}

async function buildKmaData(city: string, meta: KmaCityMeta): Promise<WeatherData> {
  const hourly = latestHourlyBase();
  const village = latestVillageForecastBase();

  const [nowcast, villageForecast, landForecast] = await Promise.all([
    fetchKma('/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtNcst', {
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      base_date: hourly.baseDate,
      base_time: hourly.baseTime,
      nx: String(meta.nx),
      ny: String(meta.ny),
    }),
    fetchKma('/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst', {
      pageNo: '1',
      numOfRows: '1200',
      dataType: 'JSON',
      base_date: village.baseDate,
      base_time: village.baseTime,
      nx: String(meta.nx),
      ny: String(meta.ny),
    }),
    fetchKma('/typ02/openApi/VilageFcstMsgService/getLandFcst', {
      pageNo: '1',
      numOfRows: '10',
      dataType: 'JSON',
      regId: meta.shortRegId,
    }),
  ]);

  const nowRows = kmaItems(nowcast);
  const villageRows = kmaItems(villageForecast);
  const currentValues = kmaCategoryMap(nowRows, 'obsrValue');
  const firstForecast = groupKmaForecast(villageRows)[0]?.values || {};
  const daily = summarizeKmaDaily(villageRows);
  const temp = numericValue(currentValues.T1H) ?? daily[0]?.maxTemp ?? 0;
  const description = kmaCondition({
    SKY: firstForecast.SKY,
    PTY: currentValues.PTY || firstForecast.PTY,
  });
  const humidity = numericValue(currentValues.REH) ?? daily[0]?.avgHumidity ?? 0;
  const windSpeed = numericValue(currentValues.WSD) ?? 0;
  const rain = numericValue(currentValues.RN1) ?? 0;
  const observedDate = String(nowRows[0]?.baseDate || hourly.baseDate);
  const observedTime = String(nowRows[0]?.baseTime || hourly.baseTime);

  return {
    source: 'KMA',
    updatedAt: new Date().toISOString(),
    location: {
      name: meta.label,
      country: 'KR',
      resolvedName: meta.label,
      input: city,
      source: 'kma-alias',
      timezone: 32400,
    },
    current: {
      temp: Math.round(temp),
      feelsLike: Math.round(temp),
      minTemp: daily[0]?.minTemp ?? Math.round(temp),
      maxTemp: daily[0]?.maxTemp ?? Math.round(temp),
      humidity: Math.round(humidity),
      pressure: null,
      windSpeed: Number(windSpeed.toFixed(1)),
      windGust: null,
      clouds: firstForecast.SKY === '4' ? 100 : firstForecast.SKY === '3' ? 70 : 0,
      visibilityKm: null,
      description,
      main: mainFromDescription(description),
      icon: kmaIcon({ SKY: firstForecast.SKY, PTY: currentValues.PTY || firstForecast.PTY }),
      rainMm: rain,
      snowMm: 0,
      observedAt: isoFromKst(observedDate, observedTime),
    },
    daily,
    notes: kmaNotes(currentValues, daily[0], kmaItems(landForecast)[0]),
  };
}

async function buildWeatherData(city: string): Promise<WeatherData> {
  const normalized = normalizeCityInput(city || 'Seoul');
  const meta = kmaCity(normalized);

  if (meta && kmaKey()) {
    try {
      return await buildKmaData(normalized, meta);
    } catch (error: any) {
      logger.warn('[API] KMA weather failed, falling back to OpenWeather', {
        city: normalized,
        error: error?.message,
      });
      return buildOpenWeatherData(normalized, meta.openWeatherQuery);
    }
  }

  return buildOpenWeatherData(normalized, meta?.openWeatherQuery);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = normalizeCityInput(searchParams.get('city') || 'Seoul');
    const data = await buildWeatherData(city);

    logger.info('[API] GET /api/weather', {
      city,
      provider: data.source,
      location: data.location.name,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error('[API] GET /api/weather failed', error?.message);
    return NextResponse.json(
      {
        success: false,
        code: error?.code || 'WEATHER_FETCH_FAILED',
        error: error?.message || '날씨 정보를 불러오지 못했습니다.',
      },
      { status: error?.status || 500 },
    );
  }
}
