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
  deleteCalendarShare: vi.fn(),
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

// authService is token-layer only now; the current user comes from Redux.
vi.mock('../../services/authService', () => ({
  authenticationService: {
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
  deleteCalendarShare,
} from '../../API/apiOperations';

const mockUsers = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com', jobTitle: 'Engineer' },
  { id: 'u2', name: 'Bob', email: 'bob@example.com', jobTitle: 'Designer' },
];

// Minimal store. selectUserId reads state.user.user?.id (used by ContactsPage
// for self-exclusion); selectIsLoading reads state.user.isLoading (Modal).
const makeStore = (currentUserId: string | null = null) =>
  configureStore({
    reducer: {
      user: (
        state: { isLoading: boolean; user: { id: string } | null } = {
          isLoading: false,
          user: currentUserId ? { id: currentUserId } : null,
        }
      ) => state,
    },
  });

const renderPage = (initialEntry = '/contacts', currentUserId: string | null = null) =>
  render(
    <Provider store={makeStore(currentUserId)}>
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

  describe('revoke calendar access', () => {
    const shareForAlice = {
      id: 'share-1',
      permission: 'read' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      sharedWithId: 'u1',
      sharedWithName: 'Alice',
    };

    it('does not render the revoke button when no share was granted to the contact', async () => {
      (getUsers as Mock).mockResolvedValue([mockUsers[0]]);
      (getCalendarShares as Mock).mockResolvedValue({ sharedWithMe: [], sharedByMe: [] });

      renderPage();
      await screen.findByText('Alice');
      expect(screen.queryByText('revokeAccess')).toBeNull();
    });

    it('renders the revoke button only for contacts the owner shared with', async () => {
      // Two contacts, but only Alice (u1) has a share granted to her.
      (getUsers as Mock).mockResolvedValue(mockUsers);
      (getCalendarShares as Mock).mockResolvedValue({
        sharedWithMe: [],
        sharedByMe: [shareForAlice],
      });

      renderPage();
      await screen.findByText('Alice');
      await waitFor(() => expect(screen.getAllByText('revokeAccess')).toHaveLength(1));
    });

    it('revokes with the correct shareId and removes the button on success', async () => {
      (getUsers as Mock).mockResolvedValue([mockUsers[0]]);
      (getCalendarShares as Mock).mockResolvedValue({
        sharedWithMe: [],
        sharedByMe: [shareForAlice],
      });
      (deleteCalendarShare as Mock).mockResolvedValue(undefined);
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true)
      );

      renderPage();
      const revokeButton = await screen.findByText('revokeAccess');

      fireEvent.click(revokeButton);

      await waitFor(() => expect(deleteCalendarShare as Mock).toHaveBeenCalledWith('share-1'));
      // State drops the record, so the button disappears without a reload.
      await waitFor(() => expect(screen.queryByText('revokeAccess')).toBeNull());
    });

    it('does not call the API when the confirmation is dismissed', async () => {
      (getUsers as Mock).mockResolvedValue([mockUsers[0]]);
      (getCalendarShares as Mock).mockResolvedValue({
        sharedWithMe: [],
        sharedByMe: [shareForAlice],
      });
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false)
      );

      renderPage();
      const revokeButton = await screen.findByText('revokeAccess');

      fireEvent.click(revokeButton);

      expect(deleteCalendarShare as Mock).not.toHaveBeenCalled();
      // Button stays because nothing was revoked.
      expect(screen.queryByText('revokeAccess')).not.toBeNull();
    });
  });

  describe('pagination', () => {
    const makeUsers = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `u${i + 1}`,
        name: `Person ${i + 1}`,
        email: `p${i + 1}@example.com`,
        jobTitle: 'Engineer',
      }));

    const nextButton = () => screen.getByText('pagination_next') as HTMLButtonElement;
    const prevButton = () => screen.getByText('pagination_previous') as HTMLButtonElement;

    it('does not render pagination controls when the list fits on one page', async () => {
      // PAGE_SIZE is 6, so exactly 6 contacts fit on a single page.
      (getUsers as Mock).mockResolvedValue(makeUsers(6));

      renderPage();
      await screen.findByText('Person 1');
      expect(screen.queryByText('pagination_next')).toBeNull();
    });

    it('paginates and navigates between pages with correct disabled states', async () => {
      // 8 contacts -> 2 pages (6 + 2).
      (getUsers as Mock).mockResolvedValue(makeUsers(8));

      renderPage();
      await screen.findByText('Person 1');

      // Page 1: first six visible, seventh not yet; Previous disabled.
      expect(screen.getByText('Person 6')).toBeTruthy();
      expect(screen.queryByText('Person 7')).toBeNull();
      expect(prevButton().disabled).toBe(true);
      expect(nextButton().disabled).toBe(false);

      fireEvent.click(nextButton());

      // Page 2: the tail two visible, first gone; Next now disabled.
      await screen.findByText('Person 7');
      expect(screen.queryByText('Person 1')).toBeNull();
      expect(nextButton().disabled).toBe(true);
      expect(prevButton().disabled).toBe(false);

      fireEvent.click(prevButton());
      await screen.findByText('Person 1');
    });

    it('resets to the first page when the search query changes', async () => {
      (getUsers as Mock).mockResolvedValue(makeUsers(8));

      renderPage();
      await screen.findByText('Person 1');

      fireEvent.click(nextButton());
      await screen.findByText('Person 7');

      // Changing the query resets to page 1 (still matches all 8 contacts).
      fireEvent.change(screen.getByPlaceholderText('search_contacts_or_teams'), {
        target: { value: 'Person' },
      });

      await screen.findByText('Person 1');
      expect(screen.queryByText('Person 7')).toBeNull();
    });
  });

  describe('self-exclusion', () => {
    it('excludes the current user sourced from Redux (not authService) on every page', async () => {
      const users = Array.from({ length: 8 }, (_, i) => ({
        id: `u${i + 1}`,
        name: `Person ${i + 1}`,
        email: `p${i + 1}@example.com`,
        jobTitle: 'Engineer',
      }));
      (getUsers as Mock).mockResolvedValue(users);

      // The current user id ('u3') is provided only via the Redux store, so the
      // test passes only if ContactsPage reads it from Redux: Person 3 excluded.
      renderPage('/contacts', 'u3');
      await screen.findByText('Person 1');

      // Self (Person 3) absent; neighbours present.
      expect(screen.queryByText('Person 3')).toBeNull();
      expect(screen.getByText('Person 2')).toBeTruthy();
      expect(screen.getByText('Person 4')).toBeTruthy();

      // 7 remaining contacts -> page 2 holds the tail; self still absent.
      fireEvent.click(screen.getByText('pagination_next'));
      await screen.findByText('Person 8');
      expect(screen.queryByText('Person 3')).toBeNull();
    });
  });
});
