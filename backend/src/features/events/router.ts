import { Router, Request, Response } from 'express';
import { and, eq, gte, lte, sql, ne, or, getTableColumns } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkEventAccess } from '../../middleware/checkEventAccess.js';
import { getDb } from '../../db.js';
import { calendarEvents, calendarShares, eventParticipants, users } from '../../schema.js';
import {
  inviteUser,
  listPendingInvitations,
  respondToInvitation,
} from '../../controllers/invitationController.js';
import { sendApiError, sendApiResponse } from '../../utils/apiResponse.js';

const router = Router();

type EventType = 'task' | 'holiday' | 'meeting' | 'reminder';
type EventColor = 'default' | 'red' | 'yellow' | 'green';

type EventRow = typeof calendarEvents.$inferSelect;
type EventInsert = typeof calendarEvents.$inferInsert;

interface EventPayload {
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

interface EventResponse extends Omit<EventPayload, 'color'> {
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

const toEventResponse = (row: EventRow): EventResponse => ({
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

const buildEventInsert = (payload: EventPayload, userId: string): EventInsert => ({
  id: payload.id || `event-${randomUUID()}`,
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

const isPastDate = (value: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(value);
  eventDate.setHours(0, 0, 0, 0);

  return eventDate < today;
};

router.get('/my-events', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const database = getDb();
    const userId = req.user.userId;

    // Get all columns of table as object
    const calendarEventColumns = getTableColumns(calendarEvents);

    // typesafe query to get events where the user is either the owner or a participant (not declined)
    const rows = await database
      .select({
        ...calendarEventColumns,
        accessRole:
          sql<string>`CASE WHEN ${calendarEvents.userId} = ${userId}::uuid THEN 'owner' ELSE 'participant' END`.as(
            'accessRole'
          ),
        participantStatus: eventParticipants.status,
      })
      .from(calendarEvents)
      .leftJoin(
        eventParticipants,
        and(eq(eventParticipants.eventId, calendarEvents.id), eq(eventParticipants.userId, userId))
      )
      .where(
        or(
          eq(calendarEvents.userId, userId),
          and(eq(eventParticipants.userId, userId), ne(eventParticipants.status, 'declined'))
        )
      )
      .orderBy(calendarEvents.startDate, calendarEvents.startTime);

    const ownEvents = rows.map((row) => ({
      ...toEventResponse(row),
      accessRole: row.accessRole as 'owner' | 'participant',
      participantStatus: row.participantStatus as 'pending' | 'accepted' | 'declined' | null,
    }));

    // Append events from calendars that have been shared with the current user
    const shares = await database
      .select({ ownerId: calendarShares.ownerId, ownerName: users.name })
      .from(calendarShares)
      .leftJoin(users, eq(users.id, calendarShares.ownerId))
      .where(eq(calendarShares.sharedWithId, userId));

    const sharedEventArrays = await Promise.all(
      shares.map(async ({ ownerId, ownerName }) => {
        const ownerEvents = await database
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.userId, ownerId))
          .orderBy(calendarEvents.startDate, calendarEvents.startTime);

        return ownerEvents.map((ev) => {
          const base = toEventResponse(ev);
          if (ev.isPrivate) {
            return {
              ...base,
              title: 'Busy',
              description: undefined,
              location: undefined,
              participants: [],
              metadata: {},
              accessRole: 'shared' as const,
              ownerInfo: { id: ownerId, name: ownerName ?? '' },
            };
          }
          return {
            ...base,
            accessRole: 'shared' as const,
            ownerInfo: { id: ownerId, name: ownerName ?? '' },
          };
        });
      })
    );

    const events = [...ownEvents, ...sharedEventArrays.flat()];

    sendApiResponse(res, 200, { events }, { total: events.length });
  } catch (error) {
    console.error('Database Error:', error);
    sendApiError(res, 500, 'Failed to load calendar events');
  }
});

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', message: 'User not authenticated' });
      return;
    }

    const database = getDb();
    const { from, to, eventType, userId } = req.query;

    const targetUserId = typeof userId === 'string' && userId ? userId : req.user.userId;

    const conditions: any[] = [eq(calendarEvents.userId, targetUserId)];

    if (typeof userId === 'string' && userId && userId !== req.user.userId) {
      conditions.push(eq(calendarEvents.isPublic, true));
    }

    if (typeof from === 'string' && from) {
      conditions.push(gte(calendarEvents.startDate, from));
    }

