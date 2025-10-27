import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.VITE_AI_API_URL || "http://localhost:3001";
import { CalendarEvent, AIResponse, ConversationMessage } from "../types";

class AIService {
  private conversationHistory: ConversationMessage[] = [];

  async chat(
    message: string,
    currentEvents: CalendarEvent[] = []
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          events: currentEvents,
          conversationHistory: this.conversationHistory,
        }),
      });

      if (!response.ok)
        throw new Error(`AI service error: ${response.statusText}`);

      const data = (await response.json()) as AIResponse;

      this.conversationHistory.push({ role: "user", content: message });
      this.conversationHistory.push({
        role: "assistant",
        content: data.message,
      });

      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return data;
    } catch (error) {
      console.error("Error in AI chat:", error);
      throw error;
    }
  }

  async analyzeSchedule(
    events: CalendarEvent[],
    timeRange: string = "week"
  ): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events, timeRange }),
      });

      if (!response.ok)
        throw new Error(`AI service error: ${response.statusText}`);

      const data = (await response.json()) as { analysis: string };
      return data.analysis;
    } catch (error) {
      console.error("Error analyzing schedule:", error);
      throw error;
    }
  }

  async findOptimalTime(
    events: CalendarEvent[],
    duration: number,
    preferences: {
      preferredDays?: string[];
      preferredTimeStart?: string;
      preferredTimeEnd?: string;
      avoidWeekends?: boolean;
    } = {}
  ): Promise<string[]> {
    try {
      const response = await fetch(`${API_URL}/api/ai/find-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events, duration, preferences }),
      });

      if (!response.ok)
        throw new Error(`AI service error: ${response.statusText}`);

      const data = (await response.json()) as { suggestions: string[] };
      return data.suggestions;
    } catch (error) {
      console.error("Error finding optimal time:", error);
      throw error;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }
}

export const aiService = new AIService();
