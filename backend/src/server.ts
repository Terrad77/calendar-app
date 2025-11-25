import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import dotenv from 'dotenv';
import { getWorldwideHolidays } from './nagerApi';
import { CalendarEvent, AIResponse } from './types';
import { authenticateToken } from './middleware/authMiddleware';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Anthropic SDK initialization
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
Мова: визначай автоматично за запитом користувача (українська або англійська)`;

// --- JSON SCHEMA DEFINITION for Tool Use ---
// Визначаємо схему JSON, яку ми очікуємо від Claude
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

// Health check endpoints (public)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Calendar AI Assistant' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend is running!' });
});

// AI Health Check (public)
app.get('/api/ai/health', (req: Request, res: Response) => {
  // Проверяем доступность Anthropic API
  const anthropicAvailable = !!process.env.ANTHROPIC_API_KEY;
  const anthropicKeyLength = process.env.ANTHROPIC_API_KEY?.length || 0;

  res.json({
    status: anthropicAvailable ? 'ok' : 'error',
    service: 'AI Assistant',
    available: anthropicAvailable,
    anthropic: {
      configured: anthropicAvailable,
      keyLength: anthropicKeyLength,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
    },
    timestamp: new Date().toISOString(),
    message: anthropicAvailable ? 'AI service is ready' : 'ANTHROPIC_API_KEY not configured',
  });
});

// Protected AI endpoints - require authentication
/**
 * POST /api/ai/chat
 * Chat with AI assistant (requires authentication)
 */
app.post('/api/ai/chat', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, events, conversationHistory } = req.body;
    const userId = req.user?.userId;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Add user context to the message
    let contextMessage = `User ID: ${userId}\n${message}`;

    if (events && events.length > 0) {
      contextMessage += `\n\nCurrent calendar events:\n${JSON.stringify(events, null, 2)}`;
    }

    const messages: Anthropic.MessageParam[] = [
      ...(conversationHistory || []),
      {
        role: 'user',
        content: contextMessage,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CALENDAR_SYSTEM_PROMPT,
      messages: messages,
      tools: [
        {
          name: 'calendar_action',
          description:
            'Викликається для створення, оновлення, видалення, запиту або аналізу подій у календарі.',
          input_schema: CALENDAR_ACTION_SCHEMA,
        },
      ],
    });

    let aiResponse: AIResponse;
    const content = response.content[0];
    if (content.type === 'tool_use') {
      // Якщо Claude вирішив викликати інструмент (дію з календарем)
      const toolCall = content;
      try {
        // Вміст tool_use.input - це вже валідований JSON-об'єкт (AIResponse)
        aiResponse = toolCall.input as AIResponse;
      } catch (e) {
        console.error('Tool Input Parsing Error:', e);
        aiResponse = {
          action: 'query',
          message: 'Виникла помилка при обробці запиту на створення події.',
        };
      }
    } else if (content.type === 'text') {
      // Якщо Claude надав пряму текстову відповідь (query/analyze)
      const text = content.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          // Спроба парсингу для сумісності з попереднім кодом (Backup)
          aiResponse = JSON.parse(jsonMatch[0]) as AIResponse;
        } catch {
          // Якщо не вдалося розібрати як JSON, це просто текстовий запит
          aiResponse = {
            action: 'query',
            message: text,
          };
        }
      } else {
        // Це звичайна текстова відповідь
        aiResponse = {
          action: 'query',
          message: text,
        };
      }
    } else {
      // Інший тип контенту, не очікуваний
      aiResponse = {
        action: 'query',
        message: 'Sorry, I could not process your request.',
      };
    }

    res.json({
      response: aiResponse,
      conversationId: response.id,
      userId: userId, // Include user ID for verification
    });
  } catch (error) {
    console.error('Error communicating with Claude:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
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
      const { events, timeRange } = req.body;
      const userId = req.user?.userId;

      const message = `User ID: ${userId}\nПроаналізуй наступний розклад за період ${
        timeRange || 'тиждень'
      } та надай рекомендації:
      
Події: ${JSON.stringify(events, null, 2)}

Надай:
1. Загальну завантаженість
2. Можливі конфлікти
3. Вільні проміжки для важливих зустрічей
4. Пропозиції по оптимізації`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: CALENDAR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      const content = response.content[0];
      const analysisText = content.type === 'text' ? content.text : 'Не вдалося отримати аналіз.';

      res.json({
        analysis: analysisText,
        userId: userId,
      });
    } catch (error) {
      console.error('Error analyzing schedule:', error);
      res.status(500).json({ error: 'Failed to analyze schedule' });
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
      const userId = req.user?.userId;

      const message = `User ID: ${userId}\nЗнайди оптимальний час для зустрічі тривалістю ${duration} хвилин.

Існуючі події: ${JSON.stringify(events, null, 2)}
Пріоритети: ${JSON.stringify(preferences, null, 2)}

Запропонуй 3-5 найкращих варіантів часу з поясненням, чому вони підходять.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: CALENDAR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      const content = response.content[0];
      const suggestions =
        content.type === 'text' ? content.text : 'Не вдалося отримати пропозиції.';

      res.json({
        suggestions,
        userId: userId,
      });
    } catch (error) {
      console.error('Error finding time:', error);
      res.status(500).json({ error: 'Failed to find optimal time' });
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
    res.json(holidays);
  } catch (error) {
    console.error('Error in /api/v1/holidays/worldwide:', error);
    res.status(500).json({ error: 'Failed to retrieve worldwide holidays.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🔒 Authentication enabled`);
  console.log(`🤖 AI Calendar Assistant ready`);
  console.log(`📅 API endpoint: /api/v1/holidays/worldwide?year=<YEAR>&month=<OPTIONAL_MONTH>`);
});

export default app;
