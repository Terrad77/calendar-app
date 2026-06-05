import { useState } from 'react';
import { useInvitations } from '../hooks/useInvitations';

export default function InvitationsList() {
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
        <h2 style={{ margin: 0 }}>Invitations</h2>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? <p>Loading invitations...</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {!loading && !error && invitations.length === 0 ? <p>No pending invitations.</p> : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 12 }}>
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            style={{
              border: '1px solid rgba(0, 0, 0, 0.08)',
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
                Organizer: {invitation.organizerEmail}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void handleAction(invitation.id, 'accepted')}
                disabled={actionId === invitation.id || invitation.status !== 'pending'}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void handleAction(invitation.id, 'declined')}
                disabled={actionId === invitation.id || invitation.status !== 'pending'}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
