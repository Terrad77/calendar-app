import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import DotLoader from '../../components/DotLoader/DotLoader';
import toastMaker from '../../utils/toastMaker/toastMaker';
import {
  getNotifications,
  markNotificationRead,
  deleteNotification,
  respondToInvitation,
  type NotificationApiItem,
} from '../../API/apiOperations';
import styles from './NotificationsPage.module.css';

dayjs.extend(relativeTime);

export default function NotificationsPage() {
  const { t } = useTranslation('navigation');
  const [hideRead, setHideRead] = useState(false);
  const [notifications, setNotifications] = useState<NotificationApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState<string | null>(null); // notification id being responded to
  const [deleting, setDeleting] = useState<string | null>(null); // notification id being deleted

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getNotifications();
        if (!mounted) return;
        setNotifications(data);
      } catch (err) {
        if (!mounted) return;
        // Never surface raw fetch/auth error text in the UI; fall back to the
        // empty state and log the error for debugging.
        console.error('Failed to load notifications', err);
        setNotifications([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Mark a single notification read on card click (no-op if already read).
  const handleMarkRead = (notification: NotificationApiItem) => {
    if (notification.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    markNotificationRead(notification.id).catch(console.error);
  };

  // Mark every unread notification read at once (toolbar action).
  const handleMarkAllRead = () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    void Promise.all(unread.map((n) => markNotificationRead(n.id).catch(console.error)));
  };

  const handleRespond = async (
    notificationId: string,
    invitationId: string,
    status: 'accepted' | 'declined'
  ) => {
    setResponding(notificationId);
    try {
      await respondToInvitation(invitationId, status);
      // Remove the backing notification so the invitation never returns on reload.
      // The invitation is already handled, so a delete failure must not block the
      // success toast — just log it.
      try {
        await deleteNotification(notificationId);
      } catch (deleteErr) {
        console.error('Failed to delete notification after responding to invitation', deleteErr);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toastMaker(status === 'accepted' ? t('invitation_accepted') : t('invitation_declined'));
    } catch (err) {
      toastMaker(err instanceof Error ? err.message : t('failed_to_respond'), 'error');
    } finally {
      setResponding(null);
    }
  };

  // Delete works for any notification type (INVITATION, REMINDER, SYSTEM).
  // Optimistically remove the card and restore it if the request fails.
  const handleDelete = async (notificationId: string) => {
    setDeleting(notificationId);
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    try {
      await deleteNotification(notificationId);
      toastMaker(t('notification_deleted'));
    } catch (err) {
      setNotifications(previous);
      toastMaker(err instanceof Error ? err.message : t('failed_to_delete_notification'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const invitationCount = notifications.filter((n) => n.type === 'INVITATION').length;
  const reminderCount = notifications.filter((n) => n.type === 'REMINDER').length;

  const visible = notifications.filter((n) => (hideRead ? !n.isRead : true));

  return (
    <NavigationPageShell
      badge={t('notifications')}
      title={t('notifications_title')}
      description={t('notifications_description')}
      stats={[
        { label: t('unread'), value: String(unreadCount), detail: t('unread_detail') },
        { label: t('reminders'), value: String(reminderCount), detail: t('reminders_detail') },
        {
          label: t('digest_items'),
          value: String(invitationCount),
          detail: t('digest_items_detail'),
        },
      ]}
      panels={[
        {
          title: t('priority_alerts'),
          items: [
            t('priority_alerts_item_1'),
            t('priority_alerts_item_2'),
            t('priority_alerts_item_3'),
          ],
        },
        {
          title: t('quiet_by_design'),
          items: [
            t('quiet_by_design_item_1'),
            t('quiet_by_design_item_2'),
            t('quiet_by_design_item_3'),
          ],
        },
      ]}
    >
      <section className={styles.toolbarCard}>
        <div>
          <p className={styles.sectionLabel}>{t('notification_center')}</p>
          <h2 className={styles.sectionTitle}>{t('priority_inbox')}</h2>
        </div>

        <div className={styles.toolbarActions}>
          {unreadCount > 0 && (
            <button type="button" className={styles.markAllBtn} onClick={handleMarkAllRead}>
              {t('mark_all_read')}
            </button>
          )}

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={hideRead}
              onChange={(event) => setHideRead(event.target.checked)}
            />
            <span>{t('hide_read_items')}</span>
          </label>
        </div>
      </section>

      <div className={styles.notificationList}>
        {loading ? (
          <div className="flex w-full items-center justify-center py-10">
            <DotLoader text={t('common:loading')} />
          </div>
        ) : visible.length === 0 ? (
          <p className={styles.stateMessage}>
            {hideRead ? t('no_unread_notifications') : t('noNotificationsYet')}
          </p>
        ) : (
          visible.map((notification) => (
            <article
              key={notification.id}
              className={styles.notificationCard}
              data-unread={String(!notification.isRead)}
              onClick={() => handleMarkRead(notification)}
            >
              <div className={styles.notificationDot} data-unread={String(!notification.isRead)} />
              <div className={styles.notificationBody}>
                <div className={styles.notificationHeader}>
                  <h3 className={styles.notificationTitle}>{notification.title}</h3>
                  <div className={styles.headerMeta}>
                    <span className={styles.group}>{notification.type}</span>
                    {/* Delete is available for every type, including SYSTEM. */}
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      aria-label={t('delete_notification')}
                      title={t('delete_notification')}
                      disabled={deleting === notification.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(notification.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className={styles.notificationDetail}>{notification.message}</p>
                <p className={styles.notificationTime}>{dayjs(notification.createdAt).fromNow()}</p>

                {notification.type === 'INVITATION' && notification.referenceId && (
                  <div className={styles.notifActions}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      disabled={responding === notification.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRespond(notification.id, notification.referenceId!, 'accepted');
                      }}
                    >
                      {t('accept')}
                    </button>
                    <button
                      type="button"
                      className={styles.declineBtn}
                      disabled={responding === notification.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRespond(notification.id, notification.referenceId!, 'declined');
                      }}
                    >
                      {t('decline')}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </NavigationPageShell>
  );
}
