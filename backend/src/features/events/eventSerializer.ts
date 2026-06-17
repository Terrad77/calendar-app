import { randomUUID } from 'crypto';
import { calendarEvents } from '../../schema.js';

// Shared event domain types and serialization helpers.
// Used by both the events CRUD router and the calendar aggregate router.

export type EventType = 'task' | 'holiday' | 'meeting' | 'reminder';
export type EventColor = 'default' | 'red' | 'yellow' | 'green';

export type EventRow = typeof calendarEvents.$inferSelect;
export type EventInsert = typeof calendarEvents.$inferInsert;

export interface EventPayload {
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
  isPrivate?: boolean;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  color?: EventColor;
  colors?: EventColor[];
  participants?: string[];
  metadata?: Record<string, unknown>;
  eventType?: EventType;
}

export interface EventResponse extends Omit<EventPayload, 'color'> {
  id: string;
  userId: string;
  color?: EventColor;
  colors: EventColor[];
  isPrivate?: boolean;
  createdAt: Date;
  updatedAt: Date;
  accessRole?: 'owner' | 'participant' | 'shared';
  participantStatus?: 'pending' | 'accepted' | 'declined' | null;
  ownerInfo?: { id: string; name: string } | null;
}

const DEFAULT_EVENT_TYPE: EventType = 'task';

// The id column is a uuid. Clients generate prefixed nanoid ids (e.g. "task-...")
// for local state, which are not valid uuids — fall back to a generated one.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string | undefined): value is string => !!value && UUID_REGEX.test(value);

export const toEventResponse = (row: EventRow): EventResponse => ({
  id: row.id,
  userId: row.userId,
  title: row.title,
  description: row.description ?? undefined,
  startDate: row.startDate,
  endDate: row.endDate,
  startTime: row.startTime ?? undefined,
  endTime: row.endTime ?? undefined,
  location: row.location ?? undefined,
  countryCode: row.countryCode ?? undefined,
  reminderTime: row.reminderTime ?? undefined,
  isRecurring: row.isRecurring,
  isPublic: row.isPublic,
  isPrivate: row.isPrivate,
  completed: row.completed,
  priority: row.priority ?? undefined,
  eventType: row.eventType,
  color: row.colors[0],
  colors: row.colors,
  participants: row.participants,
  metadata: row.metadata,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const normalizeColors = (payload: EventPayload): EventColor[] => {
  if (payload.colors && payload.colors.length > 0) {
    return payload.colors;
  }

  if (payload.color) {
    return [payload.color];
  }

  return ['default'];
};

export const buildEventInsert = (payload: EventPayload, userId: string): EventInsert => ({
  id: isUuid(payload.id) ? payload.id : randomUUID(),
  userId,
  eventType: payload.eventType || DEFAULT_EVENT_TYPE,
  title: payload.title,
  description: payload.description ?? null,
  startDate: payload.startDate,
  endDate: payload.endDate,
  startTime: payload.startTime ?? null,
  endTime: payload.endTime ?? null,
  location: payload.location ?? null,
  countryCode: payload.countryCode ?? null,
  reminderTime: payload.reminderTime ?? null,
  isRecurring: payload.isRecurring ?? false,
  isPublic: payload.isPublic ?? false,
  isPrivate: payload.isPrivate ?? false,
  completed: payload.completed ?? false,
  priority: payload.priority ?? null,
  colors: normalizeColors(payload),
  participants: payload.participants ?? [],
  metadata: payload.metadata ?? {},
});

export const isPastDate = (value: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(value);
  eventDate.setHours(0, 0, 0, 0);

  return eventDate < today;
};
