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
  avatarURL: string;
  theme?: string;
}

export interface UserState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  isLoading: boolean;
}

// function to handle pending state
const handlePending = (state: UserState) => {
  state.isLoading = true;
};
// function to handle rejected state
const handleRejected = (state: UserState) => {
  state.isLoading = false;
};

const initialState: UserState = {
  user: {
    id: "",
    name: "",
    email: "",
    avatarURL: "",
    theme: "",
  },
  token: null,
  refreshToken: null,
  isLoggedIn: false,
  isRefreshing: false,
  isLoading: false,
};

const slice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) =>
    builder
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
        }
      )
      .addCase(register.rejected, handleRejected)
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
        }
      )
      .addCase(login.rejected, handleRejected)
      .addCase(refreshUserToken.pending, (state) => {
        state.isLoading = true;
        state.isRefreshing = true;
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
          state.isRefreshing = false;
          state.isLoggedIn = true;
        }
      )
      .addCase(refreshUserToken.rejected, (state) => {
        state.isLoading = false;
        state.isRefreshing = false;
      })
      .addCase(logout.pending, handlePending)
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = {
          id: "",
          name: "",
          email: "",
          avatarURL: "",
          theme: "",
        };
        state.token = null;
        state.refreshToken = null;
        state.isLoggedIn = false;
        state.isRefreshing = false;
      })
      .addCase(logout.rejected, handleRejected)
      .addCase(fetchUser.pending, handlePending, (state) => {
        state.isRefreshing = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.isRefreshing = false;
      })
      .addCase(fetchUser.rejected, handleRejected, (state) => {
        state.isRefreshing = false;
      })
      .addCase(updateUser.pending, handlePending)
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateUser.rejected, handleRejected)
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
        }
      )
      .addCase(updateAvatar.rejected, handleRejected),
});

export default slice.reducer;
