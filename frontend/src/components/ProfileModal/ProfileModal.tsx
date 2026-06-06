import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal/Modal';
import DeleteAccountModal from '../DeleteAccountModal/DeleteAccountModal';
import toastMaker from '../../utils/toastMaker/toastMaker';
import { logOut, updateUser as updateUserOp } from '../../redux/user/operations';
import { authenticationService } from '../../services/authService';
import { selectUser } from '../../redux/user/selectors';
import { useAppDispatch } from '../../redux/hooks';
import css from './ProfileModal.module.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const user = useSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const profileRole = (user as { role?: string } | null)?.role ?? 'user';

  // Pre-fill form fields each time the modal opens
  useEffect(() => {
    if (isOpen && user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setProfileError(null);
    }
  }, [isOpen, user]);

  const handleClose = () => {
    setProfileError(null);
    onClose();
  };

  const handleLogout = async () => {
    await dispatch(logOut());
    handleClose();
    navigate('/');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={t('edit_profile')} showCloseButton>
        <div className={css.body}>
          <section className={css.section}>
            <div className={css.sectionHeader}>
              <p className={css.sectionTitle}>{t('edit_profile')}</p>
              <p className={css.sectionSubtitle}>{user?.email || 'guest@calendar.app'}</p>
            </div>

            <div className={css.fields}>
              <label className={css.fieldLabel} htmlFor="profile-modal-name">
                {t('name')}
              </label>
              <input
                id="profile-modal-name"
                className={css.input}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <label className={css.fieldLabel} htmlFor="profile-modal-email">
                {t('email')}
              </label>
              <input
                id="profile-modal-email"
                className={css.input}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <label className={css.fieldLabel} htmlFor="profile-modal-role">
                {t('role')}
              </label>
              <input id="profile-modal-role" className={css.input} value={profileRole} disabled />
            </div>

            {profileError && <div className={css.error}>{profileError}</div>}

            <div className={css.actions}>
              <button type="button" className="modal-button" onClick={handleClose}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="modal-button"
                disabled={savingProfile}
                onClick={async () => {
                  if (!user) return;
                  setSavingProfile(true);
                  setProfileError(null);
                  try {
                    const result = await dispatch(updateUserOp({ name: editName })).unwrap();
                    if (result) {
                      try {
                        authenticationService.setUser(result);
                      } catch (_e) {
                        // setUser is best-effort; ignore if unavailable
                      }
                    }
                    try {
                      const { updateUser } = await import('../../API/apiOperations');
                      await updateUser(user.id, { email: editEmail, role: profileRole });
                    } catch (_e) {
                      // ignore backend mismatch for optional profile fields
                    }
                    handleClose();
                    toastMaker(t('profile_saved'));
                  } catch (err: unknown) {
                    const e = err as Error;
                    setProfileError(e.message || 'Failed to save profile');
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              >
                {savingProfile ? t('saving') : t('save')}
              </button>
            </div>
          </section>

          <section className={css.dangerZone}>
            <div className={css.dangerHeader}>
              <p className={css.dangerTitle}>{t('delete_account')}</p>
              <p className={css.dangerSubtitle}>{t('delete_account_warning')}</p>
            </div>

            <div className={css.dangerActions}>
              <button type="button" className="modal-button" onClick={handleLogout}>
                {t('log_out')}
              </button>
              <button
                type="button"
                className="modal-button"
                onClick={() => {
                  handleClose();
                  setDeleteAccountOpen(true);
                }}
              >
                {t('delete_account')}
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
