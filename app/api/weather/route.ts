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

function weatherKey() {
  return process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_KEY;
}

function normalizeCityInput(city: string) {
  return city.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function cityAlias(city: string) {
  const normalized = normalizeCityInput(city);
  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  return CITY_ALIASES[normalized] || CITY_ALIASES[compact];
}

function localDate(epochSeconds: number, timezoneSeconds = 0) {
  return new Date((epochSeconds + timezoneSeconds) * 1000).toISOString().slice(0, 10);
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

function summarizeForecast(forecast: ForecastResponse) {
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

async function resolveCity(city: string, apiKey: string) {
  const normalizedCity = normalizeCityInput(city);
  const alias = cityAlias(normalizedCity);
  const query = alias?.query || normalizedCity;
  const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
  const geo = await fetchOpenWeather<GeoResponse>(geocodeUrl);
  const match = geo[0];

  if (!match) {
    const error = new Error(`도시를 찾지 못했습니다. 한글 도시명은 예: 서울, 도쿄, 마드리드처럼 입력해보세요.`);
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

export async function GET(request: Request) {
  try {
    const apiKey = weatherKey();
    if (!apiKey) {
      logger.warn('[API] OpenWeather API key is missing');
      return NextResponse.json(
        {
          success: false,
          code: 'WEATHER_CONFIG_MISSING',
          error: '날씨 서비스 설정을 확인해야 합니다.',
        },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const city = normalizeCityInput(searchParams.get('city') || 'Seoul');
    const resolved = await resolveCity(city, apiKey);
    const params = `lat=${resolved.lat}&lon=${resolved.lon}&appid=${apiKey}&units=metric&lang=kr`;

    logger.info('[API] GET /api/weather', { city, resolved: resolved.query, source: resolved.source });

    const [current, forecast] = await Promise.all([
      fetchOpenWeather<CurrentResponse>(`https://api.openweathermap.org/data/2.5/weather?${params}`),
      fetchOpenWeather<ForecastResponse>(`https://api.openweathermap.org/data/2.5/forecast?${params}`),
    ]);

    const daily = summarizeForecast(forecast);

    return NextResponse.json({
      success: true,
      data: {
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
      },
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
