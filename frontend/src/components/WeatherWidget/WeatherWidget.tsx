import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Snowflake,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import instance from '../../API/axiosInstance';
import DotLoader from '../DotLoader/DotLoader';
import styles from './WeatherWidget.module.css';

interface LocationResponse {
  city?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    weathercode: number;
    windspeed_10m: number;
    relativehumidity_2m: number;
    apparent_temperature: number;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface WeatherData {
  city: string;
  temp: number;
  feelsLike: number;
  weathercode: number;
  wind: number;
  humidity: number;
  max: number;
  min: number;
}

// Map an open-meteo weathercode to a lucide icon.
const WeatherGlyph = ({ code, size = 18 }: { code: number; size?: number }) => {
  if (code <= 1) return <Sun size={size} />;
  if (code <= 3) return <CloudSun size={size} />;
  if (code >= 45 && code <= 48) return <Cloud size={size} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} />;
  if (code >= 71 && code <= 77) return <Snowflake size={size} />;
  if (code >= 95 && code <= 99) return <CloudLightning size={size} />;
  return <CloudSun size={size} />;
};

// Short, localized condition text. No dedicated i18n keys were requested for
// these, so the two supported languages are inlined.
const describeWeather = (code: number, uk: boolean): string => {
  const pick = (u: string, e: string) => (uk ? u : e);
  if (code <= 1) return pick('Ясно', 'Clear');
  if (code <= 3) return pick('Мінлива хмарність', 'Partly cloudy');
  if (code >= 45 && code <= 48) return pick('Туман', 'Fog');
  if (code >= 51 && code <= 67) return pick('Дощ', 'Rain');
  if (code >= 71 && code <= 77) return pick('Сніг', 'Snow');
  if (code >= 80 && code <= 82) return pick('Зливи', 'Showers');
  if (code >= 95 && code <= 99) return pick('Гроза', 'Thunderstorm');
  return pick('Невідомо', 'Unknown');
};

export const WeatherWidget = () => {
  const { t, i18n } = useTranslation('navigation');
  const isUk = i18n.language.startsWith('uk');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeatherData | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // On mount: resolve city (backend) -> coords (Nominatim) -> forecast (open-meteo).
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: loc } = await instance.get<LocationResponse>('/api/ai/location');
        const city = loc?.city?.trim();
        if (!city) return;

        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            city
          )}&format=json&limit=1`
        );
        if (!geoRes.ok) return;
        const geo = (await geoRes.json()) as NominatimResult[];
        const place = geo?.[0];
        if (!place) return;

        const forecastRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
        );
        if (!forecastRes.ok) return;
        const forecast = (await forecastRes.json()) as ForecastResponse;
        const current = forecast.current;
        if (!current) return;

        if (!cancelled) {
          setData({
            city,
            temp: Math.round(current.temperature_2m),
            feelsLike: Math.round(current.apparent_temperature),
            weathercode: current.weathercode,
            wind: Math.round(current.windspeed_10m),
            humidity: Math.round(current.relativehumidity_2m),
            max: Math.round(forecast.daily?.temperature_2m_max?.[0] ?? current.temperature_2m),
            min: Math.round(forecast.daily?.temperature_2m_min?.[0] ?? current.temperature_2m),
          });
        }
      } catch {
        // Silent failure — the widget renders nothing.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the dropdown on any click outside the widget.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (loading) {
    return (
      <div className={styles.widget}>
        <span className={styles.loading}>
          <DotLoader text={t('weather_loading')} />
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.widget} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.icon}>
          <WeatherGlyph code={data.weathercode} size={18} />
        </span>
        <span className={styles.temp}>{data.temp}°C</span>
        <span className={styles.city}>{data.city}</span>
        <span className={styles.minmax}>
          {data.max}° / {data.min}°
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog">
          <div className={styles.dropdownHeader}>
            <MapPin size={16} className={styles.rowIcon} />
            <span>{data.city}</span>
            <span className={styles.headerGlyph}>
              <WeatherGlyph code={data.weathercode} size={20} />
            </span>
          </div>

          {/* Current temperature + condition description */}
          <div className={styles.row}>
            <Thermometer size={16} className={styles.rowIcon} />
            <span className={styles.rowLabel}>{describeWeather(data.weathercode, isUk)}</span>
            <span className={styles.rowValue}>{data.temp}°C</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('weather_feels_like')}</span>
            <span className={styles.rowValue}>{data.feelsLike}°C</span>
          </div>

          <div className={styles.row}>
            <Droplets size={16} className={styles.rowIcon} />
            <span className={styles.rowLabel}>{t('weather_humidity')}</span>
            <span className={styles.rowValue}>{data.humidity}%</span>
          </div>

          <div className={styles.row}>
            <Wind size={16} className={styles.rowIcon} />
            <span className={styles.rowLabel}>{t('weather_wind')}</span>
            <span className={styles.rowValue}>{data.wind}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('weather_day')}</span>
            <span className={styles.rowValue}>{data.max}°C</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('weather_night')}</span>
            <span className={styles.rowValue}>{data.min}°C</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget;
