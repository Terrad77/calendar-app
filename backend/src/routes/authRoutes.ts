import { Router, Request, Response } from 'express';
import { authService, AuthService } from '../services/authService.js';
import { authenticateToken, rateLimitAuth } from '../middleware/authMiddleware.js';
import { RegisterData, SocialUserData, UserCredentials } from '../types/auth.types.js';
import { isGoogleOAuthConfigured } from '../config/passport.js';
import passport from 'passport';

const router = Router();
const isDevelopment = process.env.NODE_ENV !== 'production';
const authRateLimitAttempts = isDevelopment ? 50 : 5;
const authRateLimitWindowMs = 15 * 60 * 1000;

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  rateLimitAuth(authRateLimitAttempts, authRateLimitWindowMs),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name }: RegisterData = req.body;

      // Validate input
      if (!email || !password || !name) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Email, password, and name are required',
        });
        return;
      }

      // Validate email format
      if (!AuthService.isValidEmail(email)) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid email format',
        });
        return;
      }

      // Validate password strength
      const passwordValidation = AuthService.isValidPassword(password);
      if (!passwordValidation.valid) {
        res.status(400).json({
          error: 'Validation error',
          message: passwordValidation.message,
        });
        return;
      }

      // Register user
      const result = await authService.register({ email, password, name });

      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification.',
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';

      res.status(400).json({
        error: 'Registration failed',
        message,
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  rateLimitAuth(authRateLimitAttempts, authRateLimitWindowMs),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password }: UserCredentials = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Email and password are required',
        });
        return;
      }

      // Login user
      const result = await authService.login({ email, password });

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        tokens: result.tokens,
      });
    } catch (_error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials',
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token is required',
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      tokens,
    });
  } catch (error) {
    res.status(401).json({
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User profile not found',
      });
      return;
    }
    // Check if user is verified
    if (!user.isVerified) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Account is not verified. Access restricted.',
      });
      return;
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify if token is valid
 */
router.get('/verify', authenticateToken, (req: Request, res: Response): void => {
  res.status(200).json({
    valid: true,
    user: req.user,
  });
});

// --- NEW VERIFICATION AND SOCIAL AUTH ENDPOINTS ---

/**
 * GET /api/auth/verify-email
 * Verifies the user's email using a token from the link sent via email.
 */
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const token = req.query.token as string;

    if (!token) {
      res.redirect(`${frontendUrl}/verification-failed?reason=missing_token`);
      return;
    }

    const verifiedUser = await authService.verifyEmail(token);

    res.redirect(`${frontendUrl}/verification-success?user_id=${verifiedUser.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    res.redirect(`${frontendUrl}/verification-failed?reason=${encodeURIComponent(message)}`);
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth authentication (Step 1)
 */
router.get(
  '/google',
  (req: Request, res: Response, next): void => {
    if (!isGoogleOAuthConfigured) {
      res.status(503).json({
        error: 'Google OAuth is not configured',
        message:
          'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in backend env.',
      });
      return;
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback (Step 2)
 */
router.get(
  '/google/callback',
  (req: Request, res: Response, next): void => {
    if (!isGoogleOAuthConfigured) {
      res.status(503).json({
        error: 'Google OAuth is not configured',
        message:
          'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in backend env.',
      });
      return;
    }
    next();
  },
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  async (req: Request, res: Response): Promise<void> => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const userProfile = req.user as SocialUserData | undefined;

      if (!userProfile) {
        res.redirect(`${frontendUrl}/signin?error=auth_failed`);
        return;
      }

      const { tokens } = await authService.findOrCreateSocialUser(userProfile);

      res.redirect(
        `${frontendUrl}/auth/success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`
      );
    } catch (error) {
      console.error('Google Auth Callback Error:', error);
      res.redirect(`${frontendUrl}/signin?error=auth_failed`);
    }
  }
);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    const { name, theme } = req.body;

    if (!name && !theme) {
      res.status(400).json({
        error: 'Validation error',
        message: 'At least one field (name or theme) is required',
      });
      return;
    }

    const updatedUser = await authService.updateProfile(req.user.userId, { name, theme });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated',
        });
        return;
      }

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Old password and new password are required',
        });
        return;
      }

      if (oldPassword === newPassword) {
        res.status(400).json({
          error: 'Validation error',
          message: 'New password must be different from current password',
        });
        return;
      }

      await authService.changePassword(req.user.userId, oldPassword, newPassword);

      res.status(200).json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      res.status(400).json({
        error: 'Password change failed',
        message,
      });
    }
  }
);

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete('/account', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Password is required to delete account',
      });
      return;
    }

    await authService.deleteAccount(req.user.userId, password);

    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    res.status(400).json({
      error: 'Account deletion failed',
      message,
    });
  }
});

export default router;
