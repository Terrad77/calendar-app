import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import styles from './ContactsPage.module.css';

export default function ContactsPage() {
  const { t } = useTranslation('navigation');
  const [query, setQuery] = useState('');

  const contacts = [
    {
      name: 'Olena Petrova',
      role: t('product_owner'),
      status: t('available'),
      time: t('today_time_0930'),
      accent: 'OP',
    },
    {
      name: 'Mark Rivera',
      role: t('engineering'),
      status: t('in_meeting'),
      time: t('today_time_1300'),
      accent: 'MR',
    },
    {
      name: t('design_team'),
      role: t('shared_workspace'),
      status: t('shared_calendar'),
      time: t('updated_2h_ago'),
      accent: 'DT',
    },
    {
      name: 'Alya Bondar',
      role: t('operations'),
      status: t('available'),
      time: t('tomorrow_time_1000'),
      accent: 'AB',
    },
  ];

  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.role} ${contact.status}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <NavigationPageShell
      badge={t('contacts')}
      title={t('contacts_title')}
      description={t('contacts_description')}
      stats={[
        {
          label: t('collaborators'),
          value: '18',
          detail: t('collaborators_detail'),
        },
        {
          label: t('favorites'),
          value: '6',
          detail: t('favorites_detail'),
        },
        {
          label: t('shared_spaces'),
          value: '4',
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
      </section>

      <div className={styles.contactsGrid}>
        {filteredContacts.map((contact) => (
          <article key={contact.name} className={styles.contactCard}>
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
                <button type="button" className={styles.contactButton}>
                  {t('view_calendar')}
                </button>
                <button type="button" className={styles.secondaryButton}>
                  {t('invite')}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </NavigationPageShell>
  );
}
