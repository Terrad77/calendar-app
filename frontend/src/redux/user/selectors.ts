import { RootState } from '../store';
import type { UserState } from './userSlice';

const selectUserState = (state: RootState): UserState => state.user as unknown as UserState;

// --- Selectors ---
export const selectIsLoggedIn = (state: RootState): boolean => selectUserState(state).isLoggedIn;

export const selectUser = (state: RootState) => selectUserState(state).user;

export const selectUserEmail = (state: RootState): string | null =>
  selectUserState(state).user?.email || null;

export const selectUserName = (state: RootState): string | null =>
  selectUserState(state).user?.name || null;

export const selectUserId = (state: RootState): string | null =>
  selectUserState(state).user?.id || null;

export const selectIsLoading = (state: RootState): boolean => selectUserState(state).isLoading;

export const selectError = (state: RootState): string | null => selectUserState(state).error;

export const selectAccessToken = (state: RootState): string | null => selectUserState(state).token;
