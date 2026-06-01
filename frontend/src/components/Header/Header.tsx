import React, { useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import css from './Header.module.css';
import btnCss from './HeaderButton.module.css';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  headerVariant?: 'default' | 'compact' | 'overlay';
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isAuthenticated,
  headerVariant = 'default',
}: HeaderProps) => {
  const { t } = useTranslation('common');
  const sidebarToggleLabel = sidebarOpen ? t('close_sidebar') : t('toggle_sidebar');
  const isCompact = headerVariant === 'compact';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, setSidebarOpen]); // Added setSidebarOpen to dependencies

  return (
    <header
      className={clsx(
        css.headerSurface,
        'relative',
        'sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl'
      )}
    >
      <div
        className={clsx(
          css.headerContent,
          'mx-auto flex min-h-[var(--app-header-height)] w-full max-w-[var(--layout-content-max-width)] items-center justify-between gap-3',
          headerVariant === 'overlay' && css.variantOverlay,
          headerVariant === 'compact' && css.variantCompact
        )}
      >
        {isAuthenticated && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${btnCss.headerControl} inline-flex z-50 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 ${
              isCompact
                ? 'h-[2.75rem] w-[2.75rem] xl:h-[3rem] xl:w-[3rem]'
                : 'h-[3.25rem] w-[3.25rem] xl:h-[3.5rem] xl:w-[3.5rem] 2xl:h-[3.75rem] 2xl:w-[3.75rem]'
            }`}
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
            aria-expanded={sidebarOpen}
            type="button"
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
        <div
          className={clsx(
            css.btnContainer,
            'flex items-center gap-2 sm:gap-3',
            isCompact ? 'w-full justify-center' : 'ml-auto'
          )}
        >
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
      <Toaster
        position="top-center"
        gutter={10}
        reverseOrder={false}
        toastOptions={{
          duration: 2500,
          removeDelay: 0,
          style: {
            background: 'transparent',
            color: 'var(--color-text-primary)',
            boxShadow: 'none',
            padding: '0',
          },
        }}
        containerStyle={{
          width: 'min(420px, calc(100vw - 32px))',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      />
    </header>
  );
};
