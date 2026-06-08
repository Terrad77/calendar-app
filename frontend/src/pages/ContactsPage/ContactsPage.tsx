import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getMyCalendarEvents,
  getUsers,
  inviteUserToEvent,
  getCalendarShares,
  createCalendarShare,
  type ShareWithMe,
} from '../../API/apiOperations';
import { useTranslation } from 'react-i18next';
import { getInitials } from '../../utils/getInitials';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const relativeTimeOrFallback = (date: unknown): string => {
  if (!date) return 'Recently active';
  const d = dayjs(date as string | number | Date);
  return d.isValid() ? d.fromNow() : 'Recently active';
};

// Format an ISO date (yyyy-mm-dd) as dd.mm.yyyy for the event picker.
const formatEventDate = (isoDate: string): string => {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
import Modal from '../../components/Modal/Modal';
import DotLoader from '../../components/DotLoader/DotLoader';
import { updateProfile, updateUser } from '../../API/apiOperations';
import { authenticationService, User } from '../../services/authService';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './ContactsPage.module.css';
import toastMaker from '../../utils/toastMaker/toastMaker';

type ContactItem = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  time?: string;
  accent?: string;
  raw?: Record<string, unknown>;
};

type InviteEventOption = {
  id: string;
  title: string;
  startDate: string;
  startTime?: string;
};

