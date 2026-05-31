import axios from 'axios';
import { authenticationService } from '../services/authService';

// Используйте import.meta.env вместо process.env для Vite
const API_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token to all requests
instance.interceptors.request.use(
  (config) => {
    const token =
      authenticationService.getAccessToken() ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token');

    if (token && token !== 'null') {
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
        const refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('token');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data.tokens;

        // Update token in store (this will be handled by the refreshUserToken action)
        // For now, just retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return instance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear local auth state
        authenticationService.clearAccessToken();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('token');

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
