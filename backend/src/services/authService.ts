import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import { sendVerificationEmail } from './mailerService';
import {
  AuthTokens,
  RegisterData,
  SocialUserData,
  TokenPayload,
  User,
  UserCredentials,
} from '../types/auth.types';
import { getDb } from '../db';
import { refreshTokens as refreshTokensTable, users as usersTable } from '../schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

export class AuthService {
  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

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

  private toPublicUser(user: typeof usersTable.$inferSelect): User {
    const { password: _, ...publicUser } = user;
    return publicUser as User;
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const database = getDb();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await database.insert(refreshTokensTable).values({
      userId,
      token,
      expiresAt,
    });
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    const database = getDb();
    const { email, password, name } = data;
    const lowerEmail = email.toLowerCase();

    const existingUser = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, lowerEmail))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = this.generateVerificationToken();
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    const userId = randomUUID();
    const now = new Date();

    const [createdUser] = await database
      .insert(usersTable)
      .values({
        id: userId,
        email: lowerEmail,
        name,
        password: hashedPassword,
        googleId: null,
        isVerified: false,
        verificationToken,
        verificationTokenExpiry,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const verificationLink = `${backendUrl}/api/auth/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(lowerEmail, verificationLink);

    const tokens = this.generateTokens(userId, lowerEmail);
    await this.storeRefreshToken(userId, tokens.refreshToken);

    return {
      user: this.toPublicUser(createdUser),
      tokens,
    };
  }

  async login(credentials: UserCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const database = getDb();
    const { email, password } = credentials;

    const users = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);
    const user = users[0];

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const tokens = this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toPublicUser(user),
      tokens,
    };
  }

  async findOrCreateSocialUser(data: SocialUserData): Promise<{ user: User; tokens: AuthTokens }> {
    const database = getDb();
    const { email, name, googleId } = data;
    const lowerEmail = email.toLowerCase();
    const now = new Date();

    const existingUsers = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, lowerEmail))
      .limit(1);

    let user = existingUsers[0];

    if (user) {
      const updates: Partial<typeof usersTable.$inferInsert> = {
        updatedAt: now,
      };

      if (!user.googleId) {
        updates.googleId = googleId;
      }

      const [updatedUser] = await database
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, user.id))
        .returning();

      if (updatedUser) {
        user = updatedUser;
      }
    } else {
      const [createdUser] = await database
        .insert(usersTable)
        .values({
          id: randomUUID(),
          email: lowerEmail,
          name,
          password: '',
          googleId,
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!createdUser) {
        throw new Error('Failed to create social user');
      }

      user = createdUser;
    }

    const tokens = this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toPublicUser(user),
      tokens,
    };
  }

  async verifyEmail(token: string): Promise<User> {
    const database = getDb();

    const users = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.verificationToken, token))
      .limit(1);
    const user = users[0];

    if (!user) {
      throw new Error('Invalid verification token');
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < Date.now()) {
      await database
        .update(usersTable)
        .set({
          verificationToken: null,
          verificationTokenExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id));

      throw new Error('Verification token has expired');
    }

    const [verifiedUser] = await database
      .update(usersTable)
      .set({
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    if (!verifiedUser) {
      throw new Error('Failed to verify user');
    }

    return this.toPublicUser(verifiedUser);
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const database = getDb();

    const storedTokens = await database
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.token, refreshToken))
      .limit(1);

    if (storedTokens.length === 0) {
      throw new Error('Invalid refresh token');
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;
      const tokens = this.generateTokens(payload.userId, payload.email);

      await database.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));
      await this.storeRefreshToken(payload.userId, tokens.refreshToken);

      return tokens;
    } catch (error) {
      await database.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const database = getDb();
    await database.delete(refreshTokensTable).where(eq(refreshTokensTable.token, refreshToken));
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const database = getDb();

    const users = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const user = users[0];

    if (!user) {
      return null;
    }

    return this.toPublicUser(user);
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

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
