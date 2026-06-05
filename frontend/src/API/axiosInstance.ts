import axios from 'axios';
import { authenticationService } from '../services/authService';

const API_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001';

const instance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

const refreshAccessToken = async (): Promise<{ accessToken: string; refreshToken: string }> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('token');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: nextRefreshToken } = response.data.tokens;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', nextRefreshToken);

    return { accessToken, refreshToken: nextRefreshToken };
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// Request interceptor - add token to all requests
instance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('accessToken') ||
      authenticationService.getAccessToken() ||
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

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { accessToken, refreshToken } = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        return instance(originalRequest);
      } catch (refreshError) {
        authenticationService.clearAccessToken();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
