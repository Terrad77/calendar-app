import { beforeEach, describe, expect, it, vi } from 'vitest';

// The user slice (and the auth service it transitively imports) read
// localStorage at module-load time. Provide a minimal in-memory localStorage
// before any imports run so the suite works in the Node test environment.
vi.hoisted(() => {
  // jsdom already provides localStorage; only polyfill when it's missing (Node).
  if (typeof globalThis.localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage =
    localStorageMock;
});

import reducer, { clearCredentials } from './userSlice';
import { logIn } from './operations';
import { selectIsLoggedIn } from './selectors';
import type { UserState } from './user.types';

const getInitialState = (): UserState => reducer(undefined, { type: '@@INIT' });

describe('userSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has the expected initial state shape', () => {
    const state = getInitialState();
    expect(state).toMatchObject({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
    });
    // Tokens are read from localStorage, which is empty in this test.
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('sets the user on a successful login (logIn.fulfilled)', () => {
    // The app populates the user via the login thunk rather than a setUser action.
    const payload = {
      user: { id: 'u1', name: 'Alice', email: 'alice@example.com' },
      token: 'access-token',
      refreshToken: 'refresh-token',
    };
    const state = reducer(
      getInitialState(),
      logIn.fulfilled(payload as never, 'req-id', undefined as never)
    );
    expect(state.user).toEqual(payload.user);
    expect(state.token).toBe('access-token');
    expect(state.isLoggedIn).toBe(true);
  });

  it('clears credentials back to a logged-out state (clearCredentials)', () => {
    const loggedIn: UserState = {
      ...getInitialState(),
      user: { id: 'u1', name: 'Alice', email: 'alice@example.com' } as never,
      token: 'access-token',
      refreshToken: 'refresh-token',
      isLoggedIn: true,
    };
    const state = reducer(loggedIn, clearCredentials());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('derives authentication via selectIsLoggedIn', () => {
    expect(selectIsLoggedIn({ user: { isLoggedIn: true } } as never)).toBe(true);
    expect(selectIsLoggedIn({ user: { isLoggedIn: false } } as never)).toBe(false);
  });
});
