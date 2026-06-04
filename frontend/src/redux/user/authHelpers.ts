import type { UserState } from './user.types';

export const resetAuthState = (state: UserState) => {
  state.user = null;
  state.token = null;
  state.refreshToken = null;
  state.isLoggedIn = false;
  state.isRefreshing = false;
  state.isLoading = false;
  state.error = null;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('language');
  localStorage.removeItem('preferredCountry');
};
