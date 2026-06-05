import { Request, Response } from 'express';
import { calendarEvents, eventParticipants, notifications, users } from '../schema.js';
import { eq } from 'drizzle-orm';
import { TokenPayload } from '../types/auth.types.js';
import { and, desc } from 'drizzle-orm';
import { getDb } from '../db.js';
import { sendApiError, sendApiResponse } from '../utils/apiResponse.js';

type InvitationStatus = 'pending' | 'accepted' | 'declined';

type InvitationRecord = {
  id: string;
  eventId: string;
  userId: string;
  title: string;
  startDate: string;
  startTime: string | null;
  organizerEmail: string;
  status: InvitationStatus;
  invitedAt: Date;
  updatedAt: Date;
};

// Helper function to map database rows to InvitationRecord
const toInvitationRecord = (row: any): InvitationRecord => {
  if (!row.id) throw new Error('Database integrity violation: id is null');

  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    title: row.title,
    startDate: row.startDate,
    startTime: row.startTime,
    organizerEmail: row.organizerEmail,
    status: row.status as InvitationStatus,
    invitedAt: row.invitedAt,
    updatedAt: row.updatedAt,
  } as InvitationRecord;
};

// Helper function to get the current authenticated user's ID from the request
const getCurrentUserId = (req: Request): string | null => {
  const user = req.user as TokenPayload | undefined;
  return user?.userId || null;
};

// Helper function to load an invitation by ID and user ID
const loadInvitationById = async (invitationId: string, userId: string) => {
  const db = getDb();

  const rows = await db
    .select({
      id: eventParticipants.id,
      eventId: eventParticipants.eventId,
      userId: eventParticipants.userId,
      title: calendarEvents.title,
      startDate: calendarEvents.startDate,
      startTime: calendarEvents.startTime,
      organizerEmail: users.email,
      status: eventParticipants.status,
      invitedAt: eventParticipants.invitedAt,
      updatedAt: eventParticipants.updatedAt,
    })
    .from(eventParticipants)
    .innerJoin(calendarEvents, eq(calendarEvents.id, eventParticipants.eventId))
    .innerJoin(users, eq(users.id, calendarEvents.userId))
    .where(and(eq(eventParticipants.id, invitationId), eq(eventParticipants.userId, userId)))
    .limit(1);

  // defensive programming: check if the row exists and has an id before mapping
  return rows[0] ? (rows[0] as unknown as InvitationRecord) : null;
};

// Controller functions for handling invitations
export const inviteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const { email } = req.body as { email?: string };
    const userId = getCurrentUserId(req);

    if (!userId) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    if (!eventId || !email) {
      sendApiError(res, 400, 'eventId and email are required');
      return;
    }

    const db = getDb();
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!event) {
      sendApiError(res, 404, 'Event not found');
      return;
    }

    if (event.userId !== userId) {
      sendApiError(res, 403, 'Only the event owner can invite participants');
      return;
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!targetUser) {
      sendApiError(res, 404, 'User not found');
      return;
    }

    if (targetUser.id === userId) {
      sendApiError(res, 400, 'You cannot invite yourself');
      return;
    }

    const [upserted] = await db
      .insert(eventParticipants)
      .values({
        eventId,
        userId: targetUser.id,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: [eventParticipants.eventId, eventParticipants.userId],
        set: {
          status: 'pending',
          invitedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    const invitation = upserted ? await loadInvitationById(upserted.id, targetUser.id) : null;

    // Create a notification for the invited user (best-effort; failure does not abort the invite)
    if (upserted) {
      try {
        const organizer = req.user as TokenPayload;
        await db.insert(notifications).values({
          userId: targetUser.id,
          type: 'INVITATION',
          title: `Invitation: ${event.title}`,
          message: `${organizer.email} invited you to "${event.title}" on ${event.startDate}.`,
          referenceId: upserted.id,
        });
      } catch (notifErr) {
        console.error('Failed to create invitation notification:', notifErr);
      }
    }

    sendApiResponse(
      res,
      201,
      {
        invitation,
      },
      {
        status: 'pending',
      }
    );
  } catch (error) {
    sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to create invitation');
  }
};

// Controller function to list pending invitations for the authenticated user
export const listPendingInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getCurrentUserId(req);

    if (!userId) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const db = getDb();

    const rows = await db
      .select({
        id: eventParticipants.id,
        eventId: eventParticipants.eventId,
        userId: eventParticipants.userId,
        title: calendarEvents.title,
        startDate: calendarEvents.startDate,
        startTime: calendarEvents.startTime,
        organizerEmail: users.email,
        status: eventParticipants.status,
        invitedAt: eventParticipants.invitedAt,
        updatedAt: eventParticipants.updatedAt,
      })
      .from(eventParticipants)
      .innerJoin(calendarEvents, eq(calendarEvents.id, eventParticipants.eventId))
      .innerJoin(users, eq(users.id, calendarEvents.userId))
      .where(and(eq(eventParticipants.userId, userId), eq(eventParticipants.status, 'pending')))
      .orderBy(desc(eventParticipants.invitedAt));

    sendApiResponse(
      res,
      200,
      {
        invitations: rows.map(toInvitationRecord),
      },
      {
        total: rows.length,
      }
    );
  } catch (error) {
    sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to load invitations');
  }
};

// Controller function to respond to an invitation (accept or decline)
export const respondToInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getCurrentUserId(req);
    const invitationId = req.params.invitationId;
    const { status } = req.body as { status?: InvitationStatus };

    if (!userId) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    if (!invitationId || !status) {
      sendApiError(res, 400, 'invitationId and status are required');
      return;
    }

    if (!['accepted', 'declined'].includes(status)) {
      sendApiError(res, 400, 'status must be accepted or declined');
      return;
    }

    const currentInvitation = await loadInvitationById(invitationId, userId);

    if (!currentInvitation) {
      sendApiError(res, 404, 'Invitation not found');
      return;
    }

    const db = getDb();
    const [updated] = await db
      .update(eventParticipants)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(eventParticipants.id, invitationId), eq(eventParticipants.userId, userId)))
      .returning();

    const invitation = updated ? await loadInvitationById(updated.id, userId) : currentInvitation;

    sendApiResponse(res, 200, { invitation });
  } catch (error) {
    sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to update invitation');
  }
};
