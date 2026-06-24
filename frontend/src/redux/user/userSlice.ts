import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthPayload, User } from '../../types/auth.types';
import type { UserState } from './user.types';
import {
  registerUser,
  logIn,
  logOut,
  fetchUser,
  restoreSession,
  changePassword,
  deleteAccount,
  saveLanguageAndCountry,
  updateUser,
  updateSettings,
} from './operations';
import { resetAuthState } from './authHelpers';

const initialState: UserState = {
  user: null,
  token: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoggedIn: false,
  isRefreshing: !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken')),
  sessionRestored: false,
  isLoading: false,
  error: null,
  userCity: '',
};

// --- Slice ---
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isLoggedIn = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    setTokens: (state, action: { payload: { accessToken: string; refreshToken: string } }) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    setUserCity: (state, action: PayloadAction<string>) => {
      state.userCity = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase('user/register/pending', (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthPayload>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoggedIn = true;
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || action.error?.message || 'Registration failed';
      })

      // Login
      .addCase(logIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logIn.fulfilled, (state, action: PayloadAction<AuthPayload>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoggedIn = true;
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(logIn.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.isLoading = false;
        state.error = action.payload || 'Login failed';
      })

      // Logout
      .addCase(logOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logOut.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
        state.isLoading = false;
        state.error = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .addCase(logOut.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
        state.isLoading = false;
        state.error = action.payload as string;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })

      // Fetch User
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true;
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isLoading = false;
        state.isRefreshing = false; // if success delete flag waiting
        state.isLoggedIn = true;
        // Save user preferences to localStorage
        if (action.payload.language) {
          localStorage.setItem('language', action.payload.language);
        }
        if (action.payload.preferredCountry) {
          localStorage.setItem('preferredCountry', action.payload.preferredCountry);
        }
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        const payload = action.payload;
        state.error = payload?.message || 'Failed to fetch user';

        if (payload?.shouldLogout) {
          resetAuthState(state);
        }
      })

      // Restore session on app load
      .addCase(restoreSession.pending, (state) => {
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state) => {
        state.isRefreshing = false;
        state.sessionRestored = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isRefreshing = false;
        state.sessionRestored = true;
      })

      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Delete Account
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isLoading = false;
        state.error = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .addCase(deleteAccount.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Save Language and Country
      .addCase(saveLanguageAndCountry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveLanguageAndCountry.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        if (state.user) {
          state.user = action.payload;
        }
      })
      .addCase(
        saveLanguageAndCountry.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.isLoading = false;
          state.error = action.payload as string;
        }
      )

      // Update Profile (name, job title, etc.)
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        // Merge so any fields not echoed by the response are preserved
        state.user = state.user ? { ...state.user, ...action.payload } : action.payload;
        state.error = null;
      })
      .addCase(updateUser.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.error = action.payload as string;
      })

      // Update Settings (startOfWeek, timeZone, working hours, etc.)
      .addCase(updateSettings.fulfilled, (state, action: PayloadAction<User>) => {
        // Merge so any fields not echoed by the response are preserved
        state.user = state.user ? { ...state.user, ...action.payload } : action.payload;
        state.error = null;
      })
      .addCase(updateSettings.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCredentials, setTokens, setUserCity } = userSlice.actions;
export default userSlice.reducer;
