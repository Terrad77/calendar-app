import React, { useEffect, useMemo } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import { getNotifications } from '../../API/apiOperations';
import { selectUser } from '../../redux/user/selectors';
import css from './Header.module.css';
import btnCss from './HeaderButton.module.css';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  headerVariant?: 'default' | 'compact' | 'overlay';
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isAuthenticated,
  headerVariant = 'default',
  onOpenProfile,
}: HeaderProps) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const sidebarToggleLabel = sidebarOpen ? t('close_sidebar') : t('toggle_sidebar');

  // First letter of the user's name for the avatar circle
  const initial = useMemo(() => user?.name?.trim()?.[0]?.toUpperCase() ?? '?', [user?.name]);

  const { data: unreadNotifs } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => getNotifications(true),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const unreadCount = unreadNotifs?.length ?? 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <header
      className={clsx(
        css.headerSurface,
        'backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl'
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
        {/* Burger toggle — 36×36 icon button */}
        {isAuthenticated && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${btnCss.headerControl} ${btnCss.headerIconBtn}`}
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
                  <X className="block h-5 w-5 stroke-[2] text-current" />
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
                  <Menu className="block h-5 w-5 stroke-[2] text-current" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}

        {/* Right-side controls */}
        <div className={clsx(css.btnContainer, 'flex items-center gap-2 sm:gap-3', 'ml-auto')}>
          {/* Bell — 36×36 icon button */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className={`${btnCss.headerControl} ${btnCss.headerIconBtn} relative`}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="block h-5 w-5 stroke-[2] text-current" />
              {unreadCount > 0 && (
                <span className={css.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          )}

          {/* Theme and language pill toggles */}
          <ThemeSwitcher />
          <LanguageSwitcher />

          {/* Avatar button — opens Edit Profile modal */}
          {isAuthenticated && (
            <button
              type="button"
              className={btnCss.avatarBtn}
              onClick={onOpenProfile}
              aria-label="Edit profile"
              title="Edit profile"
            >
              {initial}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
