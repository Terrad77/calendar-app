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
  const [jobTitle, setJobTitle] = useState('');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Pre-fill form fields each time the modal opens
  useEffect(() => {
    if (isOpen && user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setJobTitle(user.jobTitle ?? '');
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
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('edit_profile')}
        showCloseButton
        size="small"
      >
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
              {/* Email is display-only: changing it would require re-verification */}
              <input
                id="profile-modal-email"
                className={`${css.input} ${css.inputReadOnly}`}
                value={editEmail}
                readOnly
              />

              <label className={css.fieldLabel} htmlFor="profile-modal-job-title">
                {t('job_title')}
              </label>
              <input
                id="profile-modal-job-title"
                className={css.input}
                value={jobTitle}
                placeholder={t('job_title_placeholder')}
                onChange={(e) => setJobTitle(e.target.value)}
              />
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
                    const result = await dispatch(
                      updateUserOp({ name: editName, jobTitle })
                    ).unwrap();
                    if (result) {
                      try {
                        authenticationService.setUser(result);
                      } catch (_e) {
                        // setUser is best-effort; ignore if unavailable
                      }
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
