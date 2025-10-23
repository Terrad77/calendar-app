import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import {
  User,
  UserCredentials,
  RegisterData,
  AuthTokens,
  TokenPayload,
} from "../types/auth.types";

// In-memory storage for demonstration (replace with database in production)
const users: Map<string, User & { password: string }> = new Map();
const refreshTokens: Set<string> = new Set();

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register new user
   */
  async register(
    data: RegisterData
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password, name } = data;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userId = uuidv4();
    const now = new Date();

    const newUser: User & { password: string } = {
      id: userId,
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    users.set(userId, newUser);

    // Generate tokens
    const tokens = this.generateTokens(userId, email);
    refreshTokens.add(tokens.refreshToken);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(
    credentials: UserCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const user = Array.from(users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email);
    refreshTokens.add(tokens.refreshToken);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token exists
    if (!refreshTokens.has(refreshToken)) {
      throw new Error("Invalid refresh token");
    }

    try {
      // Verify token
      const payload = jwt.verify(
        refreshToken,
        JWT_REFRESH_SECRET
      ) as TokenPayload;

      // Generate new tokens
      const tokens = this.generateTokens(payload.userId, payload.email);

      // Remove old refresh token and add new one
      refreshTokens.delete(refreshToken);
      refreshTokens.add(tokens.refreshToken);

      return tokens;
    } catch (error) {
      refreshTokens.delete(refreshToken);
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    refreshTokens.delete(refreshToken);
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = users.get(userId);

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(userId: string, email: string): AuthTokens {
    const payload: TokenPayload = {
      userId,
      email,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): {
    valid: boolean;
    message?: string;
  } {
    if (password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters long",
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }

    return { valid: true };
  }
}

export const authService = new AuthService();
