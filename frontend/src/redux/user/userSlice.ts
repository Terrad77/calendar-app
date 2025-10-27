import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchUser, login, logout, refreshUserToken, register } from './operations';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
  theme?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  token: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoggedIn: !!localStorage.getItem('accessToken'),
  isRefreshing: false,
  isLoading: false,
  error: null,
};

// --- Helpers ---
const handlePending = (state: UserState) => {
  state.isLoading = true;
  state.error = null;
};

const handleRejected = (state: UserState, action: any) => {
  state.isLoading = false;
  state.error = action.payload || 'An error occurred';
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
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, handlePending)
      .addCase(
        register.fulfilled,
        (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isLoggedIn = true;
        }
      )
      .addCase(register.rejected, handleRejected)

      // Login
      .addCase(login.pending, handlePending)
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isLoggedIn = true;
        }
      )
      .addCase(login.rejected, handleRejected)

      // Refresh Token
      .addCase(refreshUserToken.pending, (state) => {
        state.isLoading = true;
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase(
        refreshUserToken.fulfilled,
        (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
          state.isLoading = false;
          state.isRefreshing = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isLoggedIn = true;
        }
      )
      .addCase(refreshUserToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.error = action.payload as string;
      })

      // Logout
      .addCase(logout.pending, handlePending)
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch User
      .addCase(fetchUser.pending, handlePending)
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isLoading = false;
        state.isRefreshing = false;
        state.isLoggedIn = true;
      })
      .addCase(fetchUser.rejected, handleRejected);
  },
});

export const { clearError, clearCredentials } = userSlice.actions;
export default userSlice.reducer;
