import { Router, type Request, type Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { and, eq, gte } from 'drizzle-orm';
import { getWorldwideHolidays } from '../../nagerApi.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getDb } from '../../db.js';
import { calendarEvents } from '../../schema.js';
import type { AIResponse, ConversationMessage } from '../../types/types.js';

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const MODEL_NAME = 'gemini-3.1-flash-lite';

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

const CALENDAR_SYSTEM_PROMPT = `Ти - розумний AI-асістент календаря. Твоя задача допомагати користувачу керувати подіями, зустрічами і розкладом.

Можливості:
1. Створення подій з природного мовлення
2. Редагування існуючих подій
3. Видалення подій
4. Пошук вільного часу
5. Аналіз розкладу і пропозиції
6. Виявлення конфліктів
7. Нагадування і рекомендації
8. Інформація про погоду (якщо користувач запитує погоду — відповідай на основі наданого контексту погоди)

ТИПИ ПОДІЙ (ВАЖЛИВО - використовуй ТІЛЬКИ ці типи):
- "task": звичайна задача/подія (може бути будь-якого дня)
- "meeting": зустріч (ОБОВ'ЯЗКОВО вказуй startTime і endTime у форматі HH:MM, та location якщо доступні)
- "reminder": нагадування про щось (час доступний)
- "holiday": святковий день (автоматично генерується системою, НЕ створюй вручну)

Коли користувач просить створити/змінити/видалити подію, відповідай у JSON форматі:
{
  "action": "create" | "update" | "delete" | "query" | "analyze",
  "event": {
    "title": "назва події",
    "description": "опис події",
    "eventType": "task" | "meeting" | "reminder",
    "startDate": "ISO дата",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "location": "місце проведення",
    "color": "колір (default|red|yellow|green)",
    "participants": ["email1", "email2"]
  },
  "message": "дружнє повідомлення користувачу"
}

Для запитів інформації (action: "query" або "analyze"), використовуйте поле "message" для відповіді.

Правила створення подій:
- Якщо це зустріч → тип "meeting" з часом та місцем
- Якщо це просто завдання → тип "task"
- Якщо це щось нагадати → тип "reminder"
- НІКОЛИ не використовуй інші типи!

Якщо в контексті є інформація про погоду — використовуй її для відповіді на погодні запити.
Погодні запити НЕ є поза межами твоїх можливостей.

Якщо користувач запитує погоду в конкретному місті (наприклад 'яка погода в Києві', 'weather in London') — відповідай використовуючи назву міста з запиту користувача як орієнтир. Якщо в контексті є погодні дані для іншого міста — зазнач це і порекомендуй перевірити погоду для потрібного міста на weather.com або погода.ua.

Поточна дата: ${new Date().toISOString()}
Формат часу: 24-годинний
Мова: визначай автоматично за запитом користувача (українська або англійська).
Ти також можеш відповідати на запитання про погоду — якщо користувач запитує погоду і в контексті є погодні дані, використовуй їх. Якщо погодних даних немає — чесно скажи що не маєш актуальних даних про погоду і порадь перевірити прогноз на weather.com або погода.ua.
ВАЖЛИВО: Завжди відповідай в JSON форматі для дій з подіями!`;

const asyncHandler =
  <TReq extends Request, TRes extends Response>(
    handler: (req: TReq, res: TRes, next: (err?: unknown) => void) => Promise<void> | void
  ) =>
  (req: TReq, res: TRes, next: (err?: unknown) => void) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

// --- Weather (open-meteo, no API key required) ----------------------------
const WEATHER_REGEX =
  /погод|weather|температур|temperature|дощ|rain|сніг|snow|хмар|cloud|вітер|wind/i;

interface GeocodeResponse {
  results?: Array<{ latitude: number; longitude: number; name: string }>;
}

interface ForecastResponse {
  current?: {
    temperature_2m: number;
    weathercode: number;
    windspeed_10m: number;
    relativehumidity_2m: number;
  };
}

type WeatherLang = 'uk' | 'en';

// Map open-meteo weather codes to short descriptions in the user's language.
const describeWeatherCode = (code: number, lang: WeatherLang): string => {
  const uk = (value: string, en: string) => (lang === 'uk' ? value : en);
  if (code === 0) return uk('ясно', 'clear');
  if (code >= 1 && code <= 3) return uk('хмарно', 'cloudy');
  if (code >= 45 && code <= 48) return uk('туман', 'fog');
  if (code >= 51 && code <= 67) return uk('дощ', 'rain');
  if (code >= 71 && code <= 77) return uk('сніг', 'snow');
  if (code >= 80 && code <= 82) return uk('зливи', 'showers');
  if (code >= 95 && code <= 99) return uk('гроза', 'thunderstorm');
  return uk('невідомо', 'unknown');
};

// Geocode a location and return a short current-weather context block, or null
// if anything is unavailable. Best-effort: never throws.
const fetchWeatherContext = async (location: string, lang: WeatherLang): Promise<string | null> => {
  try {
    // Geocode with English first (most reliable), then fall back to Ukrainian.
    let geo: GeocodeResponse = {};
    for (const geoLang of ['en', 'uk'] as const) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          location
        )}&count=1&language=${geoLang}`
      );
      if (!geoRes.ok) return null;
      geo = (await geoRes.json()) as GeocodeResponse;
      if (geo.results?.length) break;
    }
    const place = geo.results?.[0];
    if (!place) return null;

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=auto`
    );
    if (!forecastRes.ok) return null;
    const forecast = (await forecastRes.json()) as ForecastResponse;
    const current = forecast.current;
    if (!current) return null;

    return [
      `Current weather in ${location}:`,
      `Temperature: ${current.temperature_2m}°C`,
      `Conditions: ${describeWeatherCode(current.weathercode, lang)}`,
      `Wind: ${current.windspeed_10m} km/h`,
      `Humidity: ${current.relativehumidity_2m}%`,
    ].join('\n');
  } catch {
    return null;
  }
};

