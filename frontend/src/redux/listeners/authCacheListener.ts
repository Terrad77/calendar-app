import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { queryClient } from '../../lib/queryClient';
import { logOut, deleteAccount, fetchUser, type AuthErrorPayload } from '../user/operations';
import { clearCredentials } from '../user/userSlice';

// Drop the React Query cache whenever the auth session is torn down, regardless
// of which path triggered it: explicit logout, account deletion, an
// interceptor-detected invalid refresh token (clearCredentials), or a
// shouldLogout rejection from fetchUser. Centralised here because resetAuthState
// runs inside a reducer (no side effects allowed there) — reacting to the
// actions keeps reducers pure while covering every teardown path. Without this
// the per-user queries (e.g. ['calendarShares']) survive logout and either keep
// refetching or leak across accounts on a shared browser.
export const authCacheListener = createListenerMiddleware();

authCacheListener.startListening({
  matcher: isAnyOf(
    logOut.fulfilled,
    logOut.rejected,
    deleteAccount.fulfilled,
    clearCredentials,
    fetchUser.rejected
  ),
  effect: (action) => {
    // fetchUser.rejected only tears down auth when the failure is fatal
    // (shouldLogout, e.g. a forbidden/unverified account); a plain 401 does not.
    if (fetchUser.rejected.match(action)) {
      const payload = action.payload as AuthErrorPayload | undefined;
      if (!payload?.shouldLogout) return;
    }
    queryClient.clear();
  },
});
