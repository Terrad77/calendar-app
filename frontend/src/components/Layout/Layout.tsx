import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import css from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className={css.layout}>
      <div className={css.floatingControls}>
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <main className={css.content}>{children}</main>
    </div>
  );
};
