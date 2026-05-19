import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const { t } = useTranslation('navigation');
  const [hideRead, setHideRead] = useState(false);

  const notifications = [
    {
      id: 1,
      title: t('team_planning_moved'),
      detail: t('tomorrow_time_1430'),
      group: t('urgent'),
      unread: true,
    },
    {
      id: 2,
      title: t('invite_awaiting_response'),
      detail: t('shared_workspace'),
      group: t('attention'),
      unread: true,
    },
    {
      id: 3,
      title: t('reminder_due_soon'),
      detail: t('in_25_minutes'),
      group: t('reminder'),
      unread: false,
    },
    {
      id: 4,
      title: t('digest_is_ready'),
      detail: t('six_updates_compiled'),
      group: t('digest'),
      unread: false,
    },
  ];

  const visibleNotifications = notifications.filter((item) => (hideRead ? item.unread : true));

  return (
    <NavigationPageShell
      badge={t('notifications')}
      title={t('notifications_title')}
      description={t('notifications_description')}
      stats={[
        { label: t('unread'), value: '3', detail: t('unread_detail') },
        { label: t('reminders'), value: '2', detail: t('reminders_detail') },
        {
          label: t('digest_items'),
          value: '11',
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
        {visibleNotifications.map((notification) => (
          <article key={notification.id} className={styles.notificationCard}>
            <div className={styles.notificationDot} data-unread={notification.unread} />
            <div className={styles.notificationBody}>
              <div className={styles.notificationHeader}>
                <h3 className={styles.notificationTitle}>{notification.title}</h3>
                <span className={styles.group}>{notification.group}</span>
              </div>
              <p className={styles.notificationDetail}>{notification.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </NavigationPageShell>
  );
}
