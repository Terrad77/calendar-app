import type { CalendarEvent, AIResponse, ConversationMessage } from '../types/types';
const API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001';

class AIService {
  private conversationHistory: ConversationMessage[] = [];

  /**
   * Send message to AI assistant with current calendar context
   */
  async chat(message: string, currentEvents: CalendarEvent[] = []): Promise<AIResponse> {
    try {
      // Получаем токен из localStorage
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message,
          events: currentEvents,
          conversationHistory: this.conversationHistory,
        }),
      });

      if (response.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `AI service error: ${response.statusText}`);
      }

      const data = await response.json();

      // Update conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });
      this.conversationHistory.push({
        role: 'assistant',
        content: data.response.message,
      });

      // Keep in memory only last 20 messages to prevent context overflow
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return data.response;
    } catch (error) {
      console.error('Error in AI chat:', error);

      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        return {
          message: 'Для взаємодії з AI асистентом необхідно увійти до системи.',
          type: 'error',
          actions: [
            {
              type: 'system',
              label: '🔐 Увійти до системи',
              data: { action: 'redirect_to_login' },
            },
          ],
        } as AIResponse;
      }
      throw error;
    }
  }

  /**
   * Analyze schedule for a given time range
   */
  async analyzeSchedule(events: CalendarEvent[], timeRange: string = 'week'): Promise<string> {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/ai/analyze-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          events,
          timeRange,
        }),
      });
      if (response.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Error analyzing schedule:', error);
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/ai/find-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          events,
          duration,
          preferences,
        }),
      });
      if (response.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions;
    } catch (error) {
      console.error('Error finding optimal time:', error);
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
  async healthCheck(): Promise<{ status: string; available: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/ai/health`);
      if (!response.ok) {
        throw new Error(`AI service health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { status: data.status, available: data.available, message: data.message };
    } catch (error) {
      console.error('AI service health check failed:', error);
      return { status: 'error', available: false, message: 'AI service unavailable' };
    }
  }
}

export const aiService = new AIService();
