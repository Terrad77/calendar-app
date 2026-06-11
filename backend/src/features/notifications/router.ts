import { Router, type Request, type Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getDb } from '../../db.js';
import { notifications } from '../../schema.js';
import { sendApiError, sendApiResponse } from '../../utils/apiResponse.js';
import type { TokenPayload } from '../../types/auth.types.js';

const router = Router();

// GET /api/notifications
// Returns notifications for the authenticated user, newest first.
// Query param: ?unread=true  — return only unread notifications
// Response header: X-Unread-Count — total unread count across all user notifications
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as TokenPayload | undefined;
    if (!user) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const db = getDb();
    const unreadOnly = req.query.unread === 'true';

    const whereClause = unreadOnly
      ? and(eq(notifications.userId, user.userId), eq(notifications.isRead, false))
      : eq(notifications.userId, user.userId);

    const rows = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt));

    // When filtering unread only, all rows are unread; otherwise count from full result set
    const unreadCount = unreadOnly ? rows.length : rows.filter((r) => !r.isRead).length;

    res.setHeader('X-Unread-Count', String(unreadCount));
    sendApiResponse(res, 200, { notifications: rows }, { total: rows.length, unreadCount });
  } catch (error) {
    sendApiError(res, 500, error instanceof Error ? error.message : 'Failed to load notifications');
  }
});

// PATCH /api/notifications/:id/read
// Marks a single notification as read. Only the owning user can mark their own notifications.
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as TokenPayload | undefined;
    if (!user) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const db = getDb();
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, user.userId)))
      .returning();

    if (!updated) {
      sendApiError(res, 404, 'Notification not found');
      return;
    }

    sendApiResponse(res, 200, { notification: updated });
  } catch (error) {
    sendApiError(
      res,
      500,
      error instanceof Error ? error.message : 'Failed to update notification'
    );
  }
});

// DELETE /api/notifications/:id
// Removes a single notification. Only the owning user can delete their own notifications.
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as TokenPayload | undefined;
    if (!user) {
      sendApiError(res, 401, 'User not authenticated');
      return;
    }

    const db = getDb();
    const [deleted] = await db
      .delete(notifications)
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, user.userId)))
      .returning();

    if (!deleted) {
      sendApiError(res, 404, 'Notification not found');
      return;
    }

    sendApiResponse(res, 200, { notification: deleted });
  } catch (error) {
    sendApiError(
      res,
      500,
      error instanceof Error ? error.message : 'Failed to delete notification'
    );
  }
});

export default router;
