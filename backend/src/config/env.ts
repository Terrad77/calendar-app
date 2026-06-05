// Single source of truth for all environment variables.
// No other file in this project should read process.env directly.
const env = Object.freeze({
  isDemoMode: process.env.DEMO_MODE === 'true',
  /** Matches the version field in package.json */
  version: '1.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  port: parseInt(process.env.PORT || '3001', 10),
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
});

export { env };
