import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import css from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className={css.layout}>
      {/* Language Switcher on all pages */}
      <div className={css.languageContainer}>
        <LanguageSwitcher />
      </div>

      <main className={css.content}>{children}</main>
    </div>
  );
};
