import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
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
import { selectUser } from '../../redux/user/selectors';

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
    className={clsx(
      'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200',
      active
        ? 'bg-neutral-800 text-white shadow-sm'
        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
    )}
  >
    <Icon className="h-4 w-4 shrink-0 text-current transition-transform duration-200 group-hover:scale-105" />
    <span className="flex-1">{label}</span>
    <ChevronRight
      className={clsx(
        'h-4 w-4 transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
      )}
    />
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
  const [activeItem, setActiveItem] = useState<(typeof navigationItems)[number]['key']>('calendar');

  const handleSelect = (key: (typeof navigationItems)[number]['key']) => {
    setActiveItem(key);
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
    <>
      <div className="px-6 pt-6">
        <div className="flex items-center gap-3">
          {/* <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-sm font-semibold text-neutral-950 shadow-lg shadow-black/10">
            Sidebar
          </div> */}
          <div className="min-w-0">
            {/* <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              {t('workspace')}
            </p> */}
            <h1 className="mt-1 text-lg font-semibold text-white">CalendAir</h1>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-2 hover:bg-neutral-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-6 h-px bg-neutral-800" />

      <nav className="flex-1 px-4 py-6">
        <p className="px-2 text-[10px] uppercase tracking-[0.28em] text-neutral-500">
          {t('sidebar_title')}
        </p>
        <div className="mt-4 space-y-1">
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

      <div className="border-t border-neutral-800 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-neutral-800 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'Guest user'}</p>
            <p className="truncate text-xs text-neutral-400">
              {user?.email || 'guest@calendar.app'}
            </p>
          </div>
          <CircleUserRound className="h-4 w-4 shrink-0 text-neutral-400" />
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={clsx(
          'fixed top-16 left-0 z-40 hidden h-[calc(100%-4rem)] w-64 flex-col border-r border-neutral-800 bg-neutral-900 text-neutral-100 lg:flex',
          className
        )}
      >
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              className={clsx(
                'fixed top-16 left-0 z-50 flex h-[calc(100%-4rem)] w-64 flex-col border-r border-neutral-800 bg-neutral-900 text-neutral-100 lg:hidden',
                className
              )}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
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
