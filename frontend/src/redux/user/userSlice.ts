import { createSlice } from '@reduxjs/toolkit';

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
// const handlePending = (state: UserState) => {
//   state.isLoading = true;
//   state.error = null;
// };

// const handleRejected = (state: UserState, action: any) => {
//   state.isLoading = false;
//   state.error = action.payload || 'An error occurred';
// };

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
      .addCase('user/register/pending', (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase('user/register/fulfilled', (state, action: any) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoggedIn = true;
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase('user/register/rejected', (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload || 'Registration failed';
      })

      // Login
      .addCase('user/login/pending', (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase('user/login/fulfilled', (state, action: any) => {
        console.log('Login fulfilled in reducer:', action.payload);
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoggedIn = true;
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase('user/login/rejected', (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload || 'Login failed';
      })

      // Refresh Token
      .addCase('user/refreshUserToken/pending', (state) => {
        state.isLoading = true;
        state.isRefreshing = true;
        state.error = null;
      })
      .addCase('user/refreshUserToken/fulfilled', (state, action: any) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isLoggedIn = true;
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase('user/refreshUserToken/rejected', (state, action: any) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.error = action.payload as string;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })

      // Logout
      .addCase('user/logout/pending', (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase('user/logout/fulfilled', (state) => {
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
      .addCase('user/logout/rejected', (state, action: any) => {
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
      .addCase('user/fetchUser/pending', (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase('user/fetchUser/fulfilled', (state, action: any) => {
        state.user = action.payload;
        state.isLoading = false;
        state.isRefreshing = false;
        state.isLoggedIn = true;
      })
      .addCase('user/fetchUser/rejected', (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch user';
      });
  },
});

export const { clearError, clearCredentials } = userSlice.actions;
export default userSlice.reducer;
