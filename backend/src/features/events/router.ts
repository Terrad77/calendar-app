import { Router, Request, Response } from 'express';
import { and, eq, gte, lte } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { checkEventAccess } from '../../middleware/checkEventAccess.js';
import { getDb } from '../../db.js';
import { calendarEvents } from '../../schema.js';
import {
  EventType,
  EventPayload,
  toEventResponse,
  buildEventInsert,
  isPastDate,
} from './eventSerializer.js';

const router = Router();

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
