const API_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:3001";

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  location?: string;
  participants?: string[];
}

export interface AIResponse {
  action: "create" | "update" | "delete" | "query" | "analyze";
  event?: CalendarEvent;
  message: string;
  events?: CalendarEvent[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

class AIService {
  private conversationHistory: ConversationMessage[] = [];

  /**
   * Send message to AI assistant with current calendar context
   */
  async chat(
    message: string,
    currentEvents: CalendarEvent[] = []
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          events: currentEvents,
          conversationHistory: this.conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `AI service error: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Update conversation history
      this.conversationHistory.push({
        role: "user",
        content: message,
      });
      this.conversationHistory.push({
        role: "assistant",
        content: data.response.message,
      });

      // Keep in memory only last 20 messages to prevent context overflow
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return data.response;
    } catch (error) {
      console.error("Error in AI chat:", error);
      throw error;
    }
  }

  /**
   * Analyze schedule for a given time range
   */
  async analyzeSchedule(
    events: CalendarEvent[],
    timeRange: string = "week"
  ): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events,
          timeRange,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error("Error analyzing schedule:", error);
      throw error;
    }
  }
  //Find optimal time slot for a meeting
  async findOptimalTime(
    events: CalendarEvent[],
    duration: number,
    preferences: {
      preferredDays?: string[];
      preferredTimeStart?: string;
      preferredTimeEnd?: string;
      avoidWeekends?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/ai/find-time`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events,
          duration,
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error("Error finding optimal time:", error);
      throw error;
    }
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Get current conversation history
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  // Check if AI service is available
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      return data.status === "ok";
    } catch (error) {
      console.error("AI service health check failed:", error);
      return false;
    }
  }
}

export const aiService = new AIService();
