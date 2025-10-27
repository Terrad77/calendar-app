import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";
import { TokenPayload } from "../types/auth.types";

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: "Authentication required",
        message: "No authorization header provided",
      });
      return;
    }

    // Check if token format is correct (Bearer <token>)
    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      res.status(401).json({
        error: "Invalid token format",
        message: "Authorization header must be in format: Bearer <token>",
      });
      return;
    }

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Attach user data to request
    req.user = payload;

    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    res.status(401).json({
      error: "Authentication failed",
      message,
    });
  }
};

/**
 * Middleware to check if user owns the resource
 */
export const authorizeOwnership = (userIdParam: string = "userId") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "Authentication required",
          message: "User not authenticated",
        });
        return;
      }

      const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

      if (!resourceUserId) {
        res.status(400).json({
          error: "Bad request",
          message: `Missing ${userIdParam} parameter`,
        });
        return;
      }

      // Check if authenticated user matches resource owner
      if (req.user.userId !== resourceUserId) {
        res.status(403).json({
          error: "Forbidden",
          message: "You do not have permission to access this resource",
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: "Authorization error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer === "Bearer" && token) {
      try {
        const payload = authService.verifyAccessToken(token);
        req.user = payload;
      } catch {
        // Token invalid, but we don't fail the request
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitAuth = (
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.body.email || req.ip;

    if (!identifier) {
      next();
      return;
    }

    const now = Date.now();
    const attemptData = loginAttempts.get(identifier);

    // Clean up expired entries
    if (attemptData && now > attemptData.resetTime) {
      loginAttempts.delete(identifier);
    }

    const current = loginAttempts.get(identifier);

    if (!current) {
      loginAttempts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (current.count >= maxAttempts) {
      const remainingTime = Math.ceil((current.resetTime - now) / 1000 / 60);
      res.status(429).json({
        error: "Too many attempts",
        message: `Too many login attempts. Please try again in ${remainingTime} minutes.`,
      });
      return;
    }

    current.count++;
    loginAttempts.set(identifier, current);
    next();
  };
};
