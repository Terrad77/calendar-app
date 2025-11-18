import { Router, Request, Response } from 'express';
import { authService, AuthService } from '../services/authService.js';
import { authenticateToken, rateLimitAuth } from '../middleware/authMiddleware.js';
import { RegisterData, UserCredentials } from '../types/auth.types.js';
import passport from 'passport';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  rateLimitAuth(5, 15 * 60 * 1000),
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
  rateLimitAuth(5, 15 * 60 * 1000),
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
    } catch (error) {
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const token = req.query.token as string;

    if (!token) {
      res.redirect(`${frontendUrl}/verification-failed?reason=missing_token`);
      return;
    }

    const verifiedUser = await authService.verifyEmail(token);

    // Best Practice: Перенаправить на страницу успеха на фронтенде
    res.redirect(`${frontendUrl}/verification-success?user_id=${verifiedUser.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    // Перенаправить на страницу ошибки на фронтенде с причиной
    res.redirect(`${frontendUrl}/verification-failed?reason=${encodeURIComponent(message)}`);
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth authentication (Step 1)
 */
router.get(
  '/google',
  // session: false - важно для API без состояния
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback (Step 2)
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  async (req: Request, res: Response): Promise<void> => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      // req.user содержит данные, полученные от Google и обработанные Passport
      const userProfile = req.user as any;

      const { user, tokens } = await authService.findOrCreateSocialUser({
        // Passport.js часто помещает данные в req.user.emails
        email: userProfile.emails[0].value,
        name: userProfile.displayName,
        googleId: userProfile.id,
      });

      // Перенаправление на клиент с токенами в параметрах URL
      res.redirect(
        `${frontendUrl}/auth/success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`
      );
    } catch (error) {
      console.error('Google Auth Callback Error:', error);
      // В случае ошибки перенаправляем на страницу ошибки на фронтенде
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
);
export default router;
