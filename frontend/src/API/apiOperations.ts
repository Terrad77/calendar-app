import instance from './axiosInstance';
import type {
  CalendarEvent,
  CalendarEventPayload,
  ColorType,
  EventType,
} from '../types/calendar.types';

interface BackendCalendarEvent {
  id: string;
  userId: string;
  eventType: EventType;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  countryCode?: string | null;
  reminderTime?: string | null;
  isRecurring: boolean;
  isPublic: boolean;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high' | null;
  colors: ColorType[];
  participants: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  accessRole?: 'owner' | 'participant';
  participantStatus?: 'pending' | 'accepted' | 'declined' | null;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
}

const mapBackendEventToCalendarEvent = (event: BackendCalendarEvent): CalendarEvent => {
  const baseEvent = {
    id: event.id,
    date: event.startDate,
    title: event.title,
    description: event.description ?? '',
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    colors: event.colors,
    location: event.location ?? undefined,
    ownerId: event.userId,
    isRecurring: event.isRecurring,
    accessRole: event.accessRole,
    participantStatus: event.participantStatus ?? null,
  };

  switch (event.eventType) {
    case 'task':
      return {
        ...baseEvent,
        eventType: 'task',
        completed: event.completed,
        priority: event.priority ?? 'medium',
      };
    case 'holiday':
      return {
        ...baseEvent,
        eventType: 'holiday',
        countryCode: event.countryCode ?? '',
        isPublic: event.isPublic,
      };
    case 'meeting':
      return {
        ...baseEvent,
        eventType: 'meeting',
        startTime: event.startTime ?? '09:00',
        endTime: event.endTime ?? '10:00',
        participants: event.participants,
      };
    case 'reminder':
      return {
        ...baseEvent,
        eventType: 'reminder',
        reminderTime: event.reminderTime ?? '09:00',
        isRecurring: event.isRecurring,
      };
    default:
      return {
        ...baseEvent,
        eventType: 'task',
        completed: event.completed,
        priority: event.priority ?? 'medium',
      };
  }
};

const toBackendPayload = (event: CalendarEvent): CalendarEventPayload => ({
  id: event.id,
  title: event.title,
  description: event.description,
  startDate: event.date,
  endDate: event.date,
  startTime: event.startTime,
  endTime: event.endTime,
  location: event.location,
  countryCode: event.countryCode,
  reminderTime: 'reminderTime' in event ? event.reminderTime : undefined,
  isRecurring: 'isRecurring' in event ? event.isRecurring : undefined,
  isPublic: 'isPublic' in event ? event.isPublic : undefined,
  completed: 'completed' in event ? event.completed : undefined,
  priority: 'priority' in event ? event.priority : undefined,
  colors: event.colors,
  participants: 'participants' in event ? event.participants : undefined,
  eventType: event.eventType,
});

export const getCalendarEvents = async (userId?: string) => {
  const { data } = await instance.get('/api/events', { params: userId ? { userId } : {} });
  const events = Array.isArray(data?.events) ? data.events : [];

  return events.map(mapBackendEventToCalendarEvent) as CalendarEvent[];
};

export const getMyCalendarEvents = async () => {
  const { data } =
    await instance.get<ApiEnvelope<{ events: BackendCalendarEvent[] }>>('/api/calendar/my-events');
  const events = Array.isArray(data?.data?.events) ? data.data.events : [];

  return events.map(mapBackendEventToCalendarEvent) as CalendarEvent[];
};

export const createCalendarEvent = async (event: CalendarEvent) => {
  const { data } = await instance.post('/api/events', toBackendPayload(event));
  return mapBackendEventToCalendarEvent(data.event);
};

export const updateCalendarEvent = async (event: CalendarEvent) => {
  const { data } = await instance.put(`/api/events/${event.id}`, toBackendPayload(event));
  return mapBackendEventToCalendarEvent(data.event);
};

export const deleteCalendarEvent = async (eventId: string) => {
  const { data } = await instance.delete(`/api/events/${eventId}`);
  return data;
};

export interface InvitationApiItem {
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

export const inviteUserToEvent = async (eventId: string, email: string) => {
  const { data } = await instance.post<ApiEnvelope<{ invitation: InvitationApiItem | null }>>(
    `/api/calendar/${eventId}/invite`,
    { email }
  );

  return data.data.invitation;
};

export const getPendingInvitations = async () => {
  const { data } = await instance.get<ApiEnvelope<{ invitations: InvitationApiItem[] }>>(
    '/api/calendar/invitations/pending'
  );

  return Array.isArray(data.data?.invitations) ? data.data.invitations : [];
};

export const respondToInvitation = async (
  invitationId: string,
  status: 'accepted' | 'declined'
) => {
  const { data } = await instance.put<ApiEnvelope<{ invitation: InvitationApiItem | null }>>(
    `/api/calendar/invitations/${invitationId}/respond`,
    { status }
  );

  return data.data.invitation;
};

export const getUsers = async () => {
  try {
    const { data } = await instance.get('/api/users');
    return data.result;
  } catch (error: unknown) {
    // Type-safe error handling
    const err = error as {
      response?: {
        data?: { message: string };
        status: number;
      };
    };

    const response = {
      message: err.response?.data?.message || 'Unknown error',
      statusCode: err.response?.status || 500,
    };

    return response;
  }
};

export const updateUser = async (
  id: string,
  payload: { name?: string; email?: string; role?: string }
) => {
  const { data } = await instance.put(`/api/users/${id}`, payload);
  return data;
};

// Profile Management
export const updateProfile = async (data: { name?: string; theme?: string }) => {
  const response = await instance.put('/api/auth/profile', data);
  return response.data;
};

export const changePassword = async (oldPassword: string, newPassword: string) => {
  const response = await instance.post('/api/auth/change-password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};

export const deleteAccount = async (password: string) => {
  const response = await instance.delete('/api/auth/account', {
    data: { password },
  });
  return response.data;
};
