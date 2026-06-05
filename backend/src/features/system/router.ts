import { Router, type Request, type Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getWorldwideHolidays } from '../../nagerApi.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import type { AIResponse, ConversationMessage } from '../../types/types.js';

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const MODEL_NAME = 'gemini-2.5-flash';

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

ТИПИ ПОДІЙ (ВАЖЛИВО - використовуй ТІЛЬКИ ці типи):
- "task": звичайна задача/подія (може бути будь-якого дня)
- "meeting": зустріч (ОБОВ'ЯЗКОВО вказуй startTime і endTime у форматі HH:MM, та location якщо доступні)
- "reminder": напоминання про щось (час доступний)
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
- Якщо це що-то то нагадати → тип "reminder"
- НІКОЛИ не використовуй інші типи!

Поточна дата: ${new Date().toISOString()}
Формат часу: 24-годинний
Мова: визначай автоматично за запитом користувача (українська або англійська);
ВАЖЛИВО: Завжди відповідай в JSON форматі для дій з подіями!`;

const asyncHandler =
  <TReq extends Request, TRes extends Response>(
    handler: (req: TReq, res: TRes, next: (err?: unknown) => void) => Promise<void> | void
  ) =>
  (req: TReq, res: TRes, next: (err?: unknown) => void) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

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

    const responseLanguage = language === 'uk' ? 'Ukrainian' : 'English';
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
