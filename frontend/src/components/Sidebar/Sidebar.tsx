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
  Eye,
  EyeOff,
  Settings,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Logo from '../Logo/Logo';
import { selectUser } from '../../redux/user/selectors';
import { useAppDispatch } from '../../redux/hooks';
import { toggleOwner, selectHiddenOwners } from '../../redux/calendarUi/calendarUiSlice';
import { useCalendarShares } from '../../hooks/useCalendarShares';
import { getInitials } from '../../utils/getInitials';
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
  onOpenProfile?: () => void;
}

export const Sidebar = ({ className, isOpen = true, onClose, onOpenProfile }: SidebarProps) => {
  const user = useSelector(selectUser);
  const hiddenOwners = useSelector(selectHiddenOwners);
  const { t } = useTranslation('navigation');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const sharedCalendars = useCalendarShares(!!user);

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

  const initials = useMemo(() => getInitials(user?.name, user?.email), [user?.name, user?.email]);

  const sidebarContent = (
    <div className={css.sidebarContent}>
      <div className={css.header}>
        <Logo />

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

      {sharedCalendars.length > 0 && (
        <div className={css.sharedSection}>
          <p className={css.sharedTitle}>{t('shared_calendars', { defaultValue: 'Shared' })}</p>
          <div className={css.sharedList}>
            {sharedCalendars.map((cal) => {
              const hidden = hiddenOwners.includes(cal.id);
              return (
                <div key={cal.id} className={css.sharedItem}>
                  <span
                    className={css.sharedDot}
                    style={{ background: hidden ? '#9ca3af' : cal.color }}
                  />
                  <span className={css.sharedName}>{cal.name}</span>
                  <button
                    type="button"
                    className={css.sharedToggle}
                    onClick={() => dispatch(toggleOwner(cal.id))}
                    aria-label={hidden ? 'Show calendar' : 'Hide calendar'}
                  >
                    {hidden ? (
                      <EyeOff className={css.sharedToggleIcon} />
                    ) : (
                      <Eye className={css.sharedToggleIcon} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={css.footer}>
        <div
          className={css.profileCard}
          role="button"
          tabIndex={0}
          onClick={() => onOpenProfile?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenProfile?.();
          }}
        >
          <div className={css.avatar}>{initials}</div>
          <div className={css.profileMeta}>
            <p className={css.profileName}>{user?.name || 'Guest user'}</p>
            <p className={css.profileEmail}>{user?.email || 'guest@calendar.app'}</p>
          </div>
          <Settings className={css.profileIcon} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-backdrop"
            className={css.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={clsx(css.sidebar, className)}
        aria-hidden={!isOpen}
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
};
