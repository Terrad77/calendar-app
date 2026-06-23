import { NextFunction, Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { calendarEvents, eventParticipants } from '../schema.js';
import { TokenPayload } from '../types/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      eventAccess?: {
        event: typeof calendarEvents.$inferSelect;
        participantStatus: (typeof eventParticipants.$inferSelect)['status'] | null;
        isOwner: boolean;
      };
    }
  }
}

export const checkEventAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user as TokenPayload | undefined;
    const userId = user?.userId;
    const eventId = req.params.eventId || req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    if (!eventId) {
      res.status(400).json({ error: 'Validation error', message: 'Missing event id' });
      return;
    }

    const db = getDb();
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event) {
      res.status(404).json({ error: 'Not found', message: 'Event not found' });
      return;
    }

    const [participant] = await db
      .select({ status: eventParticipants.status })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)))
      .limit(1);

    const isOwner = event.userId === userId;

    // A participant who declined the invitation must not retain access. Respond
    // exactly like a missing event (404) so the event's existence isn't leaked.
    if (!isOwner && participant?.status === 'declined') {
      res.status(404).json({ error: 'Not found', message: 'Event not found' });
      return;
    }

    const hasAccess = isOwner || Boolean(participant);

    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this event' });
      return;
    }

    req.eventAccess = {
      event,
      participantStatus: participant?.status ?? null,
      isOwner,
    };

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authorization error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
