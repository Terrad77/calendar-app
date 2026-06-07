import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvitations } from '../hooks/useInvitations';
import DotLoader from '../../../components/DotLoader/DotLoader';

export default function InvitationsList() {
  const { t } = useTranslation('calendar');
  const { invitations, loading, error, refresh, respond } = useInvitations();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleAction = async (invitationId: string, status: 'accepted' | 'declined') => {
    setActionId(invitationId);

    try {
      await respond(invitationId, status);
    } finally {
      setActionId(null);
    }
  };

  return (
    <section>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <h2 style={{ margin: 0 }}>{t('invitations')}</h2>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {t('refresh')}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
          <DotLoader text={t('common:loading')} />
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}

      {!loading && !error && invitations.length === 0 ? <p>{t('no_invitations')}</p> : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 12 }}>
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            style={{
              border: '1px solid var(--surface-panel-border)',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <div>
              <strong>{invitation.title}</strong>
              <div style={{ fontSize: 14, opacity: 0.75 }}>
                {invitation.startDate}
                {invitation.startTime ? ` ${invitation.startTime}` : ''}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {t('organizer')}: {invitation.organizerEmail}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void handleAction(invitation.id, 'accepted')}
                disabled={actionId === invitation.id || invitation.status !== 'pending'}
              >
                {t('accept')}
              </button>
              <button
                type="button"
                onClick={() => void handleAction(invitation.id, 'declined')}
                disabled={actionId === invitation.id || invitation.status !== 'pending'}
              >
                {t('decline')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
