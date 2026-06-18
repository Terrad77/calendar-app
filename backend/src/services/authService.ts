import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import { sendVerificationEmail } from './mailerService.js';
import {
  AuthTokens,
  RegisterData,
  SocialUserData,
  TokenPayload,
  User,
  UserCredentials,
} from '../types/auth.types.js';
import { getDb } from '../db.js';
import { refreshTokens as refreshTokensTable, users as usersTable } from '../schema.js';
import { env } from '../config/env.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

// AuthService handles user authentication, including:
//  registration, login, social login, email verification, token management, profile updates, and account deletion.
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

    // Unique jti: refresh tokens are persisted under a UNIQUE index, and two
    // tokens minted for the same user within the same second (e.g. register
    // then immediate login) would otherwise be byte-identical and collide.
    const refreshToken = jwt.sign({ ...payload, jti: randomUUID() }, JWT_REFRESH_SECRET, {
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
    const userId = randomUUID();
    const now = new Date();

    // In demo mode users are pre-verified so no email round-trip is needed.
    const isVerifiedOnCreate = env.isDemoMode;
    const verificationToken = isVerifiedOnCreate ? null : this.generateVerificationToken();
    const verificationTokenExpiry = isVerifiedOnCreate ? null : Date.now() + 24 * 60 * 60 * 1000;

    const [createdUser] = await database
      .insert(usersTable)
      .values({
        id: userId,
        email: lowerEmail,
        name,
        password: hashedPassword,
        googleId: null,
        isVerified: isVerifiedOnCreate,
        verificationToken,
        verificationTokenExpiry,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!createdUser) {
      throw new Error('Failed to create user');
    }

    if (!env.isDemoMode) {
      const verificationLink = `${env.backendUrl}/api/auth/verify-email?token=${verificationToken}`;
      // Email delivery is a side effect, not part of the registration contract.
      // The user row is already committed, so a transient SMTP failure must not
      // turn a successful registration into a 400 — log and continue.
      try {
        await sendVerificationEmail(lowerEmail, verificationLink);
      } catch (error) {
        console.error('Failed to send verification email during registration:', error);
      }
    }

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
    try {
      const database = getDb();
      const { email, name, googleId } = data;
      const lowerEmail = email.toLowerCase();
      const now = new Date();

      // Check if user exists by email
      const existingUsers = await database
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, lowerEmail))
        .limit(1);

      let user = existingUsers.length > 0 ? existingUsers[0] : null;

      if (user) {
        // Update existing user with googleId if missing
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
        // Create new user if not exists
        const [createdUser] = await database
          .insert(usersTable)
          .values({
            id: randomUUID(),
            email: lowerEmail,
            name,
            password: '', // Social users don't have a local password
            googleId,
            isVerified: true, // Social emails are pre-verified
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
    } catch (error) {
      console.error('Database error in findOrCreateSocialUser:', error);
      throw error;
    }
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
    } catch (_error) {
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
    } catch (_error) {
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

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      theme?: string;
      language?: string;
      preferredCountry?: string;
      jobTitle?: string;
    }
  ): Promise<User> {
    const database = getDb();
    const updates: Partial<typeof usersTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name) updates.name = data.name;
    if (data.theme) updates.theme = data.theme;
    if (data.language) updates.language = data.language;
    if (data.preferredCountry) updates.preferredCountry = data.preferredCountry;
    // Allow setting or clearing the job title (empty string clears it)
    if (data.jobTitle !== undefined) updates.jobTitle = data.jobTitle;

    const [updatedUser] = await database
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return this.toPublicUser(updatedUser);
  }

  async updateSettings(
    userId: string,
    data: {
      startOfWeek?: string;
      timeZone?: string;
      workingHours?: string;
      compactDensity?: boolean;
      emailDigest?: boolean;
    }
  ): Promise<User> {
    const database = getDb();
    const updates: Partial<typeof usersTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.startOfWeek !== undefined) updates.startOfWeek = data.startOfWeek;
    if (data.timeZone !== undefined) updates.timeZone = data.timeZone;
    if (data.workingHours !== undefined) updates.workingHours = data.workingHours;
    if (data.compactDensity !== undefined) updates.compactDensity = data.compactDensity;
    if (data.emailDigest !== undefined) updates.emailDigest = data.emailDigest;

    const [updatedUser] = await database
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return this.toPublicUser(updatedUser);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const database = getDb();

    // Get user
    const users = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const user = users[0];

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has a local password (not social login only)
    if (!user.password) {
      throw new Error('Cannot change password for social login accounts');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = AuthService.isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await database
      .update(usersTable)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId));
  }

  async deleteAccount(userId: string, password?: string): Promise<void> {
    const database = getDb();

    // Get user
    const users = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const user = users[0];

    if (!user) {
      throw new Error('User not found');
    }

    // Google OAuth users have no local password and skip the password check.
    // Anyone with a local password must provide a matching one.
    if (user.password) {
      if (!password) {
        throw new Error('Password is required to delete account');
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Password is incorrect');
      }
    }

    // Delete all refresh tokens
    await database.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, userId));

    // Delete user
    await database.delete(usersTable).where(eq(usersTable.id, userId));
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
