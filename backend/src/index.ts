import express, { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import cors from "cors";
import { getWorldwideHolidays } from "./nagerApi";
import dotenv from "dotenv";
import { CalendarEvent, AIResponse } from "./types";

dotenv.config(); // Load environment variables from .env file

const app = express(); // create an Express application
const PORT = process.env.PORT || 3001; // port for backend
// Import Anthropic SDK
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// system prompt for calendar AI assistant
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
  "message": "друже повідомлення користувачу"
}

Для запитів інформації (action: "query" або "analyze"), використовуйте поле "message" для відповіді.

Поточна дата: ${new Date().toISOString()}
Формат часу: 24-годинний
Мова: визначай автоматично за запитом користувача (українська або англійська)`;

// Endpoint for chat with Claude AI
app.post("/api/ai/chat", async (req: Request, res: Response) => {
  try {
    const { message, events, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Add current events context if provided
    let contextMessage = message;
    if (events && events.length > 0) {
      contextMessage += `\n\nCurrent calendar events:\n${JSON.stringify(
        events,
        null,
        2
      )}`;
    }

    // Set up messages with conversation history if available
    const messages: Anthropic.MessageParam[] = [
      ...(conversationHistory || []),
      {
        role: "user",
        content: contextMessage,
      },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: CALENDAR_SYSTEM_PROMPT,
      messages: messages,
    });

    const content = response.content[0];
    let aiResponse: AIResponse;

    if (content.type === "text") {
      const text = content.text;

      // try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          aiResponse = JSON.parse(jsonMatch[0]);
        } catch {
          // if JSON no parse, create fallback response
          aiResponse = {
            action: "query",
            message: text,
          };
        }
      } else {
        aiResponse = {
          action: "query",
          message: text,
        };
      }
    } else {
      aiResponse = {
        action: "query",
        message: "Sorry, I could not process your request.",
      };
    }

    res.json({
      response: aiResponse,
      conversationId: response.id,
    });
  } catch (error) {
    console.error("Error communicating with Claude:", error);
    res.status(500).json({
      error: "Failed to process AI request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Endpoint for analyzing schedule
app.post("/api/ai/analyze-schedule", async (req: Request, res: Response) => {
  try {
    const { events, timeRange } = req.body;

    const message = `Проаналізуй наступний розклад за період ${
      timeRange || "тиждень"
    } та надай рекомендації:
    
Події: ${JSON.stringify(events, null, 2)}

Надай:
1. Загальну завантаженість
2. Можливі конфлікти
3. Вільні проміжки для важливих зустрічей
4. Пропозиції по оптимізації`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: CALENDAR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content = response.content[0];
    const analysisText = content.type === "text" ? content.text : "";

    res.json({
      analysis: analysisText,
    });
  } catch (error) {
    console.error("Error analyzing schedule:", error);
    res.status(500).json({ error: "Failed to analyze schedule" });
  }
});

// Endpoint for finding optimal meeting time
app.post("/api/ai/find-time", async (req: Request, res: Response) => {
  try {
    const { events, duration, preferences } = req.body;

    const message = `Знайди оптимальний час для зустрічі тривалістю ${duration} хвилин.

Існуючі події: ${JSON.stringify(events, null, 2)}
Пріоритети: ${JSON.stringify(preferences, null, 2)}

Запропонуй 3-5 найкращих варіантів часу з поясненням, чому вони підходять.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: CALENDAR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content = response.content[0];
    const suggestions = content.type === "text" ? content.text : "";

    res.json({
      suggestions,
    });
  } catch (error) {
    console.error("Error finding time:", error);
    res.status(500).json({ error: "Failed to find optimal time" });
  }
});

// Express middleware for parsing incoming requests with JSON payload.
app.use(express.json());

// CORS (Cross-Origin Resource Sharing)
app.use(
  cors({
    origin: [
      "https://calendar-app-pi-gold.vercel.app", // main Vercel domain
      "https://calendar-app-git-main-terrad77s-projects.vercel.app", // domain for branch 'main' on Vercel (for preview)
      "https://calendar-app-7oetemppd-terrad77s-projects.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Health check AI assistant
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "Calendar AI Assistant" });
});
// health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "Now Backend is running!" });
});

// Endpoint for receiving worldwide holidays
app.get("/api/v1/holidays/worldwide", async (req, res) => {
  const yearParam = req.query.year as string;
  const monthParam = req.query.month as string;

  if (!yearParam || isNaN(parseInt(yearParam))) {
    return res
      .status(400)
      .json({ error: 'Valid "year" query parameter is required.' });
  }

  const year = parseInt(yearParam);
  let month: number | undefined;

  if (monthParam) {
    const parsedMonth = parseInt(monthParam);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        error:
          'Optional "month" query parameter must be a number between 1 and 12.',
      });
    }
    month = parsedMonth;
  }

  try {
    const holidays = await getWorldwideHolidays(year, month);
    res.json(holidays);
  } catch (error) {
    console.error("Error in /api/v1/holidays/worldwide:", error);
    res.status(500).json({ error: "Failed to retrieve worldwide holidays." });
  }
});

//start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(
    "API endpoint: /api/v1/holidays/worldwide?year=<YEAR>&month=<OPTIONAL_MONTH>"
  );
});
