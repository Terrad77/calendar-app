import axios from 'axios';
import { store } from '../redux/store';
import { clearCredentials } from '../redux/user/userSlice';

// Используйте import.meta.env вместо process.env для Vite
const API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001';

const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token to all requests
instance.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.user.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const state = store.getState();
        const refreshToken = state.user.refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;

        // Update token in store (this will be handled by the refreshUserToken action)
        // For now, just retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return instance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        store.dispatch(clearCredentials());

        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/signin';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
