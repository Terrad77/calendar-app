import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import dotenv from 'dotenv';
import { getWorldwideHolidays } from './nagerApi';
import { CalendarEvent, AIResponse } from './types';
import { authenticateToken } from './middleware/authMiddleware';
import authRoutes from './routes/authRoutes';
import passport from './config/passport';

dotenv.config();

const app = express();
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

Коли користувач просить створити/змінити/видалити подію, відповідай у JSON форматі:
{
  "action": "create" | "update" | "delete" | "query" | "analyze",
  "event": {
    "title": "назва події",
    "description": "опис події",
    "startDate": "ISO дата",
    "endDate": "ISO дата",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "color": "hex колір",
    "location": "місце проведення",
    "participants": ["email1", "email2"]
  },
  "message": "дружнє повідомлення користувачу"
}

Для запитів інформації (action: "query" або "analyze"), використовуйте поле "message" для відповіді.

Поточна дата: ${new Date().toISOString()}
Формат часу: 24-годинний
Мова: визначай автоматично за запитом користувача (українська або англійська);
ВАЖЛИВО: Завжди відповідай в JSON форматі для дій з подіями!`;

// --- JSON SCHEMA DEFINITION for Tool Use ---
// Визначаємо схему JSON, яку ми очікуємо від AI
const CALENDAR_ACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    action: {
      type: 'string' as const,
      enum: ['create', 'update', 'delete', 'query', 'analyze'],
      description: 'Тип дії: створення, оновлення, видалення, запит або аналіз.',
    },
    event: {
      type: 'object' as const,
      description: "Дані про подію. Включається лише для 'create', 'update', 'delete'.",
      properties: {
        title: { type: 'string' as const },
        description: { type: 'string' as const },
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
      description: "Дружнє повідомлення користувачу. Обов'язково для всіх дій.",
    },
  },
  required: ['action', 'message'],
};

// Middleware
app.use(express.json());
app.use(passport.initialize());
app.use(
  cors({
    origin: [
      'https://calendar-app-pi-gold.vercel.app',
      'https://calendar-app-git-main-terrad77s-projects.vercel.app',
      'https://calendar-app-7oetemppd-terrad77s-projects.vercel.app',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Backward compatibility for legacy Google OAuth paths
app.get('/api/users/google', (req: Request, res: Response) => {
  res.redirect('/api/auth/google');
});

app.get('/api/users/google/callback', (req: Request, res: Response) => {
  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(query ? `/api/auth/google/callback?${query}` : '/api/auth/google/callback');
});

// Health check endpoints (public)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Calendar AI Assistant' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend is running!' });
});

// AI Health Check (public)
app.get('/api/ai/health', (req: Request, res: Response) => {
  const googleAIAvailable = !!process.env.GOOGLE_AI_API_KEY;
  const googleAIKeyLength = process.env.GOOGLE_AI_API_KEY?.length || 0;

  res.json({
    status: googleAIAvailable ? 'ok' : 'error',
    service: 'AI Assistant(Google Gemini)',
    available: googleAIAvailable,
    googleAI: {
      configured: googleAIAvailable,
      keyLength: googleAIKeyLength,
      keyPrefix: process.env.GOOGLE_AI_API_KEY?.substring(0, 10) + '...',
    },
    timestamp: new Date().toISOString(),
    message: googleAIAvailable
      ? 'AI service is ready (Gemini)'
      : 'GOOGLE_AI_API_KEY not configured',
  });
});

// Protected AI endpoints - require authentication
/**
 * POST /api/ai/chat
 * Chat with AI assistant (requires authentication)
 */
app.post(
  '/api/ai/chat',
  //authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    console.log('=== AI Chat Request ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
      const { message, events, conversationHistory } = req.body;
      const authHeader = req.headers.authorization;

      console.log('Auth header present:', !!authHeader);
      console.log('Message:', message);
      console.log('Events count:', events?.length || 0);

      // Temporary user ID until authentication is enabled
      const userId = req.user?.userId || 'temp-user';

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Valid message is required' });
        return;
      }

      // Add user context to the message
      let context = `Поточна дата: ${new Date().toISOString()}\nUser ID: ${userId}\n`;

      if (events && Array.isArray(events) && events.length > 0) {
        context += `Current calendar events:\n${JSON.stringify(events, null, 2)}\n\n`;
      }

      if (
        conversationHistory &&
        Array.isArray(conversationHistory) &&
        conversationHistory.length > 0
      ) {
        context += 'Історія бесіди:\n';
        conversationHistory.forEach((msg: any) => {
          context += `${msg.role || 'user'}: ${msg.content || msg.message || ''}\n`;
        });
        context += '\n';
      }

      const fullPrompt = `${CALENDAR_SYSTEM_PROMPT}\n\n${context}Користувач: ${message}\n\nВідповідь (у JSON форматі якщо потрібна дія, інакше звичайний текст):`;

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
  }
);

/**
 * POST /api/ai/analyze-schedule
 * Analyze user's schedule (requires authentication)
 */
app.post(
  '/api/ai/analyze-schedule',
  // authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { events, timeRange } = req.body;
      // Temporary user ID until authentication is enabled
      const userId = req.user?.userId || 'temp-user';

      if (!events || !Array.isArray(events)) {
        res.status(400).json({ error: 'Valid events array is required' });
        return;
      }

      const prompt = `User ID: ${userId}\nПроаналізуй наступний розклад за період ${
        timeRange || 'тиждень'
      } та надай рекомендації:
      
Події: ${JSON.stringify(events, null, 2)}

Надай:
1. Загальну завантаженість
2. Можливі конфлікти
3. Вільні проміжки для важливих зустрічей
4. Пропозиції по оптимізації

Відповідь на українській чи англійській мові, в залежності від мови запиту.`;

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
  // authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { events, duration, preferences } = req.body;
      // Temporary user ID until authentication is enabled
      const userId = req.user?.userId || 'temp-user';

      if (!duration || typeof duration !== 'number') {
        res.status(400).json({ error: 'Valid duration in minutes is required' });
        return;
      }

      const prompt = `User ID: ${userId}\nЗнайди оптимальний час для зустрічі тривалістю ${duration} хвилин.

Існуючі події: ${JSON.stringify(events || [], null, 2)}
Пріоритети: ${JSON.stringify(preferences || {}, null, 2)}

Запропонуй 3-5 найкращих варіантів часу з поясненням, чому вони підходять.`;

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
app.use((error: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔒 Authentication disabled (commented out)`);
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
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
