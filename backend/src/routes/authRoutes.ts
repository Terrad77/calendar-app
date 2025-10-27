import { Router, Request, Response } from "express";
import { authService, AuthService } from "../services/authService.js";
import {
  authenticateToken,
  rateLimitAuth,
} from "../middleware/authMiddleware.js";
import { RegisterData, UserCredentials } from "../types/auth.types.js";

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  "/register",
  rateLimitAuth(5, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name }: RegisterData = req.body;

      // Validate input
      if (!email || !password || !name) {
        res.status(400).json({
          error: "Validation error",
          message: "Email, password, and name are required",
        });
        return;
      }

      // Validate email format
      if (!AuthService.isValidEmail(email)) {
        res.status(400).json({
          error: "Validation error",
          message: "Invalid email format",
        });
        return;
      }

      // Validate password strength
      const passwordValidation = AuthService.isValidPassword(password);
      if (!passwordValidation.valid) {
        res.status(400).json({
          error: "Validation error",
          message: passwordValidation.message,
        });
        return;
      }

      // Register user
      const result = await authService.register({ email, password, name });

      res.status(201).json({
        message: "User registered successfully",
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";

      res.status(400).json({
        error: "Registration failed",
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
  "/login",
  rateLimitAuth(5, 15 * 60 * 1000),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password }: UserCredentials = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          error: "Validation error",
          message: "Email and password are required",
        });
        return;
      }

      // Login user
      const result = await authService.login({ email, password });

      res.status(200).json({
        message: "Login successful",
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      res.status(401).json({
        error: "Authentication failed",
        message: "Invalid credentials",
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: "Validation error",
        message: "Refresh token is required",
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      message: "Token refreshed successfully",
      tokens,
    });
  } catch (error) {
    res.status(401).json({
      error: "Token refresh failed",
      message: error instanceof Error ? error.message : "Invalid refresh token",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  "/logout",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.status(200).json({
        message: "Logout successful",
      });
    } catch (error) {
      res.status(500).json({
        error: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  "/me",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "Authentication required",
          message: "User not authenticated",
        });
        return;
      }

      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          error: "User not found",
          message: "User profile not found",
        });
        return;
      }

      res.status(200).json({
        user,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get user profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/auth/verify
 * Verify if token is valid
 */
router.get(
  "/verify",
  authenticateToken,
  (req: Request, res: Response): void => {
    res.status(200).json({
      valid: true,
      user: req.user,
    });
  }
);

export default router;
