import { and, eq } from 'drizzle-orm';
import { getDb } from '../db.js';
import { calendarShares } from '../schema.js';

// Resolves whether `actingUserId` may create/modify events that belong to
// `targetOwnerId`'s calendar. Used when a user acts on a calendar shared with
// them (see calendarShares.permission) rather than on their own calendar.
//
// Returns the effective owner id to persist the event under:
// - no target specified -> acting user's own calendar (default behavior)
// - target specified and acting user IS the target -> acting user's own calendar
// - target specified, acting user has 'write' share -> target owner's calendar
// - target specified, no share or 'read'-only share -> null (caller must reject)
export async function resolveCalendarWriteTarget(
  actingUserId: string,
  targetOwnerId?: string | null
): Promise<{ ownerId: string } | { error: 'forbidden' | 'not_shared' }> {
  if (!targetOwnerId || targetOwnerId === actingUserId) {
    return { ownerId: actingUserId };
  }

  const db = getDb();
  const [share] = await db
    .select({ permission: calendarShares.permission })
    .from(calendarShares)
    .where(
      and(eq(calendarShares.ownerId, targetOwnerId), eq(calendarShares.sharedWithId, actingUserId))
    )
    .limit(1);

  if (!share) {
    return { error: 'not_shared' };
  }

  if (share.permission !== 'write') {
    return { error: 'forbidden' };
  }

  return { ownerId: targetOwnerId };
}
