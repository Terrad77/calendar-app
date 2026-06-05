import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { NavigationPageShell } from '../../components/NavigationPageShell/NavigationPageShell';
import { saveSettings } from '../../API/apiOperations';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { selectUser } from '../../redux/user/selectors';
import styles from './SettingsPage.module.css';

const timeZones = ['Europe/Kyiv', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];

export default function SettingsPage() {
  const { t } = useTranslation('navigation');
  const user = useSelector(selectUser);

  const [startOfWeek, setStartOfWeek] = useState('Monday');
  const [timeZone, setTimeZone] = useState('Europe/Kyiv');
  const [workingHours, setWorkingHours] = useState('08:30 - 18:00');
  const [compactDensity, setCompactDensity] = useState(false);
  const [emailDigest, setEmailDigest] = useState(true);
  const [saving, setSaving] = useState(false);

  const startDays = [t('monday'), t('sunday')];

  // Initialise from persisted user data when it loads
  useEffect(() => {
    if (!user) return;
    if (user.startOfWeek) setStartOfWeek(user.startOfWeek);
    if (user.timeZone) setTimeZone(user.timeZone);
    if (user.workingHours) setWorkingHours(user.workingHours);
    if (user.compactDensity !== undefined) setCompactDensity(user.compactDensity);
    if (user.emailDigest !== undefined) setEmailDigest(user.emailDigest);
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveSettings({ startOfWeek, timeZone, workingHours, compactDensity, emailDigest });
      toastMaker('Settings saved');
    } catch (err) {
      toastMaker(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <NavigationPageShell
      badge={t('settings')}
      title={t('settings_title')}
      description={t('settings_description')}
      stats={[
        { label: t('profile_status'), value: t('ready'), detail: t('profile_status_detail') },
        { label: t('theme'), value: t('soft_light'), detail: t('theme_detail') },
        { label: t('security'), value: t('protected'), detail: t('security_detail') },
      ]}
      panels={[
        {
          title: t('appearance'),
          items: [t('appearance_item_1'), t('appearance_item_2'), t('appearance_item_3')],
        },
        {
          title: t('preferences'),
          items: [t('preferences_item_1'), t('preferences_item_2'), t('preferences_item_3')],
        },
      ]}
    >
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formHeader}>
          <div>
            <p className={styles.sectionLabel}>{t('preferences')}</p>
            <h2 className={styles.sectionTitle}>{t('workspace_defaults')}</h2>
          </div>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Saving…' : t('save_changes')}
          </button>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>{t('start_of_week')}</span>
            <select value={startOfWeek} onChange={(e) => setStartOfWeek(e.target.value)}>
              {startDays.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>{t('time_zone')}</span>
            <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>{t('working_hours')}</span>
            <input
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>{t('language')}</span>
            <input type="text" readOnly defaultValue={t('language_value')} />
          </label>
        </div>

        <div className={styles.switchGrid}>
          <label className={styles.switchCard}>
            <input
              type="checkbox"
              checked={compactDensity}
              onChange={(e) => setCompactDensity(e.target.checked)}
            />
            <div>
              <strong>{t('compact_density')}</strong>
              <p>{t('compact_density_detail')}</p>
            </div>
          </label>

          <label className={styles.switchCard}>
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
            />
            <div>
              <strong>{t('email_digest')}</strong>
              <p>{t('email_digest_detail')}</p>
            </div>
          </label>
        </div>
      </form>
    </NavigationPageShell>
  );
}
