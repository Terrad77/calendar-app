import { User } from '../../types/auth.types';

export interface UserState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  isLoading: boolean;
  error: string | null;
  // Auto-detected city (IP geolocation) for weather-aware AI answers.
  userCity: string;
}
