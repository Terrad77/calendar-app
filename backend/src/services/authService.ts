// backend/src/services/authService.ts

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import {
  User,
  UserCredentials,
  RegisterData,
  AuthTokens,
  TokenPayload,
  SocialUserData,
} from '../types/auth.types';

// --- TYPES & IN-MEMORY STORAGE ---

// Определяем полный тип пользователя для внутреннего хранилища (с паролем и токенами)
type UserEntry = User & {
  password: string;
  verificationToken?: string;
  verificationTokenExpiry?: number;
};
const users: Map<string, UserEntry> = new Map();
const refreshTokens: Set<string> = new Set();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const SALT_ROUNDS = 10;

// --- AUTH SERVICE CLASS ---

export class AuthService {
  // --- PRIVATE/HELPER METHODS ---

  /**
   * @description Generates a URL-safe verification token.
   */
  private generateVerificationToken(): string {
    // Best Practice: Использование криптографически сильных случайных данных
    return randomBytes(32).toString('hex');
  }

  /**
   * @description Placeholder for sending the verification email.
   * (В продакшене замените на реальный сервис: Nodemailer, SendGrid, etc.)
   */
  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/api/auth/verify-email?token=${token}`;

    console.log(`\n--- Verification Email Sent (Mock) ---`);
    console.log(`To: ${email}`);
    console.log(`Link: ${verificationLink}`);
    console.log(`--------------------------------------\n`);
  }

  /**
   * @description Generate JWT tokens
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

  // --- CORE AUTH METHODS ---

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password, name } = data;
    const lowerEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      (u) => u.email.toLowerCase() === lowerEmail
    );

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 1. Создание токена верификации и срока действия
    const verificationToken = this.generateVerificationToken();
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 часа

    // Create user
    const userId = uuidv4();
    const now = new Date();

    // 2. Добавление полей токена в объект пользователя
    const newUser: UserEntry = {
      id: userId,
      email: lowerEmail,
      name,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
      googleId: undefined,
      isVerified: false,
      verificationToken: verificationToken,
      verificationTokenExpiry: verificationTokenExpiry,
    };

    users.set(userId, newUser);

    // 3. Отправка письма с верификационной ссылкой
    await this.sendVerificationEmail(lowerEmail, verificationToken);

    // Generate tokens
    const tokens = this.generateTokens(userId, email);
    refreshTokens.add(tokens.refreshToken);

    // ✅ ИСПРАВЛЕНО: Используем 'as any' для безопасного исключения опциональных полей
    const {
      password: _,
      verificationToken: __,
      verificationTokenExpiry: ___,
      ...userWithoutPassword
    } = newUser as any;

    return {
      user: userWithoutPassword as User,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(credentials: UserCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const user = Array.from(users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Best Practice: Можно добавить проверку верификации
    /*
    if (!user.isVerified) {
        throw new Error('Email not verified. Please check your inbox.');
    }
    */

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
   * @description Finds user by email/googleId or creates a new one for social login.
   * * NOTE: This implementation uses in-memory Map. In production, use database methods.
   */
  async findOrCreateSocialUser(data: SocialUserData): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, name, googleId } = data;
    const lowerEmail = email.toLowerCase();
    const now = new Date();

    let userEntry = Array.from(users.values()).find((u) => u.email.toLowerCase() === lowerEmail);

    if (userEntry) {
      // Found existing user. Link existing account if not linked.
      if (!userEntry.googleId) {
        userEntry.googleId = googleId;
        userEntry.updatedAt = now;
      }
    } else {
      // 2. Create new user
      const userId = uuidv4();

      userEntry = {
        id: userId,
        email: lowerEmail,
        name,
        password: '', // Social users do not have a local password hash
        googleId,
        createdAt: now,
        updatedAt: now,
        isVerified: true, // Auto-verified by Google
        verificationToken: undefined,
        verificationTokenExpiry: undefined,
      };

      users.set(userId, userEntry);
    }

    // 3. Generate tokens
    const tokens = this.generateTokens(userEntry.id, userEntry.email);
    refreshTokens.add(tokens.refreshToken);

    // ✅ ИСПРАВЛЕНО: Используем 'as any' для безопасного исключения опциональных полей
    const {
      password: _,
      verificationToken: __,
      verificationTokenExpiry: ___,
      ...userWithoutPassword
    } = userEntry as any;

    return {
      user: userWithoutPassword as User,
      tokens,
    };
  }

  /**
   * @description Verifies user's email using the token provided in the link.
   */
  async verifyEmail(token: string): Promise<User> {
    // 1. Поиск пользователя по токену
    const userEntry = Array.from(users.values()).find((u) => u.verificationToken === token);

    if (!userEntry) {
      throw new Error('Invalid verification token');
    }

    // 2. Проверка срока действия
    if (userEntry.verificationTokenExpiry && userEntry.verificationTokenExpiry < Date.now()) {
      userEntry.verificationToken = undefined;
      userEntry.verificationTokenExpiry = undefined;

      throw new Error('Verification token has expired');
    }

    // 3. Успешная верификация
    userEntry.isVerified = true;
    userEntry.verificationToken = undefined;
    userEntry.verificationTokenExpiry = undefined;
    userEntry.updatedAt = new Date();

    // ✅ ИСПРАВЛЕНО: Используем 'as any' для безопасного исключения опциональных полей
    const {
      password: _,
      verificationToken: __,
      verificationTokenExpiry: ___,
      ...userWithoutPassword
    } = userEntry as any;

    return userWithoutPassword as User;
  }

  // --- STANDARD TOKEN/USER METHODS ---

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token exists
    if (!refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    try {
      // Verify token
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;

      // Generate new tokens
      const tokens = this.generateTokens(payload.userId, payload.email);

      // Remove old refresh token and add new one
      refreshTokens.delete(refreshToken);
      refreshTokens.add(tokens.refreshToken);

      return tokens;
    } catch (error) {
      refreshTokens.delete(refreshToken);
      throw new Error('Invalid or expired refresh token');
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
      throw new Error('Invalid or expired access token');
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

  // --- VALIDATION METHODS ---

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
        message: 'Password must be at least 8 characters long',
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter',
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter',
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number',
      };
    }

    return { valid: true };
  }
}

export const authService = new AuthService();
