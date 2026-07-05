import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  CloudRain,
  CloudSun,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  Thermometer,
  Wind,
} from 'lucide-react';
import { GlassCard } from './GlassCard';

interface DailyWeather {
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
}

interface WeatherData {
  source: string;
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
    pressure: number;
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
}

function formatDay(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function iconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function userWeatherError(error: { message: string; code?: string }) {
  if (error.code === 'CITY_NOT_FOUND') {
    return '도시를 찾지 못했습니다. 도시 이름을 영어로 입력해보세요.';
  }
  return '날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해보세요.';
}

function WeatherLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
      <GlassCard className="p-6 min-h-[300px]">
        <div className="h-full flex flex-col items-center justify-center">
          <div className="relative mb-5 h-11 w-11">
            <div className="absolute inset-0 rounded-full border-2 border-[#ded9cf] dark:border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#c83a32] dark:border-t-[#d7a36f] animate-spin" />
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-white/55">날씨 데이터 불러오는 중</p>
          <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3">
            {[72, 58, 84].map((height, idx) => (
              <div key={idx} className="rounded-lg bg-[#ded9cf]/60 dark:bg-white/[0.07] animate-pulse" style={{ height }} />
            ))}
          </div>
        </div>
      </GlassCard>
      <GlassCard className="p-6 min-h-[300px]">
        <div className="space-y-3">
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} className="h-14 rounded-lg bg-[#ded9cf]/50 dark:bg-white/[0.06] animate-pulse" />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#ded9cf] dark:border-white/10 bg-white/28 dark:bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center gap-2 text-[#8a8479] dark:text-[#8f8a80]">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-[#202326] dark:text-[#f2eee7]">{value}</p>
    </div>
  );
}

export function Weather() {
  const [cityInput, setCityInput] = useState('Seoul');
  const [city, setCity] = useState('Seoul');
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/weather?city=${encodeURIComponent(city)}`, { signal: controller.signal })
      .then(async response => {
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw Object.assign(new Error(json.error || '날씨 정보를 불러오지 못했습니다.'), {
            code: json.code,
          });
        }
        setData(json.data);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError({
          message: err.message || '날씨 정보를 불러오지 못했습니다.',
          code: err.code,
        });
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [city, retryKey]);

  const precipitation = useMemo(() => {
    if (!data) return '0mm';
    const amount = data.current.rainMm + data.current.snowMm;
    return `${Number(amount.toFixed(1))}mm`;
  }, [data]);

  const submitCity = (event: FormEvent) => {
    event.preventDefault();
    const nextCity = cityInput.trim();
    if (nextCity) setCity(nextCity);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#232323] text-white dark:bg-[#d7a36f] dark:text-[#111316]">
              <CloudSun size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">날씨</h2>
              <p className="text-sm text-gray-500 dark:text-white/40 mt-1">도시별 현재 날씨와 예보</p>
            </div>
          </div>
        </div>
        <form onSubmit={submitCity} className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8479] dark:text-[#8f8a80]" size={16} />
            <input
              value={cityInput}
              onChange={event => setCityInput(event.target.value)}
              placeholder="도시 검색"
              className="h-10 w-full rounded-lg border border-[#ded9cf] bg-[#fbfaf6]/72 pl-9 pr-3 text-sm text-[#202326] outline-none transition focus:border-[#b7ada0] focus:ring-2 focus:ring-[#c83a32]/15 dark:border-white/10 dark:bg-[#111316]/58 dark:text-[#f2eee7] dark:focus:border-[#ba9a74]/60"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#232323] px-4 text-sm font-bold text-white transition hover:bg-[#111] dark:bg-[#d7a36f] dark:text-[#111316] dark:hover:bg-[#e2b989]"
          >
            조회
          </button>
          <button
            type="button"
            onClick={() => setRetryKey(key => key + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#ded9cf] bg-white/34 text-[#6f6a60] transition hover:bg-[#ebe8df] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#b8b0a5] dark:hover:bg-white/[0.08]"
            title="새로고침"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {loading && <WeatherLoading />}

      {!loading && error && (
        <GlassCard className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 text-[#c83a32] dark:text-[#d7a36f]" size={20} />
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">날씨 정보를 표시할 수 없습니다</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/45">{userWeatherError(error)}</p>
              <p className="mt-3 text-xs text-gray-400 dark:text-white/30">지원 예시: 서울, Busan, Tokyo, Madrid, New York</p>
            </div>
          </div>
        </GlassCard>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <GlassCard className="overflow-hidden p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#6f6a60] dark:text-[#b8b0a5]">
                    <MapPin size={16} />
                    <span>{data.location.name}{data.location.country ? `, ${data.location.country}` : ''}</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-black tracking-tight text-[#202326] dark:text-[#f2eee7]">{data.current.temp}</span>
                    <span className="mb-2 text-2xl font-bold text-[#8a8479] dark:text-[#8f8a80]">°C</span>
                  </div>
                  <p className="mt-3 text-base font-bold text-[#c83a32] dark:text-[#d7a36f]">{data.current.description}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
                    체감 {data.current.feelsLike}° · 최저 {data.current.minTemp}° / 최고 {data.current.maxTemp}°
                  </p>
                </div>
                <div className="flex items-center justify-center rounded-xl border border-[#ded9cf] bg-white/28 p-4 dark:border-white/10 dark:bg-white/[0.035]">
                  <img src={iconUrl(data.current.icon)} alt={data.current.description} className="h-28 w-28" />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-white/30">
                <span>업데이트 {formatTime(data.updatedAt)}</span>
                <span className="h-1 w-1 rounded-full bg-current" />
                <span>{data.source}</span>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-white/80">날씨 요약</h3>
              <div className="space-y-3">
                {data.notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border border-[#ded9cf] bg-white/26 p-3 dark:border-white/10 dark:bg-white/[0.035]">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c83a32] dark:bg-[#d7a36f]" />
                    <p className="text-sm leading-6 text-gray-600 dark:text-white/60">{note}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatItem icon={<Droplets size={15} />} label="습도" value={`${data.current.humidity}%`} />
            <StatItem icon={<Wind size={15} />} label="풍속" value={`${data.current.windSpeed}m/s`} />
            <StatItem icon={<CloudRain size={15} />} label="강수" value={precipitation} />
            <StatItem icon={<Gauge size={15} />} label="기압" value={`${data.current.pressure}hPa`} />
            <StatItem icon={<Eye size={15} />} label="가시거리" value={data.current.visibilityKm ? `${data.current.visibilityKm}km` : '-'} />
            <StatItem icon={<Thermometer size={15} />} label="구름" value={`${data.current.clouds}%`} />
          </div>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-white/80">5일 예보</h3>
              <span className="text-xs text-gray-400 dark:text-white/30">3시간 예보 기반 일별 요약</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.daily.map(day => (
                <div key={day.date} className="rounded-lg border border-[#ded9cf] bg-white/28 p-4 dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#202326] dark:text-[#f2eee7]">{formatDay(day.date)}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-white/40">{day.description}</p>
                    </div>
                    <img src={iconUrl(day.icon)} alt={day.description} className="-mr-2 -mt-3 h-14 w-14" />
                  </div>
                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-xl font-black text-[#202326] dark:text-[#f2eee7]">{day.maxTemp}°</span>
                    <span className="text-sm font-bold text-gray-400 dark:text-white/35">{day.minTemp}°</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-gray-500 dark:text-white/40">
                    <span>강수 {day.precipitationChance}%</span>
                    <span>습도 {day.avgHumidity}%</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
