import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { calendarEvents } from '../schema.js';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/analytics/overview
 * Returns simple aggregated metrics for the dashboard
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const db = getDb();

    // Simple aggregations: active events (count), recurring rate, avg per day (last 7 days)
    const totalRes = await db.execute(sql`select count(*) as cnt from ${calendarEvents}`);
    const total = Number((totalRes as any).rows?.[0]?.cnt ?? (totalRes as any)[0]?.cnt ?? 0);

    const last7Res = await db.execute(
      sql`select count(*) as cnt from ${calendarEvents} where created_at >= now() - interval '7 days'`
    );
    const countLast7 = Number((last7Res as any).rows?.[0]?.cnt ?? (last7Res as any)[0]?.cnt ?? 0);
    const avgPerDay = Math.round(countLast7 / 7) || 0;

    const recurringRes = await db.execute(
      sql`select count(*) as cnt from ${calendarEvents} where is_recurring = true`
    );
    const recurring = Number(
      (recurringRes as any).rows?.[0]?.cnt ?? (recurringRes as any)[0]?.cnt ?? 0
    );

    const recurringRate = total > 0 ? Number(((recurring / total) * 100).toFixed(1)) : 0;

    res.json({
      activeEvents: total,
      avgPerDay,
      recurringRate,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get analytics overview' });
  }
});

/**
 * GET /api/analytics/trends
 * Returns simple daily counts for a date range (default last 14 days)
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const days = Number(req.query.days) || 14;

    // Simple raw query to return date and count per day
    const rows = await db.execute(sql`
      select date(created_at) as date, count(*) as value
      from ${calendarEvents}
      where created_at >= now() - interval '${days} days'
      group by date(created_at)
      order by date(created_at) asc
    `);

    // db.execute may return { rows } depending on driver
    // normalize to array of { date, value }
    const result = (rows as any).rows || rows;

    res.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics trends error:', error);
    res.status(500).json({ error: 'Failed to get analytics trends' });
  }
});

export default router;
