import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock axios so no real HTTP is performed. The implementation is set per
// test via axiosGet, and inspects the URL to return data for a single
// country (UA) while every other country resolves to an empty list.
const axiosGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: unknown[]) => axiosGet(...args) },
}));

import { getWorldwideHolidays } from '../nagerApi.js';

// The module-level cache is shared across tests, so every test uses a unique
// year to avoid cross-test cache contamination.
const countryFromUrl = (url: string) => url.split('/').pop() as string;

describe('getWorldwideHolidays', () => {
  beforeEach(() => {
    axiosGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps, prefers localName over name, and sorts by date then title', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (countryFromUrl(url) === 'UA') {
        return Promise.resolve({
          data: [
            { date: '2030-12-25', name: 'Christmas', localName: '', countryCode: 'UA' },
            { date: '2030-01-01', name: 'New Year', localName: 'Новий рік', countryCode: 'UA' },
            {
              date: '2030-01-01',
              name: 'Constitution',
              localName: 'Конституція',
              countryCode: 'UA',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const result = await getWorldwideHolidays(2030);

    // Three UA holidays only; the same-date pair is ordered by title localeCompare,
    // and Christmas (December) sorts last.
    expect(result.map((h) => h.title)).toEqual([
      'Конституція (UA)', // localName preferred, tie-break before Новий рік
      'Новий рік (UA)', // localName preferred
      'Christmas (UA)', // empty localName falls back to name
    ]);
    expect(result[2]).toEqual({
      id: 'holiday-UA-2030-12-25-Christmas',
      date: '2030-12-25',
      title: 'Christmas (UA)',
      countryCode: 'UA',
      eventType: 'holiday',
    });
  });

  it('filters by month when a month is provided', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (countryFromUrl(url) === 'UA') {
        return Promise.resolve({
          data: [
            { date: '2034-01-01', name: 'New Year', localName: 'NY', countryCode: 'UA' },
            { date: '2034-12-25', name: 'Christmas', localName: 'Xmas', countryCode: 'UA' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const january = await getWorldwideHolidays(2034, 1);

    expect(january).toHaveLength(1);
    expect(january[0].date).toBe('2034-01-01');
  });

  it('treats a non-array API response as no holidays', async () => {
    axiosGet.mockResolvedValue({ data: { error: 'unexpected shape' } });

    const result = await getWorldwideHolidays(2032);

    expect(result).toEqual([]);
  });

  it('survives a per-country network failure without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    axiosGet.mockRejectedValue(new Error('network down'));

    const result = await getWorldwideHolidays(2033);

    expect(result).toEqual([]);
    // The rejected branch logs but does not propagate the error.
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('caches the aggregate result and does not refetch on a second call', async () => {
    axiosGet.mockResolvedValue({ data: [] });

    await getWorldwideHolidays(2031);
    const callsAfterFirst = axiosGet.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    await getWorldwideHolidays(2031);
    // Second call is served entirely from cache — no new HTTP requests.
    expect(axiosGet.mock.calls.length).toBe(callsAfterFirst);
  });
});