// --- AI insights cache (per user, 5 min TTL) ------------------------------
interface InsightsPayload {
  insights: string[];
  hasData: boolean;
  error?: string;
}

const INSIGHTS_TTL_MS = 5 * 60 * 1000;
const insightsCache = new Map<string, { expires: number; payload: InsightsPayload }>();

router.get('/', (_req, res) => {
  res.status(200).json({ message: 'Backend is running!' });
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Calendar AI Assistant' });
});

router.get('/api/ai/health', (_req, res) => {
  const googleAIAvailable = !!process.env.GOOGLE_AI_API_KEY;

  res.json({
    status: googleAIAvailable ? 'ok' : 'error',
    service: 'AI Assistant(Google Gemini)',
    available: googleAIAvailable,
    googleAI: {
      configured: googleAIAvailable,
      keyLength: process.env.GOOGLE_AI_API_KEY?.length || 0,
      keyPrefix: process.env.GOOGLE_AI_API_KEY?.substring(0, 10) + '...',
    },
    timestamp: new Date().toISOString(),
    message: googleAIAvailable
      ? 'AI service is ready (Gemini)'
      : 'GOOGLE_AI_API_KEY not configured',
  });
});

router.get('/api/users/google', (_req, res) => {
  res.redirect('/api/auth/google');
});

router.get('/api/users/google/callback', (req, res) => {
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(query ? `/api/auth/google/callback?${query}` : '/api/auth/google/callback');
});

