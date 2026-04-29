import instance from './axiosInstance';
import type { CalendarEvent, ColorType, EventType } from '../types/types';

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
}

interface CalendarEventPayload {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  countryCode?: string;
  reminderTime?: string;
  isRecurring?: boolean;
  isPublic?: boolean;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  color?: ColorType;
  colors?: ColorType[];
  participants?: string[];
  metadata?: Record<string, unknown>;
  eventType?: EventType;
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

export const getCalendarEvents = async () => {
  const { data } = await instance.get('/api/events');
  const events = Array.isArray(data?.events) ? data.events : [];

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
    console.log(response.message);

    return response;
  }
};
