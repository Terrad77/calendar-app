import axios from 'axios';
import { NagerPublicHolidayResponse, BackendHoliday } from './types/types.js';
import { getOrSetCache } from './cache.js';
import { COUNTRIES_TO_FETCH } from './constants.js';
import dayjs from 'dayjs';
const NAGER_API_BASE_URL = 'https://date.nager.at/api/v3';

// Cache TTL: 1 year
const CACHE_TTL_HOLIDAYS_SECONDS = 60 * 60 * 24 * 365;

/**
 * Fetches holidays for a given country and year, cached for CACHE_TTL_HOLIDAYS_SECONDS, using the Nager.Date API.
 */
async function fetchHolidaysForCountry(
  year: number,
  countryCode: string
): Promise<BackendHoliday[]> {
  const cacheKey = `holidays-${year}-${countryCode}`;

  return getOrSetCache(cacheKey, CACHE_TTL_HOLIDAYS_SECONDS, async () => {
    // Let errors propagate so getOrSetCache does not store a failed result.
    const response = await axios.get<NagerPublicHolidayResponse[]>(
      `${NAGER_API_BASE_URL}/PublicHolidays/${year}/${countryCode}`
    );

    if (!Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((h) => ({
      id: `holiday-${h.countryCode}-${h.date}-${h.name.replace(/\s+/g, '-')}`,
      date: h.date,
      title: `${h.localName || h.name} (${h.countryCode})`,
      countryCode: h.countryCode,
      eventType: 'holiday' as const,
    }));
  });
}

/**
 * Aggregates world holidays from different countries by a given year and optionally by month.
 */
export async function getWorldwideHolidays(
  year: number,
  month?: number
): Promise<BackendHoliday[]> {
  const cacheKey = `worldwide-holidays-${year}-${month || 'all'}`;

  return getOrSetCache(cacheKey, CACHE_TTL_HOLIDAYS_SECONDS, async () => {
    // allSettled so a single country's network failure doesn't blank the entire calendar.
    const results = await Promise.allSettled(
      COUNTRIES_TO_FETCH.map((code) => fetchHolidaysForCountry(year, code))
    );

    const holidaysByCountry = results.map((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Failed to fetch holidays for ${COUNTRIES_TO_FETCH[i]}:`, r.reason);
        return [] as BackendHoliday[];
      }
      return r.value;
    });

    const allWorldwideHolidays = holidaysByCountry.flat();

    const filtered = month
      ? allWorldwideHolidays.filter((h) => dayjs(h.date).month() + 1 === month)
      : allWorldwideHolidays;

    return filtered.sort(
      (a, b) => dayjs(a.date).diff(dayjs(b.date)) || a.title.localeCompare(b.title)
    );
  });
}
