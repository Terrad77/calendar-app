import { createAsyncThunk } from '@reduxjs/toolkit';
import instance from '../../API/axiosInstance';
import toastMaker from '../../utils/toastMaker/toastMaker';
import type { RootState, AppDispatch } from '../types/storeTypes';
import type { User, UserInfo, RegisterInfo, UserData, AxiosError } from './types';

// --- Helpers to manage auth headers ---
const setAuthHeader = (token: string) => {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
const clearAuthHeader = () => {
  instance.defaults.headers.common['Authorization'] = '';
};

// Login user
export const loginUser = createAsyncThunk<
  { user: User; token: string; refreshToken: string },
  UserInfo,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/login', async (userInfo, thunkAPI) => {
  try {
    console.log('Sending login request...');
    const { data } = await instance.post('/api/auth/login', userInfo);
    console.log('Login response:', data);

    setAuthHeader(data.tokens.accessToken);
    return {
      user: data.user,
      token: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  } catch (error: any) {
    // ← используем any для простоты
    console.log('Login request failed:', error);
    console.log('Error response:', error.response?.data);

    const msg = error.response?.data?.message || error.response?.data?.error || 'Login failed';
    toastMaker(msg, 'error');
    return thunkAPI.rejectWithValue(msg);
  }
});

// Register user
export const registerUser = createAsyncThunk<
  { user: User; token: string; refreshToken: string },
  RegisterInfo,
  { state: RootState; dispatch: AppDispatch; rejectValue: { message: string; statusCode?: number } }
>('user/register', async (userInfo, thunkAPI) => {
  try {
    const { data } = await instance.post('/api/auth/register', userInfo);
    setAuthHeader(data.tokens.accessToken);
    return {
      user: data.user,
      token: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      'Registration failed';

    toastMaker(message, 'error');
    return thunkAPI.rejectWithValue({
      message,
      statusCode: axiosError.response?.status,
    });
  }
});

// ---------------------------
// Logout user
// ---------------------------
export const logout = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/logout', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const refreshToken = state.user.refreshToken;
    if (refreshToken) {
      await instance.post('/api/auth/logout', { refreshToken });
    }
    clearAuthHeader();
  } catch (error: unknown) {
    clearAuthHeader();
    const msg = (error as AxiosError).message || 'Logout failed';
    return thunkAPI.rejectWithValue(msg);
  }
});

// ---------------------------
// Refresh user token
// ---------------------------
export const refreshUserToken = createAsyncThunk<
  { user: User; token: string; refreshToken: string },
  void,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/refreshUserToken', async (_, thunkAPI) => {
  const state = thunkAPI.getState();
  const refreshToken = state.user.refreshToken;

  if (!refreshToken) {
    return thunkAPI.rejectWithValue('No refresh token available');
  }

  try {
    const { data } = await instance.post('/api/auth/refresh', { refreshToken });
    setAuthHeader(data.tokens.accessToken);

    const userResponse = await instance.get('/api/auth/me');
    return {
      user: userResponse.data.user,
      token: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  } catch (error: unknown) {
    clearAuthHeader();
    const msg = (error as AxiosError).message || 'Failed to refresh token';
    return thunkAPI.rejectWithValue(msg);
  }
});

// ---------------------------
// Fetch current user
// ---------------------------
export const fetchUser = createAsyncThunk<
  User,
  void,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/fetchUser', async (_, thunkAPI) => {
  try {
    const { data } = await instance.get('/api/auth/me');
    return data.user;
  } catch (error: unknown) {
    const msg =
      (error as AxiosError).response?.data?.message ||
      (error as AxiosError).message ||
      'Failed to fetch user';
    return thunkAPI.rejectWithValue(msg);
  }
});

// ---------------------------
// Update user profile
// ---------------------------
export const updateUser = createAsyncThunk<
  User,
  UserData,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/updateUser', async (userData, thunkAPI) => {
  try {
    const { data } = await instance.patch('/api/auth/profile', userData);
    return data.user;
  } catch (error: unknown) {
    const msg = (error as AxiosError).response?.data?.message || 'Failed to update profile';
    toastMaker(msg, 'error');
    return thunkAPI.rejectWithValue(msg);
  }
});

// ---------------------------
// Update avatar
// ---------------------------
export const updateAvatar = createAsyncThunk<
  { user: User; token?: string; refreshToken?: string },
  File,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/updateAvatar', async (avatarFile, thunkAPI) => {
  try {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const { data } = await instance.patch('/api/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return {
      user: data.user,
      token: data.tokens?.accessToken,
      refreshToken: data.tokens?.refreshToken,
    };
  } catch (error: unknown) {
    const msg = (error as AxiosError).message || 'Failed to update avatar';
    toastMaker(msg, 'error');
    return thunkAPI.rejectWithValue(msg);
  }
});

export { setAuthHeader, clearAuthHeader };
