import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mock the page's heavy / side-effectful dependencies -------------------
vi.mock('../../API/apiOperations', () => ({
  getUsers: vi.fn(),
  getMyCalendarEvents: vi.fn(),
  getCalendarShares: vi.fn(),
  inviteUserToEvent: vi.fn(),
  createCalendarShare: vi.fn(),
  updateProfile: vi.fn(),
  updateUser: vi.fn(),
}));

// Pass-through i18n: render the translation keys verbatim. The t/i18n
// references are created once and returned stably, so effects that depend on
// `t` (e.g. the contact-loading effect) do not re-run on every render.
vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  const i18n = { language: 'en' };
  return { useTranslation: () => ({ t, i18n }) };
});

vi.mock('../../services/authService', () => ({
  authenticationService: {
    getUser: () => ({ id: 'me', role: 'user' }),
    setUser: vi.fn(),
    getAccessToken: () => 'token',
  },
}));

vi.mock('../../utils/toastMaker/toastMaker', () => ({ default: vi.fn() }));

// Thin wrapper so the page body renders without the full navigation shell.
vi.mock('../../components/NavigationPageShell/NavigationPageShell', () => ({
  NavigationPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ContactsPage from './ContactsPage';
import {
  getCalendarShares,
  getMyCalendarEvents,
  getUsers,
  inviteUserToEvent,
} from '../../API/apiOperations';

const mockUsers = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com', jobTitle: 'Engineer' },
  { id: 'u2', name: 'Bob', email: 'bob@example.com', jobTitle: 'Designer' },
];

// Minimal store so the Modal's selectIsLoading selector resolves.
const makeStore = () =>
  configureStore({
    reducer: {
      user: (state: { isLoading: boolean } = { isLoading: false }) => state,
    },
  });

const renderPage = (initialEntry = '/contacts') =>
  render(
    <Provider store={makeStore()}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[initialEntry]}>
          <ContactsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  // Mock fetch to resolve an empty contacts array. Contact data actually flows
  // through the mocked apiOperations below; this is a defensive default so any
  // stray network call in the tree resolves predictably.
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        text: () => Promise.resolve('[]'),
      })
    )
  );
  (getMyCalendarEvents as Mock).mockResolvedValue([]);
  (getCalendarShares as Mock).mockResolvedValue({ sharedWithMe: [], sharedByMe: [] });
  (getUsers as Mock).mockResolvedValue([]);
  (inviteUserToEvent as Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ContactsPage', () => {
  it('renders without crashing (smoke test)', async () => {
    renderPage();
    // The directory label (i18n key passthrough) proves the page body rendered.
    expect(await screen.findByText('directory')).toBeTruthy();
  });

  it('renders the contact list when contacts are provided', async () => {
    (getUsers as Mock).mockResolvedValue(mockUsers);
    renderPage();
    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(await screen.findByText('Bob')).toBeTruthy();
  });

  it('disables the invite button while the invite request is in flight', async () => {
    // Keep the invite request pending so the in-flight state is observable.
    let resolveInvite: () => void = () => {};
    (inviteUserToEvent as Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInvite = () => resolve();
      })
    );
    // A single contact keeps the invite button unambiguous.
    (getUsers as Mock).mockResolvedValue([mockUsers[0]]);

    // An eventId in the URL satisfies the "open an event first" guard.
    renderPage('/contacts?eventId=evt-1');

    await screen.findByText('Alice');
    // Re-query each time: re-renders can replace the underlying DOM node, so a
    // held reference may go stale.
    const inviteButton = () => screen.getByText('invite') as HTMLButtonElement;
    expect(inviteButton().disabled).toBe(false);

    fireEvent.click(inviteButton());

    // Only the clicked contact's button is disabled while the request is pending.
    await waitFor(() => expect(inviteButton().disabled).toBe(true));

    // Let the request settle; the finally block re-enables the button.
    resolveInvite();
    await waitFor(() => expect(inviteButton().disabled).toBe(false));
  });
});
