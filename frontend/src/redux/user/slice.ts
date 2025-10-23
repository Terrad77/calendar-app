import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchUser,
  login,
  logout,
  refreshUserToken,
  register,
  updateAvatar,
  updateUser,
} from "./operations";

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

// Function to handle pending state
const handlePending = (state: UserState) => {
  state.isLoading = true;
  state.error = null;
};

// Function to handle rejected state
const handleRejected = (state: UserState, action: any) => {
  state.isLoading = false;
  state.error = action.payload || "An error occurred";
};

const initialState: UserState = {
  user: null,
  token: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  isLoggedIn: !!localStorage.getItem("accessToken"),
  isRefreshing: false,
  isLoading: false,
  error: null,
};

const slice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isLoggedIn = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isLoggedIn = false;
    },
  },
  extraReducers: (builder) =>
    builder
      // Register
      .addCase(register.pending, handlePending)
      .addCase(
        register.fulfilled,
        (
          state,
          action: PayloadAction<{
            token: string;
            refreshToken: string;
            user: User;
          }>
        ) => {
          state.isLoading = false;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
          state.isLoggedIn = true;
          state.error = null;
        }
      )
      .addCase(register.rejected, handleRejected)

      // Login
      .addCase(login.pending, handlePending)
      .addCase(
        login.fulfilled,
        (
          state,
          action: PayloadAction<{
            token: string;
            refreshToken: string;
            user: User;
          }>
        ) => {
          state.isLoading = false;
          state.isLoggedIn = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.error = null;
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
        (
          state,
          action: PayloadAction<{
            token: string;
            refreshToken: string;
            user: User;
          }>
        ) => {
          state.isLoading = false;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.user = action.payload.user;
          state.isRefreshing = false;
          state.isLoggedIn = true;
          state.error = null;
        }
      )
      .addCase(refreshUserToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.isLoggedIn = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = action.payload as string;
      })

      // Logout
      .addCase(logout.pending, handlePending)
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        // Clear state anyway on logout
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
        state.error = action.payload as string;
      })

      // Fetch User
      .addCase(fetchUser.pending, (state) => {
        handlePending(state);
        state.isRefreshing = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.isRefreshing = false;
        state.isLoggedIn = true;
        state.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        handleRejected(state, action);
        state.isRefreshing = false;
      })

      // Update User
      .addCase(updateUser.pending, handlePending)
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUser.rejected, handleRejected)

      // Update Avatar
      .addCase(updateAvatar.pending, handlePending)
      .addCase(
        updateAvatar.fulfilled,
        (
          state,
          action: PayloadAction<{
            token: string;
            refreshToken: string;
            user: User;
          }>
        ) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.error = null;
        }
      )
      .addCase(updateAvatar.rejected, handleRejected),
});

export const { clearError, setCredentials, clearCredentials } = slice.actions;
export default slice.reducer;
