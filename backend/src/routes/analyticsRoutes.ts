import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { calendarEvents } from '../schema.js';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/analytics/overview
 * Returns simple aggregated metrics for the dashboard
 */
router.get('/overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let total = 0;
    let countLast7 = 0;
    let recurring = 0;

    const dedupe =
      String(req.query.dedupe || '0') === '1' || String(req.query.dedupe || '0') === 'true';

    if (dedupe) {
      const totalRes = await db.execute(
        sql`
          select count(*) as cnt from (
            select lower(trim(title)) as t, date(start_date) as d
            from ${calendarEvents}
            where user_id = ${userId}
            group by lower(trim(title)), date(start_date)
          ) as sub
        `
      );
      total = Number((totalRes as any).rows?.[0]?.cnt ?? (totalRes as any)[0]?.cnt ?? 0);

      const last7Res = await db.execute(
        sql`
          select count(*) as cnt from (
            select lower(trim(title)) as t, date(start_date) as d
            from ${calendarEvents}
            where user_id = ${userId} and date(start_date) >= current_date - interval '7 days'
            group by lower(trim(title)), date(start_date)
          ) as sub
        `
      );
      countLast7 = Number((last7Res as any).rows?.[0]?.cnt ?? (last7Res as any)[0]?.cnt ?? 0);

      const recurringRes = await db.execute(
        sql`
          select count(*) as cnt from (
            select lower(trim(title)) as t, date(start_date) as d
            from ${calendarEvents}
            where user_id = ${userId} and is_recurring = true
            group by lower(trim(title)), date(start_date)
          ) as sub
        `
      );
      recurring = Number(
        (recurringRes as any).rows?.[0]?.cnt ?? (recurringRes as any)[0]?.cnt ?? 0
      );
    } else {
      const totalRes = await db.execute(
        sql`select count(distinct id) as cnt from ${calendarEvents} where user_id = ${userId}`
      );
      total = Number((totalRes as any).rows?.[0]?.cnt ?? (totalRes as any)[0]?.cnt ?? 0);

      const last7Res = await db.execute(
        sql`select count(distinct id) as cnt from ${calendarEvents} where user_id = ${userId} and date(start_date) >= current_date - interval '7 days'`
      );
      countLast7 = Number((last7Res as any).rows?.[0]?.cnt ?? (last7Res as any)[0]?.cnt ?? 0);

      const recurringRes = await db.execute(
        sql`select count(distinct id) as cnt from ${calendarEvents} where user_id = ${userId} and is_recurring = true`
      );
      recurring = Number(
        (recurringRes as any).rows?.[0]?.cnt ?? (recurringRes as any)[0]?.cnt ?? 0
      );
    }

    const avgPerDay = Math.round(countLast7 / 7) || 0;
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
router.get('/trends', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const days = Math.max(Number(req.query.days) || 14, 1);

    // Compute an inclusive date window in UTC so the chart always has a full series.
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const startDate = start.toISOString().slice(0, 10);

    const rows = await db.execute(sql`
      select date(start_date) as date, count(*) as value
      from ${calendarEvents}
      where user_id = ${userId} and date(start_date) >= ${startDate}
      group by date(start_date)
      order by date(start_date) asc
    `);

    const result = (rows as any).rows || rows;

    const countsByDate = new Map<string, number>();
    for (const row of result as Array<{ date?: string; value?: number | string }>) {
      if (row?.date) {
        countsByDate.set(row.date, Number(row.value) || 0);
      }
    }

    const fullSeries: Array<{ date: string; value: number }> = [];
    const cursor = new Date(start);
    for (let index = 0; index < days; index += 1) {
      const date = cursor.toISOString().slice(0, 10);
      fullSeries.push({ date, value: countsByDate.get(date) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    res.json(fullSeries);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics trends error:', error);
    res.status(500).json({ error: 'Failed to get analytics trends' });
  }
});

/**
 * GET /api/analytics/events
 * Drilldown: list events for a given date (YYYY-MM-DD)
 */
router.get('/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
      return;
    }

    const rows = await db.execute(sql`
      select id, user_id as "userId", event_type as "eventType", title, description, start_date as "startDate", end_date as "endDate", is_recurring as "isRecurring", created_at as "createdAt"
      from ${calendarEvents}
      where user_id = ${userId} and date(start_date) = ${date}
      order by created_at desc
      limit 200
    `);

    const result = (rows as any).rows || rows;
    res.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * GET /api/analytics/export
 * Export events for a given date (CSV)
 */
router.get('/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
      return;
    }

    const rows = await db.execute(sql`
      select id, user_id as "userId", event_type as "eventType", title, description, start_date as "startDate", end_date as "endDate", is_recurring as "isRecurring", created_at as "createdAt"
      from ${calendarEvents}
      where user_id = ${userId} and date(start_date) = ${date}
      order by created_at desc
      limit 1000
    `);

    const data = (rows as any).rows || rows;

    // Build CSV
    const header = [
      'id',
      'userId',
      'eventType',
      'title',
      'description',
      'startDate',
      'endDate',
      'isRecurring',
      'createdAt',
    ];
    const csv = [header.join(',')]
      .concat(
        data.map((r: any) =>
          header
            .map((h) => {
              const v = r[h] ?? '';
              if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
              return String(v);
            })
            .join(',')
        )
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="events-${date}.csv"`);
    res.send(csv);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Analytics export error:', error);
    res.status(500).json({ error: 'Failed to export events' });
  }
});

// DEBUG endpoints: register only in non-production or when DEBUG_API=1
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_API === '1') {
  // DEBUG: return all events (no auth) - for local development only
  router.get('/debug/all', async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.execute(
        sql`select id, user_id as "userId", title, event_type as "eventType", start_date as "startDate", end_date as "endDate", created_at as "createdAt" from ${calendarEvents} order by created_at asc limit 1000`
      );
      const data = (rows as any).rows || rows;
      res.json({ total: data.length, rows: data });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Analytics debug all error:', error);
      res.status(500).json({ error: 'Failed to dump events' });
    }
  });

  // DEBUG: counts per user
  router.get('/debug/counts-by-user', async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.execute(
        sql`select user_id as "userId", count(*) as cnt from ${calendarEvents} group by user_id order by cnt desc`
      );
      const data = (rows as any).rows || rows;
      res.json({ rows: data });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Analytics debug counts error:', error);
      res.status(500).json({ error: 'Failed to get counts' });
    }
  });
} else {
  // In production these debug routes are not registered
}

export default router;
