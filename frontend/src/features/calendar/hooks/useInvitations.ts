import { useEffect, useState } from 'react';
import { getPendingInvitations, respondToInvitation } from '../../../API/apiOperations';

export interface InvitationRecord {
  id: string;
  eventId: string;
  userId: string;
  title: string;
  startDate: string;
  startTime: string | null;
  organizerEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: string;
  updatedAt: string;
}

export const useInvitations = () => {
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getPendingInvitations();
      setInvitations(data as InvitationRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const respond = async (invitationId: string, status: 'accepted' | 'declined') => {
    setError(null);
    // Optimistically update the invitation status
    const previousInvitations = invitations;

    setInvitations((prev) =>
      prev.map((invitation) =>
        invitation.id === invitationId ? { ...invitation, status } : invitation
      )
    );

    try {
      await respondToInvitation(invitationId, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invitation');
      setInvitations(previousInvitations);
      await refresh();
      throw err;
    }
  };

  return {
    invitations,
    loading,
    error,
    refresh,
    respond,
  };
};
