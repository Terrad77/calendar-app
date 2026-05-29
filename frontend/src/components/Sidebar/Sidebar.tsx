import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  Bell,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Settings,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Logo from '../Logo/Logo';
import { selectUser } from '../../redux/user/selectors';
import css from './Sidebar.module.css';

interface SidebarNavItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onSelect: () => void;
}

const SidebarNavItem = ({ label, icon: Icon, active, onSelect }: SidebarNavItemProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={clsx(css.navItem, active && css.navItemActive)}
  >
    <Icon className={css.navIcon} />
    <span className={css.navLabel}>{label}</span>
    <ChevronRight className={clsx(css.navChevron, active && css.navChevronActive)} />
  </button>
);

const navigationItems = [
  { key: 'calendar', icon: CalendarDays },
  { key: 'analytics', icon: BarChart3 },
  { key: 'contacts', icon: Users },
  { key: 'notifications', icon: Bell },
  { key: 'settings', icon: Settings },
] as const;

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ className, isOpen = true, onClose }: SidebarProps) => {
  const user = useSelector(selectUser);
  const { t } = useTranslation('navigation');
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = useMemo<(typeof navigationItems)[number]['key']>(() => {
    if (location.pathname.startsWith('/analytics')) return 'analytics';
    if (location.pathname.startsWith('/contacts')) return 'contacts';
    if (location.pathname.startsWith('/notifications')) return 'notifications';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'calendar';
  }, [location.pathname]);

  const handleSelect = (key: (typeof navigationItems)[number]['key']) => {
    const routeMap: Record<(typeof navigationItems)[number]['key'], string> = {
      calendar: '/calendar',
      analytics: '/analytics',
      contacts: '/contacts',
      notifications: '/notifications',
      settings: '/settings',
    };

    navigate(routeMap[key]);
    onClose?.();
  };

  const initials = useMemo(() => {
    const sourceName = user?.name?.trim() || 'User';
    return sourceName
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const sidebarContent = (
    <div className={css.sidebarContent}>
      <div className={css.header}>
        <div className={css.brand}>
          <div className={css.brandLogo}>
            <Logo />
          </div>
          <div className={css.brandText}>
            <p className={css.brandLabel}>CalendAir</p>
            <h1 className={css.brandTitle}>{t('workspace')}</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={css.closeButton}
          aria-label="Close sidebar"
        >
          <X className={css.closeIcon} />
        </button>
      </div>

      <div className={css.divider} />

      <nav className={css.nav}>
        <p className={css.navTitle}>{t('sidebar_title')}</p>
        <div className={css.navList}>
          {navigationItems.map((item) => (
            <SidebarNavItem
              key={item.key}
              label={t(item.key)}
              icon={item.icon}
              active={activeItem === item.key}
              onSelect={() => handleSelect(item.key)}
            />
          ))}
        </div>
      </nav>

      <div className={css.footer}>
        <div className={css.profileCard}>
          <div className={css.avatar}>{initials}</div>
          <div className={css.profileMeta}>
            <p className={css.profileName}>{user?.name || 'Guest user'}</p>
            <p className={css.profileEmail}>{user?.email || 'guest@calendar.app'}</p>
          </div>
          <CircleUserRound className={css.profileIcon} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.aside
        className={clsx(css.sidebar, className)}
        inert={!isOpen}
        initial={false}
        animate={isOpen ? { x: 0, opacity: 1 } : { x: '-100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className={css.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              className={clsx(css.mobileSidebar, className)}
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
