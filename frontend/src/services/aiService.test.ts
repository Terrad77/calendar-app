import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEvent } from '../types/calendar.types';

// Stub the auth service so the request includes a predictable bearer token
// without touching localStorage or redux-persist.
vi.mock('./authService', () => ({
  authenticationService: {
    getAccessToken: () => 'test-token',
  },
}));

import { aiService } from './aiService';

const sampleEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    date: '2026-06-22',
    title: 'Standup',
    eventType: 'meeting',
    colors: ['default'],
  } as CalendarEvent,
];

describe('aiService.findOptimalTime', () => {
  beforeEach(() => {
    aiService.resetRetryAttempts();
    vi.restoreAllMocks();
    // Clear the saved UI language so getAppLanguage() defaults to 'en'
    // unless a test sets it explicitly.
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('posts events, duration, preferences and language to /api/ai/find-time and returns suggestions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: 'Slot A, Slot B, Slot C' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await aiService.findOptimalTime(sampleEvents, 60, { workHours: '9-17' }, 'uk');

    expect(result).toBe('Slot A, Slot B, Slot C');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/ai/find-time');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-token');

    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      events: sampleEvents,
      duration: 60,
      preferences: { workHours: '9-17' },
      language: 'uk',
    });
  });

  it('defaults language to getAppLanguage() (saved UI locale) when omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('language', 'uk');

    await aiService.findOptimalTime(sampleEvents, 60);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.language).toBe('uk');
  });

  it('falls back to "en" when no UI language is saved', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await aiService.findOptimalTime(sampleEvents, 60);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.language).toBe('en');
  });

  it('defaults preferences to an empty object when omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await aiService.findOptimalTime(sampleEvents, 30);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.preferences).toEqual({});
  });

  it('rejects an out-of-range duration before issuing a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiService.findOptimalTime(sampleEvents, 0)).rejects.toThrow(
      'Valid duration in minutes (1-1440) is required'
    );
    await expect(aiService.findOptimalTime(sampleEvents, 1441)).rejects.toThrow(
      'Valid duration in minutes (1-1440) is required'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to data.message when suggestions is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'fallback text' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await aiService.findOptimalTime(sampleEvents, 45);
    expect(result).toBe('fallback text');
  });

  it('throws on a non-ok response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(aiService.findOptimalTime(sampleEvents, 60)).rejects.toThrow(
      'AI service error: 500'
    );
  });
});
