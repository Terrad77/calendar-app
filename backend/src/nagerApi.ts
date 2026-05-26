import axios from 'axios';
import { BackendHoliday, NagerPublicHolidayResponse } from './types.js';
import { getCache, getOrSetCache } from './cache.js';
import dayjs from 'dayjs';
import { randomUUID } from 'crypto';

const NAGER_API_BASE_URL = 'https://date.nager.at/api/v3';

// Time To Live cache
const CACHE_TTL_HOLIDAYS_SECONDS = 60 * 60 * 24 * 30 * 12 * 1; // 1 year

// List of countries for fetching
const COUNTRIES_TO_FETCH = [
  'UA',
  'US',
  'GB',
  'DE',
  'FR',
  'CA',
  'AU',
  'JP',
  'CN',
  'IN',
  'BR',
  'MX',
  'AR',
  'ZA',
  'PL',
  'IT',
  'ES',
  'NL',
  'BE',
  'SE',
  'NO',
  'DK',
  'FI',
  'CH',
  'AT',
  'IE',
  'PT',
  'GR',
  'RU',
  'KR',
  'SG',
  'MY',
  'TH',
  'NZ',
  'EG',
  'SA',
  'AE',
  'TR',
  'PK',
  'BD',
  'VN',
  'PH',
];

/**
 * Отримує свята для певної країни та року з кешем, використовуючи Nager.Date API.
 * @param year A year to receive holidays.
 * @param countryCode Country code (ISO 3166-1 alpha-2).
 * @returns An array of Holiday objects.
 */
// function to fetch Holidays for Country
async function fetchHolidaysForCountry(
  year: number,
  countryCode: string
): Promise<BackendHoliday[]> {
  const cacheKey = `holidays-${year}-${countryCode}`;
  return getOrSetCache(cacheKey, CACHE_TTL_HOLIDAYS_SECONDS, async () => {
    const cachedData = getCache<BackendHoliday[]>(cacheKey);

    if (cachedData) {
      console.log(`[Cache Hit] Holidays for ${countryCode} in ${year}`);
      return cachedData;
    }

    console.log(`[Cache Miss] Fetching holidays for ${countryCode} in ${year}`);

    try {
      const response = await axios.get<NagerPublicHolidayResponse[]>(
        `${NAGER_API_BASE_URL}/PublicHolidays/${year}/${countryCode}`
      );

      if (!Array.isArray(response.data)) {
        console.warn(`API returned non-array data for ${countryCode} in ${year}:`, response.data);
        return [];
      }

      const mappedHolidays: BackendHoliday[] = response.data.map((holiday) => ({
        id: `holiday-${randomUUID()}`,
        date: holiday.date,
        title: `${holiday.localName || holiday.name} (${holiday.countryCode})`,
        countryCode: holiday.countryCode,
        eventType: 'holiday',
      }));

      return mappedHolidays;
    } catch (error) {
      console.error(`Error fetching holidays for ${countryCode} in ${year}:`, error);

      return [];
    }
  });
}

/**
 * Aggregates world holidays from different countries by a given year and optionally by month.
 * function accesses the Nager.Date API by country and combines the results.
 * @param year Year for holiday aggregation.
 * @param month Optional month (1-12) for filtering.
 * @returns An array of Holiday objects aggregated from all specified countries.
 */
// function to get Worldwid Holidays for specified Country
export async function getWorldwideHolidays(
  year: number,
  month?: number
): Promise<BackendHoliday[]> {
  const cacheKey = `worldwide-holidays-${year}-${month || 'all'}`;
  return getOrSetCache(cacheKey, CACHE_TTL_HOLIDAYS_SECONDS, async () => {
    const cachedData = getCache<BackendHoliday[]>(cacheKey);

    if (cachedData) {
      console.log(`[Cache Hit] Worldwide holidays for ${year} ${month ? `month ${month}` : ''}`);
      return cachedData;
    }

    console.log(
      `[Cache Miss] Aggregating worldwide holidays for ${year} ${month ? `month ${month}` : ''}`
    );

    const allHolidaysPromises = COUNTRIES_TO_FETCH.map((countryCode) =>
      fetchHolidaysForCountry(year, countryCode)
    );

    const holidaysByCountry = await Promise.all(allHolidaysPromises);
    const allWorldwideHolidays = holidaysByCountry.flat();

    const filteredWorldwideHolidays = month
      ? allWorldwideHolidays.filter((h) => dayjs(h.date).month() + 1 === month)
      : allWorldwideHolidays;

    filteredWorldwideHolidays.sort((a, b) => {
      const dateA = dayjs(a.date);
      const dateB = dayjs(b.date);
      if (dateA.isBefore(dateB)) return -1;
      if (dateA.isAfter(dateB)) return 1;
      return a.title.localeCompare(b.title);
    });

    return filteredWorldwideHolidays;
  });
}
