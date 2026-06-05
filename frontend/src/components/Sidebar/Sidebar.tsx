import { useEffect, useMemo, useState } from 'react';
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
import Modal from '../Modal/Modal';
import DeleteAccountModal from '../DeleteAccountModal/DeleteAccountModal';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { logOut, updateUser as updateUserOp } from '../../redux/user/operations';
import { authenticationService } from '../../services/authService';
import { selectUser } from '../../redux/user/selectors';
import { useAppDispatch } from '../../redux/hooks';
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
  const dispatch = useAppDispatch();

  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  const profileRole = (user as { role?: string } | null)?.role ?? 'user';

  const closeProfileModal = () => {
    setProfileOpen(false);
    setProfileError(null);
  };

  const handleLogout = async () => {
    await dispatch(logOut());
    closeProfileModal();
    navigate('/');
  };

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
        <div
          className={css.profileCard}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (user) {
              setProfileOpen(true);
              setEditName(user.name || '');
              setEditEmail(user.email || '');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (user) {
                setProfileOpen(true);
                setEditName(user.name || '');
                setEditEmail(user.email || '');
              }
            }
          }}
        >
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
        aria-hidden={!(isDesktop || isOpen)}
        initial={false}
        animate={isDesktop || isOpen ? { x: 0, opacity: 1 } : { x: '-100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ pointerEvents: isDesktop || isOpen ? 'auto' : 'none' }}
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {isOpen && !isDesktop && (
          <>
            <motion.div
              key="sidebar-backdrop"
              className={css.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.aside
              key="sidebar-mobile"
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

      <Modal
        isOpen={profileOpen}
        onClose={closeProfileModal}
        title={t('edit_profile', { ns: 'common' })}
        showCloseButton
      >
        <div className={css.profileModalBody}>
          <section className={css.profileSection}>
            <div className={css.profileSectionHeader}>
              <p className={css.profileSectionTitle}>{t('edit_profile', { ns: 'common' })}</p>
              <p className={css.profileSectionSubtitle}>{user?.email || 'guest@calendar.app'}</p>
            </div>

            <div className={css.profileFields}>
              <label className={css.profileFieldLabel} htmlFor="profile-name">
                {t('name', { ns: 'common' })}
              </label>
              <input
                id="profile-name"
                className={css.profileInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <label className={css.profileFieldLabel} htmlFor="profile-email">
                {t('email', { ns: 'common' })}
              </label>
              <input
                id="profile-email"
                className={css.profileInput}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <label className={css.profileFieldLabel} htmlFor="profile-role">
                {t('role', { ns: 'common' })}
              </label>
              <input id="profile-role" className={css.profileInput} value={profileRole} disabled />
            </div>

            {profileError && <div className={css.profileError}>{profileError}</div>}

            <div className={css.profileActions}>
              <button type="button" className="modal-button" onClick={closeProfileModal}>
                {t('cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="modal-button"
                onClick={async () => {
                  if (!user) return;
                  setSavingProfile(true);
                  setProfileError(null);
                  try {
                    const result = await dispatch(updateUserOp({ name: editName })).unwrap();
                    if (result) {
                      try {
                        authenticationService.setUser(result);
                      } catch (_e) {}
                    }
                    try {
                      const { updateUser } = await import('../../API/apiOperations');
                      await updateUser(user.id, { email: editEmail, role: profileRole });
                    } catch (_e) {
                      // ignore backend mismatch for optional profile fields
                    }
                    closeProfileModal();
                    toastMaker(t('profile_saved', { ns: 'common' }));
                  } catch (err: unknown) {
                    const e = err as Error;
                    setProfileError(e.message || 'Failed to save profile');
                  } finally {
                    setSavingProfile(false);
                  }
                }}
                disabled={savingProfile}
              >
                {savingProfile ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}
              </button>
            </div>
          </section>

          <section className={css.profileDangerZone}>
            <div className={css.profileDangerHeader}>
              <p className={css.profileDangerTitle}>{t('delete_account', { ns: 'common' })}</p>
              <p className={css.profileDangerSubtitle}>
                {t('delete_account_warning', { ns: 'common' })}
              </p>
            </div>

            <div className={css.profileDangerActions}>
              <button type="button" className="modal-button" onClick={handleLogout}>
                {t('log_out', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="modal-button"
                onClick={() => {
                  closeProfileModal();
                  setDeleteAccountOpen(true);
                }}
              >
                {t('delete_account', { ns: 'common' })}
              </button>
            </div>
          </section>
        </div>
      </Modal>

      {deleteAccountOpen && (
        <DeleteAccountModal
          isOpen={deleteAccountOpen}
          onClose={() => setDeleteAccountOpen(false)}
        />
      )}
    </>
  );
};
