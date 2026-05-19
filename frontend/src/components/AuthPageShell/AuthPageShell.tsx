import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo/Logo';
import styles from './AuthPageShell.module.css';

interface AuthPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  ctaNote: string;
  bullets: string[];
  children: ReactNode;
}

export const AuthPageShell = ({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaNote,
  bullets,
  children,
}: AuthPageShellProps) => {
  return (
    <div className={styles.page}>
      <div className={styles.glowPrimary} />
      <div className={styles.glowSecondary} />

      <section className={styles.shell}>
        <aside className={styles.hero}>
          <Logo />

          <div className={styles.copy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.bulletList}>
            {bullets.map((bullet) => (
              <div key={bullet} className={styles.bulletItem}>
                <span className={styles.bulletDot} />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          <Link className={styles.ctaCard} to={ctaHref}>
            <span className={styles.ctaLabel}>{ctaLabel}</span>
            <strong>{ctaNote}</strong>
          </Link>
        </aside>

        <section className={styles.formSection}>
          <div className={styles.formCard}>{children}</div>
        </section>
      </section>
    </div>
  );
};
