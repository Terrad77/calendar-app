import { useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import css from './Header.module.css';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAuthenticated: boolean;
}

export const Header = ({ sidebarOpen, setSidebarOpen, isAuthenticated }: HeaderProps) => {
  const { t } = useTranslation('common');
  const { isDark } = useTheme();
  const sidebarToggleLabel = sidebarOpen ? t('close_sidebar') : t('toggle_sidebar');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, setSidebarOpen]); // Added setSidebarOpen to dependencies

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-neutral-50/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-50/80 dark:border-neutral-700/80 dark:bg-neutral-900/90 supports-[backdrop-filter]:dark:bg-neutral-900/80">
      <div className="mx-auto flex min-h-[var(--app-header-height)] w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        {isAuthenticated && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="inline-flex z-50 h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/30"
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
            aria-expanded={sidebarOpen}
            type="button"
            style={{
              color: isDark ? '#f8fafc' : '#334155',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.72)',
              borderColor: isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(148, 163, 184, 0.16)',
              boxShadow: isDark
                ? '0 10px 24px rgba(15, 23, 42, 0.24)'
                : '0 8px 20px rgba(15, 23, 42, 0.08)',
            }}
          >
            <AnimatePresence initial={false} mode="wait">
              {sidebarOpen ? (
                <motion.span
                  key="close"
                  className="flex h-full w-full items-center justify-center leading-none"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.16 }}
                >
                  <X className="block h-6 w-6 stroke-[2] text-current" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  className="flex h-full w-full items-center justify-center leading-none"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.16 }}
                >
                  <Menu className="block h-6 w-6 stroke-[2] text-current" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
        <div className={clsx('ml-auto flex items-center gap-3 sm:gap-4', css.btnContainer)}>
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};
