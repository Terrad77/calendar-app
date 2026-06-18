import { User } from '../../types/auth.types';

export interface UserState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  // True once restoreSession has settled (fulfilled or rejected) — the only
  // reliable "session restore finished" marker for gating authed queries.
  sessionRestored: boolean;
  isLoading: boolean;
  error: string | null;
  // Auto-detected city (IP geolocation) for weather-aware AI answers.
  userCity: string;
}