router.post(
  '/api/ai/chat',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { message, events, conversationHistory, language } = req.body;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      res.status(400).json({ error: 'Valid message (max 2000 chars) is required' });
      return;
    }

    const userId = req.user!.userId;
    let context = `Current date: ${new Date().toISOString()}\nUser ID: ${userId}\n`;

    if (events && Array.isArray(events) && events.length > 0) {
      context += `Current calendar events:\n${JSON.stringify(events, null, 2)}\n\n`;
    }

    if (
      conversationHistory &&
      Array.isArray(conversationHistory) &&
      conversationHistory.length > 0
    ) {
      context += 'Conversation history:\n';
      conversationHistory.forEach((msg: ConversationMessage) => {
        context += `${msg.role || 'user'}: ${msg.content || ''}\n`;
      });
      context += '\n';
    }

    // Optional weather context: when the user asks about weather and supplied a
    // location, fetch current conditions from open-meteo and inject them so the
    // model can answer naturally. Best-effort — never blocks the reply.
    // Resolve language from the body field, falling back to the Accept-Language
    // header; defaults to English. Drives both the weather text and the reply.
    const acceptLanguage = req.headers['accept-language'] || '';
    const weatherLang: WeatherLang =
      language === 'uk' || (!language && acceptLanguage.toLowerCase().startsWith('uk'))
        ? 'uk'
        : 'en';

    const location = typeof req.body.location === 'string' ? req.body.location.trim() : '';

    // Try to extract a city name from the user message when they ask about weather
    // Supports Ukrainian, Russian, and English patterns like:
    // "яка погода в Харкові", "погода у Києві", "weather in London", "какая погода в Одессе"
    const cityFromMessage = WEATHER_REGEX.test(message)
      ? (message
          .match(
            /(?:погод[аиі]\s+(?:в|у)|weather\s+in|погода\s+в)\s+([А-ЯҐЄІЇа-яґєіїA-Za-zА-Яа-я'\-]+)/i
          )?.[1]
          ?.trim() ?? '')
      : '';

    // Convert common Ukrainian/Russian inflected city forms to nominative so the
    // geocoder resolves them reliably.
    const normalizeCityName = (city: string): string => {
      // Common Ukrainian locative/genitive → nominative mappings
      const inflectionMap: Record<string, string> = {
        Харкові: 'Харків',
        Києві: 'Київ',
        Одесі: 'Одеса',
        Одессе: 'Одеса',
        Львові: 'Львів',
        Дніпрі: 'Дніпро',
        Запоріжжі: 'Запоріжжя',
        Миколаєві: 'Миколаїв',
        Херсоні: 'Херсон',
        Полтаві: 'Полтава',
        Вінниці: 'Вінниця',
        Чернігові: 'Чернігів',
      };
      return inflectionMap[city] ?? city;
    };

    // Use city from message as priority, fall back to client-supplied location
    const effectiveLocation = normalizeCityName(cityFromMessage) || location;

    if (effectiveLocation && effectiveLocation.length <= 100 && WEATHER_REGEX.test(message)) {
      const weatherContext = await fetchWeatherContext(effectiveLocation, weatherLang);
      if (weatherContext) {
        context += `${weatherContext}\n\n`;
      }
    }

    const responseLanguage = weatherLang === 'uk' ? 'Ukrainian' : 'English';
    const languageInstruction = `Respond in ${responseLanguage}.`;
    const fullPrompt = `${CALENDAR_SYSTEM_PROMPT}\n\n${context}${languageInstruction}\nUser: ${message}\n\nResponse (in JSON format if action is needed, otherwise plain text):`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    let aiResponse: AIResponse;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AIResponse;
        if (!parsed.action || !parsed.message) {
          throw new Error('Invalid response format: missing required fields');
        }
        aiResponse = parsed;
      } else {
        aiResponse = {
          action: 'query',
          message: text.trim(),
        };
      }
    } catch (error) {
      console.warn('Failed to parse JSON from Gemini response:', error);
      aiResponse = {
        action: 'query',
        message: text.trim(),
      };
    }

    res.json({
      response: aiResponse,
      // Convenience alias for simple consumers (e.g. weather Q&A).
      reply: aiResponse.message,
      conversationId: Date.now().toString(),
      userId,
      timestamp: new Date().toISOString(),
    });
  })
);

