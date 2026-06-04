import type { AIResponse, CalendarEvent, ConversationMessage } from '../types/calendar.types';
import { authenticationService } from './authService';
import { getAppLanguage } from '../helpers/appLanguage';

const API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001';

class AIService {
  private conversationHistory: ConversationMessage[] = [];
  private retryAttempts = 0;
  private maxRetries = 3;
  private isCheckingHealth = false;

  // Try to read token from various storage locations (auth service, localStorage, redux-persist)
  private getStoredToken(): string | null {
    try {
      const fromAuthService = authenticationService.getAccessToken();
      if (fromAuthService) return fromAuthService;

      const accessToken =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken');
      if (accessToken && accessToken !== 'null') return accessToken;

      const persist = localStorage.getItem('persist:user');
      if (persist) {
        try {
          const parsed = JSON.parse(persist);
          // redux-persist stores reducer state as JSON strings under keys
          const stateStr = parsed.user || parsed.auth || parsed;
          if (typeof stateStr === 'string') {
            const inner = JSON.parse(stateStr);
            return inner.accessToken || inner.token || inner.authToken || null;
          }
          return (parsed.accessToken as string) || (parsed.token as string) || null;
        } catch (_e) {
          // ignore parse errors
        }
      }
    } catch (_err) {
      // ignore
    }

    return null;
  }

  /**
   * Helper function for retrying failed requests with exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // If we get a 503, retry with exponential backoff
      if (response.status === 503 && retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 2^retryCount seconds

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      return response;
    } catch (error) {
      // For network errors, also retry
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Send message to AI assistant with current calendar context
   */
  async chat(
    message: string,
    currentEvents: CalendarEvent[] = [],
    language: string = getAppLanguage()
  ): Promise<AIResponse> {
    // Skip if service is overloaded (we recently got 503)
    if (this.retryAttempts >= this.maxRetries) {
      console.warn('Skipping AI request due to recent overload issues');
      return this.getServiceOverloadedResponse();
    }

    try {
      const token = this.getStoredToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use retry logic for the fetch
      const response = await this.fetchWithRetry(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          events: currentEvents,
          conversationHistory: this.conversationHistory,
          language,
        }),
      });

      // Reset retry attempts on successful response
      this.retryAttempts = 0;

      if (response.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (response.status === 503) {
        this.retryAttempts++;
        return this.getServiceOverloadedResponse();
      }

      if (!response.ok) {
        await response.text().catch(() => 'Failed to read error response');

        // log error details for debugging
        console.error(`AI service error: ${response.status} ${response.statusText}`);

        throw new Error(`AI service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Update conversation history
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });
      this.conversationHistory.push({
        role: 'assistant',
        content: data.response?.message || data.message || '',
        timestamp: new Date().toISOString(),
      });

      // Keep in memory only last 20 messages
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return data.response || data;
    } catch (error) {
      console.error('Error in AI chat:', error);

      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        return this.getAuthRequiredResponse();
      }

      // Check if it's a 503 error
      if (error instanceof Error && error.message.includes('503')) {
        this.retryAttempts++;
        return this.getServiceOverloadedResponse();
      }

      return this.getGenericErrorResponse(error);
    }
  }

  /**
   * Analyze schedule for a given time range
   */
  async analyzeSchedule(
    events: CalendarEvent[],
    timeRange: string = 'week',
    language: string = getAppLanguage()
  ): Promise<string> {
    // Skip if service is overloaded
    if (this.retryAttempts >= this.maxRetries) {
      throw new Error('AI service is temporarily overloaded. Please try again later.');
    }

    try {
      const token = this.getStoredToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await this.fetchWithRetry(`${API_URL}/api/ai/analyze-schedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          events,
          timeRange,
          language,
        }),
      });

      // Reset retry attempts on successful response
      this.retryAttempts = 0;

      if (response.status === 503) {
        this.retryAttempts++;
        throw new Error('AI service is temporarily overloaded. Please try again later.');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `AI service error: ${response.status} ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();
      return data.analysis || data.message || '';
    } catch (error) {
      console.error('Error analyzing schedule:', error);
      throw error;
    }
  }

  // Check if AI service is available with caching
  async healthCheck(): Promise<{ status: string; available: boolean; message?: string }> {
    // Don't check if we're already checking
    if (this.isCheckingHealth) {
      return {
        status: 'checking',
        available: false,
        message: 'Already checking service health',
      };
    }

    // Skip health check if we recently had many 503 errors
    if (this.retryAttempts >= this.maxRetries) {
      return {
        status: 'overloaded',
        available: false,
        message: 'AI service is currently overloaded',
      };
    }

    this.isCheckingHealth = true;

    try {
      // Use a timeout for health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/api/ai/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `AI service health check failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      this.isCheckingHealth = false;
      return {
        status: data.status,
        available: data.available,
        message: data.message,
      };
    } catch (error) {
      // Use debug-level logging for health check failures to avoid noisy error logs
      // during normal dev flows when the backend may be offline.
      console.debug('AI service health check failed:', error);
      this.isCheckingHealth = false;
      return {
        status: 'error',
        available: false,
        message: `AI service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Helper methods for error responses
  private getServiceOverloadedResponse(): AIResponse {
    return {
      action: 'query' as const,
      message: 'AI сервіс тимчасово перевантажений. Будь ласка, спробуйте через декілька хвилин.',
      type: 'error',
      actions: [
        {
          type: 'system',
          label: '🔄 Спробувати ще раз',
          data: { action: 'retry' },
        },
        {
          type: 'system',
          label: '📝 Створити подію вручну',
          data: { action: 'manual_event' },
        },
      ],
    } as AIResponse;
  }

  private getAuthRequiredResponse(): AIResponse {
    return {
      action: 'query' as const,
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

  private getGenericErrorResponse(error: unknown): AIResponse {
    const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';

    // Don't show technical details to the user
    const userFriendlyMessage = errorMessage.includes('503')
      ? 'AI сервіс тимчасово недоступний. Спробуйте пізніше.'
      : "Сталася помилка при з'єднанні з AI асистентом.";

    return {
      action: 'query' as const,
      message: userFriendlyMessage,
      type: 'error',
      actions: [
        {
          type: 'system',
          label: '🔄 Спробувати ще раз',
          data: { action: 'retry' },
        },
      ],
    } as AIResponse;
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Get current conversation history
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  // Reset retry attempts (call this after some time or user action)
  resetRetryAttempts(): void {
    this.retryAttempts = 0;
  }
}

export const aiService = new AIService();
