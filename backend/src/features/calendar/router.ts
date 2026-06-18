import { Router, Request, Response } from 'express';
import { and, eq, ne, or, sql, getTableColumns } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getDb } from '../../db.js';
import { calendarEvents, calendarShares, eventParticipants, users } from '../../schema.js';
import {
  inviteUser,
  listPendingInvitations,
  respondToInvitation,
} from '../../controllers/invitationController.js';
import { sendApiError, sendApiResponse } from '../../utils/apiResponse.js';
import { toEventResponse } from '../events/eventSerializer.js';

const router = Router();

// GET /api/calendar/my-events
// Aggregate calendar view: events the user owns or participates in,
// plus events from calendars shared with the user.
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

    // Dedupe by event id: a user can be both a participant of an event and have
    // its owner's calendar shared with them, so the same event reaches both
    // branches. The ownEvents (participant) version wins — it carries full
    // details and participantStatus, whereas the shared version redacts private
    // events to "Busy".
    const eventsById = new Map<
      string,
      (typeof ownEvents)[number] | (typeof sharedEventArrays)[number][number]
    >();
    for (const ev of ownEvents) eventsById.set(ev.id, ev);
    for (const ev of sharedEventArrays.flat()) {
      if (!eventsById.has(ev.id)) eventsById.set(ev.id, ev);
    }
    const events = [...eventsById.values()];

    sendApiResponse(res, 200, { events }, { total: events.length });
  } catch (error) {
    console.error('Database Error:', error);
    sendApiError(res, 500, 'Failed to load calendar events');
  }
});

// Invitation routes
router.post('/:eventId/invite', authenticateToken, inviteUser);
router.get('/invitations/pending', authenticateToken, listPendingInvitations);
router.put('/invitations/:invitationId/respond', authenticateToken, respondToInvitation);

export default router;
