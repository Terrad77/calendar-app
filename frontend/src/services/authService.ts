import type { User } from '../types/auth.types';

const API_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

export type { User };

class AuthenticationService {
  // Token layer only. localStorage is the single source of truth for tokens;
  // this service is stateless and reads/writes storage directly on every call.
  // The current user lives in the Redux store.

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const result = await response.json();

      this.saveToStorage(result.tokens.accessToken, result.tokens.refreshToken);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.removeFromStorage();
      return false;
    }
  }

  /**
   * Make authenticated request
   */
  async authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        const refreshedAccessToken = this.getAccessToken();
        headers.Authorization = `Bearer ${refreshedAccessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Public helper to clear auth state without triggering logout request
   */
  clearAccessToken(): void {
    this.removeFromStorage();
  }

  /**
   * Save tokens to localStorage
   */
  private saveToStorage(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  /**
   * Remove from localStorage
   */
  private removeFromStorage(): void {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  }
}

export const authenticationService = new AuthenticationService();
