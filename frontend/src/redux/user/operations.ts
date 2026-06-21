import { createAsyncThunk } from '@reduxjs/toolkit';
import instance from '../../API/axiosInstance';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { authenticationService } from '../../services/authService';
import type { RootState, AppDispatch } from '../types/storeTypes';
import type { User, UserInfo, RegisterInfo, UserData, AxiosError } from './types';

export type AuthErrorPayload = {
  message: string;
  shouldLogout: boolean;
  status?: number;
};

// --- Helpers to manage auth headers ---
const setAuthHeader = (token: string) => {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
const clearAuthHeader = () => {
  instance.defaults.headers.common['Authorization'] = '';
};

// Login user
export const logIn = createAsyncThunk<
  { user: User; token: string; refreshToken: string },
  UserInfo,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/login', async (userInfo, thunkAPI) => {
  try {
    const { data } = await instance.post('/api/auth/login', userInfo);

    setAuthHeader(data.tokens.accessToken);
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    return {
      user: data.user,
      token: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const msg =
      axiosError.response?.data?.message || axiosError.response?.data?.error || 'Login failed';
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
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
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
export const logOut = createAsyncThunk<
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
    authenticationService.clearAccessToken();
  } catch (error: unknown) {
    clearAuthHeader();
    authenticationService.clearAccessToken();
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
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);

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
  { state: RootState; dispatch: AppDispatch; rejectValue: AuthErrorPayload }
>('user/fetchUser', async (_, thunkAPI) => {
  try {
    const { data } = await instance.get('/api/auth/me');
    return data.user;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const message =
      axiosError.response?.data?.message || axiosError.message || 'Failed to fetch user';

    if (status === 403) {
      toastMaker(message || 'Account not verified. Please verify your email.', 'error');
      return thunkAPI.rejectWithValue({ message, shouldLogout: true, status });
    }

    if (status === 401) {
      return thunkAPI.rejectWithValue({ message, shouldLogout: false, status });
    }

    return thunkAPI.rejectWithValue({ message, shouldLogout: false, status });
  }
});

export const restoreSession = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch }
>('user/restoreSession', async (_, thunkAPI) => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!accessToken && !refreshToken) {
    return;
  }

  if (accessToken && refreshToken) {
    thunkAPI.dispatch({
      type: 'user/setTokens',
      payload: { accessToken, refreshToken },
    });
    setAuthHeader(accessToken);
  }

  if (accessToken) {
    try {
      await thunkAPI.dispatch(fetchUser()).unwrap();
      return;
    } catch (error) {
      const payload = error as AuthErrorPayload | undefined;

      if (payload?.shouldLogout || (payload?.status && payload.status !== 401)) {
        return;
      }
    }
  }

  if (refreshToken) {
    try {
      await thunkAPI.dispatch(refreshUserToken()).unwrap();
      return;
    } catch {
      thunkAPI.dispatch({ type: 'user/clearCredentials' });
      clearAuthHeader();
      authenticationService.clearAccessToken();
    }
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
// Update workspace settings (startOfWeek, timeZone, workingHours, etc.)
// ---------------------------
export interface SettingsData {
  startOfWeek?: string;
  timeZone?: string;
  workingHours?: string;
  compactDensity?: boolean;
  emailDigest?: boolean;
}

export const updateSettings = createAsyncThunk<
  User,
  SettingsData,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/updateSettings', async (settingsData, thunkAPI) => {
  try {
    const { data } = await instance.put('/api/auth/settings', settingsData);
    return data.user;
  } catch (error: unknown) {
    const msg = (error as AxiosError).response?.data?.message || 'Failed to save settings';
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

// ---------------------------
// Change password
// ---------------------------
export const changePassword = createAsyncThunk<
  void,
  { oldPassword: string; newPassword: string },
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/changePassword', async (passwords, thunkAPI) => {
  try {
    await instance.post('/api/auth/change-password', {
      oldPassword: passwords.oldPassword,
      newPassword: passwords.newPassword,
    });
    toastMaker('Password changed successfully!', 'success');
  } catch (error: unknown) {
    const msg =
      (error as AxiosError).response?.data?.message ||
      (error as AxiosError).message ||
      'Failed to change password';
    toastMaker(msg, 'error');
    return thunkAPI.rejectWithValue(msg);
  }
});

// ---------------------------
// Delete account
// ---------------------------
export const deleteAccount = createAsyncThunk<
  void,
  string,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/deleteAccount', async (password, thunkAPI) => {
  try {
    await instance.delete('/api/auth/account', {
      data: { password },
    });
    clearAuthHeader();
    toastMaker('Account deleted successfully', 'success');
  } catch (error: unknown) {
    const msg =
      (error as AxiosError).response?.data?.message ||
      (error as AxiosError).message ||
      'Failed to delete account';
    toastMaker(msg, 'error');
    return thunkAPI.rejectWithValue(msg);
  }
});

// ---------------------------
// Save language and country preferences
// ---------------------------
export const saveLanguageAndCountry = createAsyncThunk<
  User,
  { language?: string; preferredCountry?: string },
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>('user/saveLanguageAndCountry', async (preferences, thunkAPI) => {
  try {
    const { data } = await instance.put('/api/auth/profile', preferences);
    // Also update localStorage for immediate effect
    if (preferences.language) {
      localStorage.setItem('language', preferences.language);
    }
    if (preferences.preferredCountry) {
      localStorage.setItem('preferredCountry', preferences.preferredCountry);
    }
    return data.user;
  } catch (error: unknown) {
    const msg =
      (error as AxiosError).response?.data?.message ||
      (error as AxiosError).message ||
      'Failed to save preferences';
    return thunkAPI.rejectWithValue(msg);
  }
});
