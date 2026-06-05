import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  getPendingInvitations,
  inviteUserToEvent,
  respondToInvitation as respondToInvitationApi,
} from '../API/apiOperations';

export interface Invitation {
  id: string;
  eventId: string;
  title: string;
  startTime: string;
  organizerEmail: string;
  status: string;
}

export const useInvitations = () => {
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Helper to extract error message
  const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  };

  const sendInvitation = async (eventId: string, email: string) => {
    setLoading(true);
    try {
      await inviteUserToEvent(eventId, email);
      toast.success('Invitation sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (id: string, status: 'accepted' | 'declined') => {
    const previousInvitations = [...invitations];
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));

    try {
      await respondToInvitationApi(id, status);
      toast.success(`Invitation ${status}`);
    } catch (error) {
      setInvitations(previousInvitations);
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const data = await getPendingInvitations();
        setInvitations(data as Invitation[]);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    };

    fetchInvitations();
  }, []);

  return {
    invitations,
    loading,
    sendInvitation,
    respondToInvitation,
  };
};
