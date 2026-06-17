import { Router, type Request, type Response } from 'express';
import { and, eq, or } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getDb } from '../../db.js';
import { calendarShares, notifications, users } from '../../schema.js';
import { sendApiError, sendApiResponse } from '../../utils/apiResponse.js';
import type { TokenPayload } from '../../types/auth.types.js';

const router = Router();

// POST /api/calendar/shares
// Body: { targetUserId, permissionLevel: 'read' | 'write' }
// Creates a calendarShares record (owner = current user, sharedWith = target).
// Also sends a SYSTEM notification to the target user.
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = req.user as TokenPayload | undefined;
    if (!actor) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const { targetUserId, permissionLevel } = req.body as {
      targetUserId?: string;
      permissionLevel?: 'read' | 'write';
    };

    if (!targetUserId) {
      sendApiError(res, 400, 'targetUserId is required');
      return;
    }

    if (targetUserId === actor.userId) {
      sendApiError(res, 400, 'Cannot share your calendar with yourself');
      return;
    }

    const level: 'read' | 'write' =
      permissionLevel === 'read' || permissionLevel === 'write' ? permissionLevel : 'read';

    const db = getDb();

    // Verify target user exists
    const [targetUser] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      sendApiError(res, 404, 'Target user not found');
      return;
    }

    // Upsert: update permission if share already exists
    const existing = await db
      .select()
      .from(calendarShares)
      .where(
        and(eq(calendarShares.ownerId, actor.userId), eq(calendarShares.sharedWithId, targetUserId))
      )
      .limit(1);

    let share;
    if (existing.length > 0) {
      [share] = await db
        .update(calendarShares)
        .set({ permission: level, updatedAt: new Date() })
        .where(eq(calendarShares.id, existing[0].id))
        .returning();
    } else {
      [share] = await db
        .insert(calendarShares)
        .values({ ownerId: actor.userId, sharedWithId: targetUserId, permission: level })
        .returning();

      // Notify the target user (best-effort)
      try {
        await db.insert(notifications).values({
          userId: targetUserId,
          type: 'SYSTEM',
          title: 'Calendar shared with you',
          message: `${actor.email} shared their calendar with you (${level} access).`,
          referenceId: share?.id ?? null,
        });
      } catch (notifErr) {
        console.error('Failed to create share notification:', notifErr);
      }
    }

    sendApiResponse(res, 201, { share });
  } catch (error) {
    sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to create share');
  }
});

// GET /api/calendar/shares
// Returns: { sharedByMe: [...], sharedWithMe: [...] }
// Each entry includes the other user's id and name.
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = req.user as TokenPayload | undefined;
    if (!actor) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const db = getDb();

    const rows = await db
      .select({
        id: calendarShares.id,
        ownerId: calendarShares.ownerId,
        sharedWithId: calendarShares.sharedWithId,
        permission: calendarShares.permission,
        createdAt: calendarShares.createdAt,
        ownerName: users.name,
      })
      .from(calendarShares)
      .leftJoin(
        users,
        or(
          and(eq(calendarShares.ownerId, actor.userId), eq(users.id, calendarShares.sharedWithId)),
          and(eq(calendarShares.sharedWithId, actor.userId), eq(users.id, calendarShares.ownerId))
        )
      )
      .where(
        or(eq(calendarShares.ownerId, actor.userId), eq(calendarShares.sharedWithId, actor.userId))
      );

    const sharedByMe = rows
      .filter((r) => r.ownerId === actor.userId)
      .map((r) => ({
        id: r.id,
        sharedWithId: r.sharedWithId,
        sharedWithName: r.ownerName,
        permission: r.permission,
        createdAt: r.createdAt,
      }));

    const sharedWithMe = rows
      .filter((r) => r.sharedWithId === actor.userId)
      .map((r) => ({
        id: r.id,
        ownerId: r.ownerId,
        ownerName: r.ownerName,
        permission: r.permission,
        createdAt: r.createdAt,
      }));

    sendApiResponse(res, 200, { sharedByMe, sharedWithMe });
  } catch (error) {
    sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to load shares');
  }
});

// DELETE /api/calendar/shares/:shareId
// Revokes a calendar share. Only the owner (who created the share) can revoke it.
// Sends a SYSTEM notification to the other party.
router.delete(
  '/:shareId',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = req.user as TokenPayload | undefined;
      if (!actor) {
        sendApiError(res, 401, 'User not authenticated');
        return;
      }

      const db = getDb();
      const { shareId } = req.params;

      const [existing] = await db
        .select()
        .from(calendarShares)
        .where(and(eq(calendarShares.id, shareId), eq(calendarShares.ownerId, actor.userId)))
        .limit(1);

      if (!existing) {
        sendApiError(res, 404, 'Share not found or you do not own it');
        return;
      }

      await db.delete(calendarShares).where(eq(calendarShares.id, shareId));

      // Notify the user whose access was revoked (best-effort)
      try {
        await db.insert(notifications).values({
          userId: existing.sharedWithId,
          type: 'SYSTEM',
          title: 'Calendar access revoked',
          message: `${actor.email} revoked your access to their calendar.`,
          referenceId: null,
        });
      } catch (notifErr) {
        console.error('Failed to create revoke notification:', notifErr);
      }

      sendApiResponse(res, 200, { message: 'Calendar share revoked' });
    } catch (error) {
      sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to delete share');
    }
  }
);

export default router;