router.post(
  '/api/ai/analyze-schedule',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { events, timeRange, language } = req.body;
    const userId = req.user!.userId;

    if (!events || !Array.isArray(events) || events.length > 100) {
      res.status(400).json({ error: 'Valid events array (max 100 items) is required' });
      return;
    }

    const analysisLanguage = language === 'uk' ? 'Ukrainian' : 'English';

    const prompt = `User ID: ${userId}\nAnalyze the following schedule for the period ${
      timeRange || 'week'
    } and provide recommendations in ${analysisLanguage}:\n      
Events: ${JSON.stringify(events, null, 2)}

Provide:
1. General workload
2. Possible conflicts
3. Free slots for important meetings
4. Optimization suggestions

Respond in ${analysisLanguage}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    res.json({
      analysis: analysis.trim(),
      timeRange: timeRange || 'week',
      userId,
      timestamp: new Date().toISOString(),
    });
  })
);

router.post(
  '/api/ai/find-time',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { events, duration, preferences } = req.body;
    const userId = req.user!.userId;

    if (!duration || typeof duration !== 'number' || duration <= 0 || duration > 1440) {
      res.status(400).json({ error: 'Valid duration in minutes (1-1440) is required' });
      return;
    }

    const prompt = `User ID: ${userId}\nFind the optimal time for a meeting with duration of ${duration} minutes.\n\nExisting events: ${JSON.stringify(events || [], null, 2)}\nPreferences: ${JSON.stringify(preferences || {}, null, 2)}\n\nSuggest 3-5 best time slots with explanations of why they are suitable.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestions = response.text();

    res.json({
      suggestions: suggestions.trim(),
      duration,
      userId,
      timestamp: new Date().toISOString(),
    });
  })
);

router.get(
  '/api/ai/insights',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Response language follows the UI locale sent by the client (?lang=).
    const lang = String(req.query.lang || '');
    const responseLanguage = lang.startsWith('uk') ? 'Ukrainian' : 'English';

    // Cache per user AND language so switching locale never returns stale copy.
    const cacheKey = `${userId}:${responseLanguage}`;
    const cached = insightsCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      res.json(cached.payload);
      return;
    }

    // Last 30 days of the user's events. start_date is a YYYY-MM-DD text column,
    // so a lexicographic >= against the cutoff date works correctly.
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const events = await getDb()
      .select({
        title: calendarEvents.title,
        startDate: calendarEvents.startDate,
        endDate: calendarEvents.endDate,
        eventType: calendarEvents.eventType,
        isRecurring: calendarEvents.isRecurring,
      })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), gte(calendarEvents.startDate, cutoff)))
      .orderBy(calendarEvents.startDate)
      .limit(50);

    if (events.length === 0) {
      const payload: InsightsPayload = { insights: [], hasData: false };
      insightsCache.set(cacheKey, { expires: Date.now() + INSIGHTS_TTL_MS, payload });
      res.json(payload);
      return;
    }

    const prompt = `You are a productivity analyst for a calendar app.
Analyze these calendar events and return exactly 2-3 insights
about the user's work patterns, peak productivity times,
or scheduling habits.

Events (last 30 days):
${JSON.stringify(events, null, 2)}

Rules:
- Write all insights in ${responseLanguage}
- Each insight must be 1 sentence, max 120 characters
- Be specific (mention actual times/days if visible in data)
- Do NOT use markdown, bullet points, or special characters
- Return ONLY valid JSON: { "insights": ["...", "...", "..."] }`;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('parse');

      const parsed: unknown = JSON.parse(jsonMatch[0]);
      const rawInsights = (parsed as { insights?: unknown }).insights;
      const insights = Array.isArray(rawInsights)
        ? rawInsights.filter((item): item is string => typeof item === 'string')
        : [];
      if (insights.length === 0) throw new Error('parse');

      const payload: InsightsPayload = { insights: insights.slice(0, 3), hasData: true };
      insightsCache.set(cacheKey, { expires: Date.now() + INSIGHTS_TTL_MS, payload });
      res.json(payload);
    } catch {
      // Do not cache parse failures so a later request can still succeed.
      res.json({ insights: [], hasData: false, error: 'parse' });
    }
  })
);

router.get(
  '/api/v1/holidays/worldwide',
  asyncHandler(async (req, res) => {
    const yearParam = req.query.year as string;
    const monthParam = req.query.month as string;

    if (!yearParam || isNaN(parseInt(yearParam))) {
      res.status(400).json({ error: 'Valid "year" query parameter is required.' });
      return;
    }

    const year = parseInt(yearParam);
    let month: number | undefined;

    if (monthParam) {
      const parsedMonth = parseInt(monthParam);
      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        res.status(400).json({
          error: 'Optional "month" query parameter must be a number between 1 and 12.',
        });
        return;
      }
      month = parsedMonth;
    }

    const holidays = await getWorldwideHolidays(year, month);
    res.json({
      holidays,
      year,
      month: month || 'all',
      count: holidays.length,
    });
  })
);

export default router;
