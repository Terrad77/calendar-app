// Ensure environment variables are loaded before any other module imports that
// may read process.env at module-evaluation time. Use the side-effect import
// so the loader evaluates dotenv before other ESM modules.
import app from './app.js';
import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getWorldwideHolidays } from './nagerApi.js';
import { AIResponse, ConversationMessage } from './types.js';
import { authenticateToken } from './middleware/authMiddleware.js';

const PORT = process.env.PORT || 3001;

// Google Gemini SDK initialization
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

console.log('🔧 Google AI SDK initialized');
console.log('🔧 API Key available:', !!process.env.GOOGLE_AI_API_KEY);

const MODEL_NAME = 'gemini-2.5-flash';
// const MODEL_NAME = 'gemini-2.0-flash-exp';
// const MODEL_NAME = 'gemini-1.5-pro-001';

console.log(`🔧 Selected model: ${MODEL_NAME}`);

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

// System prompt for calendar AI assistant
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

// --- JSON SCHEMA DEFINITION for Tool Use ---
// Defines the JSON schema expected from the AI
const _CALENDAR_ACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    action: {
      type: 'string' as const,
      enum: ['create', 'update', 'delete', 'query', 'analyze'],
      description: 'Action type: create, update, delete, query or analyze.',
    },
    event: {
      type: 'object' as const,
      description: "Event data. Included only for 'create', 'update', 'delete'.",
      properties: {
        title: { type: 'string' as const },
        description: { type: 'string' as const },
        eventType: {
          type: 'string' as const,
          enum: ['task', 'meeting', 'reminder'],
          description: 'Event type: task, meeting or reminder.',
        },
        startDate: { type: 'string' as const },
        endDate: { type: 'string' as const },
        startTime: { type: 'string' as const },
        endTime: { type: 'string' as const },
        color: { type: 'string' as const },
        location: { type: 'string' as const },
        participants: {
          type: 'array' as const,
          items: { type: 'string' as const },
        },
      },
    },
    message: {
      type: 'string' as const,
      description: 'Friendly message to the user. Required for all actions.',
    },
  },
  required: ['action', 'message'],
};

// Backward compatibility for legacy Google OAuth paths
app.get('/api/users/google', (_req: Request, res: Response) => {
  res.redirect('/api/auth/google');
});

app.get('/api/users/google/callback', (req: Request, res: Response) => {
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(query ? `/api/auth/google/callback?${query}` : '/api/auth/google/callback');
});

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Backend is running!' });
});

// Protected AI endpoints - require authentication
/**
 * POST /api/ai/chat
 * Chat with AI assistant (requires authentication)
 */
app.post('/api/ai/chat', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  console.log('=== AI Chat Request ===');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const { message, events, conversationHistory, language } = req.body;
    const authHeader = req.headers.authorization;

    console.log('Auth header present:', !!authHeader);
    console.log('Message:', message);
    console.log('Events count:', events?.length || 0);

    // Authenticated user ID
    const userId = req.user!.userId;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      res.status(400).json({ error: 'Valid message (max 2000 chars) is required' });
      return;
    }

    // Add user context to the message
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

    console.log('Sending to Gemini:', {
      messageLength: message.length,
      eventsCount: events?.length || 0,
    });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('Gemini raw response:', text);

    // Try to parse AI response
    let aiResponse: AIResponse;

    try {
      // Find JSON in the response (handle potential non-JSON text before/after)
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AIResponse;
        // Validate required fields
        if (!parsed.action || !parsed.message) {
          throw new Error('Invalid response format: missing required fields');
        }
        aiResponse = parsed;
      } else {
        // If no JSON found, treat as query response
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
      userId: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error communicating with Gemini:', error);
    res.status(500).json({
      error: 'Internal server error Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ai/analyze-schedule
 * Analyze user's schedule (requires authentication)
 */
app.post(
  '/api/ai/analyze-schedule',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { events, timeRange, language } = req.body;
      // Authenticated user ID
      const userId = req.user!.userId;

      if (!events || !Array.isArray(events) || events.length > 100) {
        res.status(400).json({ error: 'Valid events array (max 100 items) is required' });
        return;
      }

      const analysisLanguage = language === 'uk' ? 'Ukrainian' : 'English';

      const prompt = `User ID: ${userId}\nAnalyze the following schedule for the period ${
        timeRange || 'week'
      } and provide recommendations in ${analysisLanguage}:
      
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
        userId: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error analyzing schedule:', error);
      res.status(500).json({
        error: 'Failed to analyze schedule',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/ai/find-time
 * Find optimal meeting time (requires authentication)
 */
app.post(
  '/api/ai/find-time',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { events, duration, preferences } = req.body;
      // Authenticated user ID
      const userId = req.user!.userId;

      if (!duration || typeof duration !== 'number' || duration <= 0 || duration > 1440) {
        res.status(400).json({ error: 'Valid duration in minutes (1-1440) is required' });
        return;
      }

      const prompt = `User ID: ${userId}\nFind the optimal time for a meeting with duration of ${duration} minutes.

Existing events: ${JSON.stringify(events || [], null, 2)}
Preferences: ${JSON.stringify(preferences || {}, null, 2)}

Suggest 3-5 best time slots with explanations of why they are suitable.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const suggestions = response.text();

      res.json({
        suggestions: suggestions.trim(),
        duration: duration,
        userId: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error finding time:', error);
      res.status(500).json({
        error: 'Failed to find optimal time',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/v1/holidays/worldwide
 * Get worldwide holidays (public endpoint)
 */
app.get('/api/v1/holidays/worldwide', async (req, res) => {
  const yearParam = req.query.year as string;
  const monthParam = req.query.month as string;

  if (!yearParam || isNaN(parseInt(yearParam))) {
    return res.status(400).json({ error: 'Valid "year" query parameter is required.' });
  }

  const year = parseInt(yearParam);
  let month: number | undefined;

  if (monthParam) {
    const parsedMonth = parseInt(monthParam);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        error: 'Optional "month" query parameter must be a number between 1 and 12.',
      });
    }
    month = parsedMonth;
  }

  try {
    const holidays = await getWorldwideHolidays(year, month);
    res.json({
      holidays,
      year,
      month: month || 'all',
      count: holidays.length,
    });
  } catch (error) {
    console.error('Error in /api/v1/holidays/worldwide:', error);
    res.status(500).json({
      error: 'Failed to retrieve worldwide holidays.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
});

// Start server only when not running tests
let server: import('http').Server | undefined;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`🔒 Authentication enabled (Active)`);
    console.log(`🤖 AI Calendar Assistant ready`);
    console.log(
      `📅 Holidays endpoint: /api/v1/holidays/worldwide?year=<YEAR>&month=<OPTIONAL_MONTH>`
    );
    console.log(`💬 AI Chat endpoint: /api/ai/chat (POST)`);
    console.log(`📊 AI Analyze endpoint: /api/ai/analyze-schedule (POST)`);
    console.log(`⏰ AI Find Time endpoint: /api/ai/find-time (POST)`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server?.close(() => {
      console.log('HTTP server closed');
    });
  });
}

export { app };
export default app;
