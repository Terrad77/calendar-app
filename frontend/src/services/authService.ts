const API_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:3001";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

class AuthenticationService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const result = await response.json();

      this.setAuth(result.user, result.tokens);

      return result;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const result = await response.json();

      this.setAuth(result.user, result.tokens);

      return result;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearAuth();
    }
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const result = await response.json();

      this.accessToken = result.tokens.accessToken;
      this.refreshToken = result.tokens.refreshToken;
      this.saveToStorage();

      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
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
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get user profile");
      }

      const result = await response.json();
      this.user = result.user;

      return result.user;
    } catch (error) {
      console.error("Get user error:", error);
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
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Token verification error:", error);
      return false;
    }
  }

  /**
   * Make authenticated request
   */
  async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        headers.Authorization = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        throw new Error("Session expired. Please login again.");
      }
    }

    return response;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Set authentication data
   */
  private setAuth(user: User, tokens: AuthTokens): void {
    this.user = user;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.saveToStorage();
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.removeFromStorage();
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.user) {
        localStorage.setItem("user", JSON.stringify(this.user));
      }
      if (this.accessToken) {
        localStorage.setItem("accessToken", this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem("refreshToken", this.refreshToken);
      }
    } catch (error) {
      console.error("Error saving to storage:", error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const userStr = localStorage.getItem("user");
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (userStr) {
        this.user = JSON.parse(userStr);
      }
      if (accessToken) {
        this.accessToken = accessToken;
      }
      if (refreshToken) {
        this.refreshToken = refreshToken;
      }
    } catch (error) {
      console.error("Error loading from storage:", error);
    }
  }

  /**
   * Remove from localStorage
   */
  private removeFromStorage(): void {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } catch (error) {
      console.error("Error removing from storage:", error);
    }
  }
}

export const authenticationService = new AuthenticationService();