export default function ContactsPage() {
  const { t } = useTranslation('navigation');
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentEventId = searchParams.get('eventId');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [inviteEvents, setInviteEvents] = useState<InviteEventOption[]>([]);
  const [loadingInviteEvents, setLoadingInviteEvents] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingContacts(true);
      setContactsError(null);
      try {
        const res = await getUsers();

        if (!mounted) return;

        if (Array.isArray(res)) {
          setContacts(
            res.map((u, index) => ({
              id: String(u.id ?? u._id ?? u.userId ?? u.email ?? u.name ?? `contact-${index}`),
              name: u.name ?? u.fullName ?? u.displayName ?? 'Unknown',
              email: u.email,
              // Prefer the user's jobTitle (now returned by /api/users) over the
              // generic "Collaborator" fallback.
              role: u.jobTitle ?? u.role ?? 'Collaborator',
              status: u.status ?? t('available'),
              time: u.time ?? relativeTimeOrFallback(u.updatedAt),
              accent: getInitials(u.name, u.email),
              raw: u,
            }))
          );
        } else if (res && typeof res === 'object' && 'message' in res) {
          // API returned an error-like object
          setContactsError(res.message || 'Failed to load contacts');
        } else {
          // fallback: show the built-in sample contacts translated
          setContacts([
            {
              id: 'olena',
              name: 'Olena Petrova',
              role: t('product_owner'),
              status: t('available'),
              time: t('today_time_0930'),
              accent: 'OP',
            },
            {
              id: 'mark',
              name: 'Mark Rivera',
              role: t('engineering'),
              status: t('in_meeting'),
              time: t('today_time_1300'),
              accent: 'MR',
            },
          ]);
        }
      } catch (err: unknown) {
        console.error('Failed to load users:', err);
        try {
          const sentry = await import(/* @vite-ignore */ '@' + 'sentry/react');
          try {
            type SentryScopeLike = {
              setUser?: (u: Record<string, unknown> | null) => void;
              setTag?: (k: string, v: string) => void;
              setExtra?: (k: string, v: unknown) => void;
            };
            const S = sentry as unknown as {
              withScope?: (cb: (scope: SentryScopeLike) => void) => void;
              captureException?: (e: unknown) => void;
            };
            const cu =
              authenticationService.getUser && (authenticationService.getUser() as User | null);
            if (S.withScope) {
              S.withScope((scope) => {
                if (cu && cu.id && scope.setUser) scope.setUser({ id: cu.id });
                if (scope.setTag) scope.setTag('component', 'ContactsPage');
                if (S.captureException) S.captureException(err);
              });
            } else {
              if (S.captureException) S.captureException(err);
            }
          } catch (_e) {
            // ignore
          }
        } catch (_e) {
          // Sentry not available; ignore
        }
        if (!mounted) return;
        setContactsError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        if (mounted) setLoadingContacts(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    let mounted = true;

    const loadInviteEvents = async () => {
      setLoadingInviteEvents(true);

      try {
        const events = await getMyCalendarEvents();

        if (!mounted) return;

        const options = events.map((event) => ({
          id: event.id,
          title: event.title,
          startDate: event.date,
          startTime: 'startTime' in event ? event.startTime : undefined,
        }));

        setInviteEvents(options);

        if (!currentEventId) {
          setSelectedEventId((current) => current || options[0]?.id || '');
        }
      } catch (error) {
        if (!mounted) return;

        setInviteEvents([]);
        console.error('Failed to load invite events:', error);
      } finally {
        if (mounted) setLoadingInviteEvents(false);
      }
    };

    void loadInviteEvents();

    return () => {
      mounted = false;
    };
  }, [currentEventId]);

  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.role} ${contact.status}`.toLowerCase().includes(query.toLowerCase())
  );

  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Calendar sharing state
  const [sharesWithMe, setSharesWithMe] = useState<ShareWithMe[]>([]);
  const [shareModalContact, setShareModalContact] = useState<ContactItem | null>(null);
  const [sharePermission, setSharePermission] = useState<'read' | 'write'>('read');
  const [shareSaving, setShareSaving] = useState(false);

  useEffect(() => {
    getCalendarShares()
      .then(({ sharedWithMe }) => setSharesWithMe(sharedWithMe))
      .catch(() => {});
  }, []);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['contactStats'],
    queryFn: () =>
      Promise.all([getUsers(), getCalendarShares()]).then(([users, shares]) => ({
        users: Array.isArray(users) ? (users as Record<string, unknown>[]) : [],
        shares,
      })),
    staleTime: 30_000,
  });

  const handleViewCalendar = (contact: ContactItem) => {
    const hasAccess = sharesWithMe.some((s) => s.ownerId === contact.id);
    if (hasAccess) {
      navigate(`/calendar?contact=${encodeURIComponent(contact.id)}`);
    } else {
      setShareModalContact(contact);
      setSharePermission('read');
    }
  };

  const handleShareSubmit = async () => {
    if (!shareModalContact) return;
    setShareSaving(true);
    try {
      await createCalendarShare(shareModalContact.id, sharePermission);
      toastMaker(
        `Calendar share request sent to ${shareModalContact.name ?? shareModalContact.id}`
      );
      // Refresh shares so next click navigates directly
      const { sharedWithMe } = await getCalendarShares();
      setSharesWithMe(sharedWithMe);
      setShareModalContact(null);
    } catch (err) {
      toastMaker(err instanceof Error ? err.message : 'Failed to share calendar', 'error');
    } finally {
      setShareSaving(false);
    }
  };

  const currentUser = authenticationService.getUser && authenticationService.getUser();

  const canEdit = (contact: ContactItem) => {
    if (!currentUser) return false;
    const cu = currentUser as unknown as { id?: string; role?: string };
    if (contact.id === cu.id) return true;
    // allow admins? assuming role on current user
    return cu.role === 'admin';
  };

  const openEdit = (contact: ContactItem) => {
    if (!canEdit(contact)) return;
    setEditingContact(contact);
    setEditName(contact.name || '');
    setEditEmail((contact.email as string) || '');
    setEditRole(contact.role || '');
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editingContact) return;
    setEditSaving(true);
    setEditError(null);
    try {
      // If editing own profile, call profile endpoint
      if ((currentUser as unknown as { id?: string }).id === editingContact.id) {
        const res = await updateProfile({ name: editName });
        const updatedUser = res?.user ?? null;
        if (updatedUser) {
          // update authService user in memory/storage
          try {
            authenticationService.setUser(updatedUser);
          } catch (_e) {
            // ignore
          }
        }
        // update contacts list locally
        setContacts((prev) =>
          prev.map((c) =>
            c.id === editingContact.id
              ? {
                  ...c,
                  name: editName,
                  email: editEmail,
                  role: editRole,
                  raw: { ...(c.raw || {}), name: editName, email: editEmail, role: editRole },
                }
              : c
          )
        );
        setEditingContact(null);
      } else {
        // admin editing another contact - attempt backend users update if available
        try {
          const res = await updateUser(editingContact.id, {
            name: editName,
            email: editEmail,
            role: editRole,
          });
          const updated = res?.result || null;
          // optimistic local update
          setContacts((prev) =>
            prev.map((c) =>
              c.id === editingContact.id
                ? {
                    ...c,
                    name: editName,
                    email: editEmail,
                    role: editRole,
                    raw: { ...(c.raw || {}), ...(updated || {}) },
                  }
                : c
            )
          );
          setEditingContact(null);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setEditError(msg || 'Failed to save');
          try {
            const sentry = await import(/* @vite-ignore */ '@' + 'sentry/react');
            try {
              type SentryScopeLike = {
                setUser?: (u: Record<string, unknown> | null) => void;
                setTag?: (k: string, v: string) => void;
                setExtra?: (k: string, v: unknown) => void;
              };
              const S = sentry as unknown as {
                withScope?: (cb: (scope: SentryScopeLike) => void) => void;
                captureException?: (e: unknown) => void;
              };
              const cu =
                authenticationService.getUser && (authenticationService.getUser() as User | null);
              if (S.withScope) {
                S.withScope((scope) => {
                  if (cu && cu.id && scope.setUser) scope.setUser({ id: cu.id });
                  if (editingContact && editingContact.id && scope.setTag)
                    scope.setTag('contactId', editingContact.id);
                  if (scope.setTag) scope.setTag('component', 'ContactsPage');
                  if (S.captureException) S.captureException(err);
                });
              } else {
                if (S.captureException) S.captureException(err);
              }
            } catch (_e) {
              // ignore
            }
          } catch (_e) {
            // ignore
          }
          // backend may not support this endpoint; still update locally for admin preview
          setContacts((prev) =>
            prev.map((c) =>
              c.id === editingContact.id
                ? {
                    ...c,
                    name: editName,
                    email: editEmail,
                    role: editRole,
                    raw: { ...(c.raw || {}), name: editName, email: editEmail, role: editRole },
                  }
                : c
            )
          );
          setEditingContact(null);
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      setEditError(e.message || 'Failed to save');
      try {
        const sentry = await import(/* @vite-ignore */ '@' + 'sentry/react');
        try {
          type SentryScopeLike = {
            setUser?: (u: Record<string, unknown> | null) => void;
            setTag?: (k: string, v: string) => void;
            setExtra?: (k: string, v: unknown) => void;
          };
          const S = sentry as unknown as {
            withScope?: (cb: (scope: SentryScopeLike) => void) => void;
            captureException?: (e: unknown) => void;
          };
          const cu =
            authenticationService.getUser && (authenticationService.getUser() as User | null);
          if (S.withScope) {
            S.withScope((scope) => {
              if (cu && cu.id && scope.setUser) scope.setUser({ id: cu.id });
              if (editingContact && editingContact.id && scope.setTag)
                scope.setTag('contactId', editingContact.id);
              if (scope.setTag) scope.setTag('component', 'ContactsPage');
              if (S.captureException) S.captureException(err);
            });
          } else {
            if (S.captureException) S.captureException(err);
          }
        } catch (_e) {
          // ignore
        }
      } catch (_e) {
        // ignore
      }
    } finally {
      setEditSaving(false);
    }
  };

  const inviteEventId = currentEventId || selectedEventId;
  const selectedInviteEvent = inviteEvents.find((event) => event.id === inviteEventId) ?? null;

  const currentUserId = currentUser ? (currentUser as unknown as { id?: string }).id : null;
  const collaboratorCount = statsData
    ? statsData.users.filter((u) => String(u.id ?? u._id ?? u.userId ?? '') !== currentUserId)
        .length
    : 0;
  const sharedByMeCount = statsData?.shares.sharedByMe.length ?? 0;
  const statPlaceholder = statsLoading ? '—' : undefined;

  return (
    <NavigationPageShell
      badge={t('contacts')}
      title={t('contacts_title')}
      description={t('contacts_description')}
      stats={[
        {
          label: t('collaborators'),
          value: statPlaceholder ?? String(collaboratorCount),
          detail: t('collaborators_detail'),
        },
        {
          label: t('shared_spaces'),
          value: statPlaceholder ?? String(sharedByMeCount),
          detail: t('shared_spaces_detail'),
        },
      ]}
      panels={[
        {
          title: t('recent_people'),
          items: [t('recent_people_item_1'), t('recent_people_item_2'), t('recent_people_item_3')],
        },
        {
          title: t('relationship_shortcuts'),
          items: [
            t('relationship_shortcuts_item_1'),
            t('relationship_shortcuts_item_2'),
            t('relationship_shortcuts_item_3'),
          ],
        },
      ]}
    >
      <section className={styles.searchCard}>
        <div>
          <p className={styles.sectionLabel}>{t('directory')}</p>
          <h2 className={styles.sectionTitle}>{t('search_people_workspaces')}</h2>
        </div>

        <input
          className={styles.searchInput}
          type="search"
          placeholder={t('search_contacts_or_teams')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <label className={styles.eventPicker}>
          <span className={styles.eventPickerLabel}>{t('event_for_invitation')}</span>
          <select
            className={styles.eventSelect}
            value={inviteEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            disabled={loadingInviteEvents || !!currentEventId}
          >
            <option value="">
              {loadingInviteEvents ? t('loading_events') : t('select_event')}
            </option>
            {inviteEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {formatEventDate(event.startDate)}
                {event.startTime ? ` ${event.startTime}` : ''}
              </option>
            ))}
          </select>
          <span className={styles.eventPickerHint}>
            {currentEventId
              ? t('using_calendar_event')
              : selectedInviteEvent
                ? t('invitations_will_be_sent', { name: selectedInviteEvent.title })
                : t('choose_event_hint')}
          </span>
        </label>
      </section>

      <div className={styles.contactsGrid}>
        {loadingContacts ? (
          <div className="flex w-full items-center justify-center py-10">
            <DotLoader text={t('common:loading')} />
          </div>
        ) : contactsError ? (
          <div className={styles.error}>Помилка: {contactsError}</div>
        ) : (
          filteredContacts.map((contact) => (
            <article
              key={
                contact.id ||
                contact.email ||
                contact.name ||
                contact.time ||
                contact.accent ||
                'contact'
              }
              className={styles.contactCard}
              onClick={() => openEdit(contact)}
            >
              <div className={styles.contactAvatar}>{contact.accent}</div>
              <div className={styles.contactBody}>
                <div className={styles.contactHeader}>
                  <div>
                    <h3 className={styles.contactName}>{contact.name}</h3>
                    <p className={styles.contactRole}>{contact.role}</p>
                  </div>
                  <span className={styles.status}>{contact.status}</span>
                </div>

                <p className={styles.contactTime}>{contact.time}</p>

                <div className={styles.contactActions}>
                  <button
                    type="button"
                    className={styles.contactButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewCalendar(contact);
                    }}
                    aria-label={t('view_calendar')}
                  >
                    {t('view_calendar')}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!inviteEventId) {
                        toastMaker('Open an event first, then invite a contact.', 'error');
                        return;
                      }

                      if (!contact.email) {
                        toastMaker('Contact email is missing.', 'error');
                        return;
                      }

                      try {
                        await inviteUserToEvent(inviteEventId, contact.email);
                        toastMaker(t('invitation_sent'));
                      } catch (err) {
                        const message =
                          err instanceof Error ? err.message : 'Failed to send invite';
                        toastMaker(message, 'error');
                      }
                    }}
                  >
                    {t('invite')}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        title={t('edit_contact')}
        showCloseButton
      >
        {editingContact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>{t('name')}</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
            />

            {editError && <div style={{ color: 'var(--danger, #f43f5e)' }}>{editError}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                className="modal-button"
                onClick={() => setEditingContact(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="modal-button"
                onClick={saveEdit}
                disabled={editSaving}
              >
                {editSaving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Calendar share request modal */}
      <Modal
        isOpen={!!shareModalContact}
        onClose={() => setShareModalContact(null)}
        title="Share your calendar"
        showCloseButton
      >
        {shareModalContact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              {sharesWithMe.some((s) => s.ownerId === shareModalContact.id)
                ? `${shareModalContact.name ?? shareModalContact.id} has already shared their calendar with you.`
                : `${shareModalContact.name ?? shareModalContact.id} has not shared their calendar with you yet. You can share your own calendar with them below.`}
            </p>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}
            >
              Permission level
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'read' | 'write')}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                <option value="read">View only</option>
                <option value="write">View &amp; Edit</option>
              </select>
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                className="modal-button"
                onClick={() => setShareModalContact(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-button"
                onClick={() => void handleShareSubmit()}
                disabled={shareSaving}
              >
                {shareSaving ? 'Sharing…' : 'Share my calendar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </NavigationPageShell>
  );
}
