import type { User } from '../types/auth.types';

const API_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

export type { User };

class AuthenticationService {
  // Token layer only. The current user lives in the Redux store (single source
  // of truth); this service no longer caches user data.
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const result = await response.json();

      this.accessToken = result.tokens.accessToken;
      this.refreshToken = result.tokens.refreshToken;
      this.saveToStorage();

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      return false;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }

      const result = await response.json();

      return result.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Verify if token is valid
   */
  async verifyToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token verification error:', error);
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
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken || localStorage.getItem('accessToken');
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.removeFromStorage();
  }

  /**
   * Public helper to clear auth state without triggering logout request
   */
  clearAccessToken(): void {
    this.clearAuth();
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (accessToken) {
        this.accessToken = accessToken;
      }
      if (refreshToken) {
        this.refreshToken = refreshToken;
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
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
