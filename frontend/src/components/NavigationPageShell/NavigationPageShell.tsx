import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from '../Logo/Logo';
import styles from './NavigationPageShell.module.css';

export interface NavigationStat {
  label: string;
  value: string;
  detail?: string;
}

export interface NavigationPanel {
  title: string;
  items: string[];
}

interface NavigationPageShellProps {
  badge: string;
  title: string;
  description: string;
  stats: NavigationStat[];
  panels: NavigationPanel[];
  children?: ReactNode;
}

export const NavigationPageShell = ({
  badge,
  title,
  description,
  stats,
  panels,
  children,
}: NavigationPageShellProps) => {
  const { t } = useTranslation('navigation');

  return (
    <div className={styles.page}>
      <div className={styles.glowPrimary} />
      <div className={styles.glowSecondary} />

      <section className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.brandRow}>
            <Logo />
            <span className={styles.badge}>{badge}</span>
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{t('workspace_shell')}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>
        </header>

        <section className={styles.stats} aria-label={t('stats_for')}>
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <span className={styles.statLabel}>{stat.label}</span>
              <strong className={styles.statValue}>{stat.value}</strong>
              {stat.detail && <p className={styles.statDetail}>{stat.detail}</p>}
            </article>
          ))}
        </section>

        <section className={styles.panels}>
          {panels.map((panel) => (
            <article key={panel.title} className={styles.panelCard}>
              <h2 className={styles.panelTitle}>{panel.title}</h2>
              <ul className={styles.panelList}>
                {panel.items.map((item) => (
                  <li key={item} className={styles.panelItem}>
                    <span className={styles.panelBullet} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {children && <section className={styles.children}>{children}</section>}
      </section>
    </div>
  );
};