    if (typeof to === 'string' && to) {
      conditions.push(lte(calendarEvents.endDate, to));
    }

    if (typeof eventType === 'string' && eventType) {
      conditions.push(eq(calendarEvents.eventType, eventType as EventType));
    }

    let rows = await database
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(calendarEvents.startDate, calendarEvents.startTime);

    if (typeof userId === 'string' && userId && userId !== req.user.userId) {
      rows = rows.filter((r) => {
        try {
          if (r.isPublic) return true;
          const parts = Array.isArray(r.participants) ? r.participants : [];
          return parts.includes(req.user!.userId);
        } catch (_e) {
          return false;
        }
      });
    }

    res.json({ events: rows.map(toEventResponse) });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get(
  '/:id',
  authenticateToken,
  checkEventAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.eventAccess) {
        res
          .status(500)
          .json({ error: 'Failed to load event', message: 'Event access not initialized' });
        return;
      }

      res.json({
        event: {
          ...toEventResponse(req.eventAccess.event),
          accessRole: req.eventAccess.isOwner ? 'owner' : 'participant',
          participantStatus: req.eventAccess.participantStatus,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

router.post('/:eventId/invite', authenticateToken, inviteUser);

router.get('/invitations/pending', authenticateToken, listPendingInvitations);

router.put('/invitations/:invitationId/respond', authenticateToken, respondToInvitation);

router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', message: 'User not authenticated' });
      return;
    }

    const payload = req.body as Partial<EventPayload>;

    if (!payload.title || !payload.startDate || !payload.endDate) {
      res.status(400).json({
        error: 'Validation error',
        message: 'title, startDate, and endDate are required',
      });
      return;
    }

    if (isPastDate(payload.startDate)) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Cannot create events in the past',
      });
      return;
    }

    const database = getDb();
    const [createdEvent] = await database
      .insert(calendarEvents)
      .values(buildEventInsert(payload as EventPayload, req.user.userId))
      .returning();

    if (!createdEvent) {
      res.status(500).json({ error: 'Failed to create event', message: 'Insert returned no row' });
      return;
    }

    res.status(201).json({
      message: 'Event created successfully',
      event: toEventResponse(createdEvent),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', message: 'User not authenticated' });
      return;
    }

    const database = getDb();
    const existingRows = await database
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, req.params.id), eq(calendarEvents.userId, req.user.userId)))
      .limit(1);

    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Not found', message: 'Event not found' });
      return;
    }

    const existing = existingRows[0];
    const payload = req.body as Partial<EventPayload>;
    const [updatedEvent] = await database
      .update(calendarEvents)
      .set({
        eventType: payload.eventType || existing.eventType,
        title: payload.title ?? existing.title,
        description: payload.description ?? existing.description,
        startDate: payload.startDate ?? existing.startDate,
        endDate: payload.endDate ?? existing.endDate,
        startTime: payload.startTime ?? existing.startTime,
        endTime: payload.endTime ?? existing.endTime,
        location: payload.location ?? existing.location,
        countryCode: payload.countryCode ?? existing.countryCode,
        reminderTime: payload.reminderTime ?? existing.reminderTime,
        isRecurring: payload.isRecurring ?? existing.isRecurring,
        isPublic: payload.isPublic ?? existing.isPublic,
        isPrivate: payload.isPrivate ?? existing.isPrivate,
        completed: payload.completed ?? existing.completed,
        priority: payload.priority ?? existing.priority,
        colors: payload.colors || (payload.color ? [payload.color] : existing.colors),
        participants: payload.participants ?? existing.participants,
        metadata: payload.metadata ?? existing.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(calendarEvents.id, req.params.id), eq(calendarEvents.userId, req.user.userId)))
      .returning();

    if (!updatedEvent) {
      res.status(500).json({ error: 'Failed to update event', message: 'Update returned no row' });
      return;
    }

    res.json({
      message: 'Event updated successfully',
      event: toEventResponse(updatedEvent),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', message: 'User not authenticated' });
      return;
    }

    const database = getDb();
    const deletedRows = await database
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, req.params.id), eq(calendarEvents.userId, req.user.userId)))
      .returning({ id: calendarEvents.id });

    if (deletedRows.length === 0) {
      res.status(404).json({ error: 'Not found', message: 'Event not found' });
      return;
    }

    res.json({ message: 'Event deleted successfully', id: deletedRows[0].id });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
