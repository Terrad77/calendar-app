import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import DotLoader from '../../components/DotLoader/DotLoader';
import toastMaker from '../../utils/toastMaker/toastMaker';
import {
  getNotifications,
  markNotificationRead,
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
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null); // notification id being responded to
  const hasMarkedRead = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getNotifications();
        if (!mounted) return;
        setNotifications(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Mark all unread notifications as read on page open (best-effort, fire-and-forget)
  useEffect(() => {
    if (hasMarkedRead.current || notifications.length === 0) return;
    hasMarkedRead.current = true;

    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    unread.forEach((n) => markNotificationRead(n.id).catch(console.error));
  }, [notifications]);

  const handleRespond = async (
    notificationId: string,
    invitationId: string,
    status: 'accepted' | 'declined'
  ) => {
    setResponding(notificationId);
    try {
      await respondToInvitation(invitationId, status);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toastMaker(status === 'accepted' ? 'Invitation accepted' : 'Invitation declined');
    } catch (err) {
      toastMaker(err instanceof Error ? err.message : 'Failed to respond', 'error');
    } finally {
      setResponding(null);
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

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={hideRead}
            onChange={(event) => setHideRead(event.target.checked)}
          />
          <span>{t('hide_read_items')}</span>
        </label>
      </section>

      <div className={styles.notificationList}>
        {loading ? (
          <div className="flex w-full items-center justify-center py-10">
            <DotLoader text={t('common:loading')} />
          </div>
        ) : error ? (
          <p className={styles.stateMessage}>{error}</p>
        ) : visible.length === 0 ? (
          <p className={styles.stateMessage}>
            {hideRead ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        ) : (
          visible.map((notification) => (
            <article key={notification.id} className={styles.notificationCard}>
              <div className={styles.notificationDot} data-unread={String(!notification.isRead)} />
              <div className={styles.notificationBody}>
                <div className={styles.notificationHeader}>
                  <h3 className={styles.notificationTitle}>{notification.title}</h3>
                  <span className={styles.group}>{notification.type}</span>
                </div>
                <p className={styles.notificationDetail}>{notification.message}</p>
                <p className={styles.notificationTime}>{dayjs(notification.createdAt).fromNow()}</p>

                {notification.type === 'INVITATION' && notification.referenceId && (
                  <div className={styles.notifActions}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      disabled={responding === notification.id}
                      onClick={() =>
                        handleRespond(notification.id, notification.referenceId!, 'accepted')
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={styles.declineBtn}
                      disabled={responding === notification.id}
                      onClick={() =>
                        handleRespond(notification.id, notification.referenceId!, 'declined')
                      }
                    >
                      Decline
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
