import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { getDb } from '../../db.js';
import { calendarEvents } from '../../schema.js';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = Router();

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
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get analytics overview' });
  }
});

router.get('/trends', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const days = Math.max(Number(req.query.days) || 14, 1);

    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);

    const start = new Date(end);
    if (days === 7) {
      const currentWeekday = start.getUTCDay();
      const mondayOffset = currentWeekday === 0 ? 6 : currentWeekday - 1;
      start.setUTCDate(start.getUTCDate() - mondayOffset);
    } else {
      start.setUTCDate(start.getUTCDate() - (days - 1));
    }
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
    console.error('Analytics trends error:', error);
    res.status(500).json({ error: 'Failed to get analytics trends' });
  }
});

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
    console.error('Analytics events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

router.get('/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Optional date filter: a valid YYYY-MM-DD narrows the export to a single
    // day; with no date param all of the user's events are exported.
    const date = String(req.query.date || '');
    const hasDate = date.length > 0;
    if (hasDate && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
      return;
    }

    const rows = hasDate
      ? await db.execute(sql`
			select id, user_id as "userId", event_type as "eventType", title, description, start_date as "startDate", end_date as "endDate", is_recurring as "isRecurring", created_at as "createdAt"
			from ${calendarEvents}
			where user_id = ${userId} and date(start_date) = ${date}
			order by created_at desc
			limit 1000
		`)
      : await db.execute(sql`
			select id, user_id as "userId", event_type as "eventType", title, description, start_date as "startDate", end_date as "endDate", is_recurring as "isRecurring", created_at as "createdAt"
			from ${calendarEvents}
			where user_id = ${userId}
			order by created_at desc
			limit 1000
		`);

    const data = (rows as any).rows || rows;
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
    // Semicolon delimiter so spreadsheet apps (Excel) parse columns correctly in
    // locales that reserve the comma as a decimal separator.
    const csv = [header.join(';')]
      .concat(
        data.map((r: any) =>
          header
            .map((h) => {
              const v = r[h] ?? '';
              if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
              return String(v);
            })
            .join(';')
        )
      )
      .join('\n');

    const filename = hasDate ? `events-${date}.csv` : 'analytics.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Prefix with a UTF-8 BOM so Excel detects the encoding and renders
    // non-ASCII characters (e.g. Cyrillic titles) correctly.
    res.send('﻿' + csv);
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ error: 'Failed to export events' });
  }
});

router.get('/export-xlsx', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Query mode: no params = all events; from+to = inclusive range; a single
    // date = that day. Validate any provided date param before use.
    const date = String(req.query.date || '');
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

    if (date && !isDate(date)) {
      res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
      return;
    }
    if ((from || to) && (!isDate(from) || !isDate(to))) {
      res.status(400).json({ error: 'Invalid range, expected from and to as YYYY-MM-DD' });
      return;
    }

    const baseSelect = sql`
			select id, event_type as "eventType", title, description, start_date as "startDate", end_date as "endDate", is_recurring as "isRecurring", created_at as "createdAt"
			from ${calendarEvents}
		`;

    let rows;
    if (from && to) {
      rows = await db.execute(sql`
				${baseSelect}
				where user_id = ${userId} and date(start_date) >= ${from} and date(start_date) <= ${to}
				order by created_at desc
				limit 5000
			`);
    } else if (date) {
      rows = await db.execute(sql`
				${baseSelect}
				where user_id = ${userId} and date(start_date) = ${date}
				order by created_at desc
				limit 5000
			`);
    } else {
      rows = await db.execute(sql`
				${baseSelect}
				where user_id = ${userId}
				order by created_at desc
				limit 5000
			`);
    }

    const data = (rows as any).rows || rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CalendAir Analytics');
    worksheet.columns = [
      { header: 'id', key: 'id' },
      { header: 'title', key: 'title' },
      { header: 'eventType', key: 'eventType' },
      { header: 'description', key: 'description' },
      { header: 'startDate', key: 'startDate' },
      { header: 'endDate', key: 'endDate' },
      { header: 'isRecurring', key: 'isRecurring' },
      { header: 'createdAt', key: 'createdAt' },
    ];

    const thinBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    };

    // Header row: navy fill, bold white text, centered, bordered.
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Data rows: alternating fill (even = light blue, odd = white).
    for (const record of data as Array<Record<string, unknown>>) {
      const row = worksheet.addRow({
        id: record.id ?? '',
        title: record.title ?? '',
        eventType: record.eventType ?? '',
        description: record.description ?? '',
        startDate: record.startDate ?? '',
        endDate: record.endDate ?? '',
        isRecurring: record.isRecurring ?? '',
        createdAt: record.createdAt ?? '',
      });
      const isEven = row.number % 2 === 0;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFF0F4F8' : 'FFFFFFFF' },
        };
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = thinBorder;
      });
    }

    // Auto column widths from the longest cell content, clamped to [12, 40].
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const length = cell.value == null ? 0 : String(cell.value).length;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(40, Math.max(12, maxLength + 2));
    });

    // Freeze the header row so it stays visible while scrolling.
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.xlsx"');
    res.send(await workbook.xlsx.writeBuffer());
  } catch (error) {
    console.error('Analytics export-xlsx error:', error);
    res.status(500).json({ error: 'Failed to export events' });
  }
});

// GET /api/analytics/month-pulse
// Returns per-day event counts for the current calendar month.
// Response: Array<{ day: number; value: number }>
router.get('/month-pulse', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(year, month, daysInMonth)).toISOString().slice(0, 10);

    const rows = await db.execute(sql`
			select extract(day from start_date::timestamp)::int as day, count(*) as value
			from ${calendarEvents}
			where user_id = ${userId}
				and date(start_date) >= ${startDate}
				and date(start_date) <= ${endDate}
			group by extract(day from start_date::timestamp)
			order by extract(day from start_date::timestamp) asc
		`);

    const result = (rows as any).rows || rows;
    const countsByDay = new Map<number, number>();
    for (const row of result as Array<{ day?: number | string; value?: number | string }>) {
      if (row?.day != null) {
        countsByDay.set(Number(row.day), Number(row.value) || 0);
      }
    }

    const series = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return { day, value: countsByDay.get(day) ?? 0 };
    });

    res.json(series);
  } catch (error) {
    console.error('Analytics month-pulse error:', error);
    res.status(500).json({ error: 'Failed to get month pulse data' });
  }
});

if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_API === '1') {
  router.get('/debug/all', async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.execute(
        sql`select id, user_id as "userId", title, event_type as "eventType", start_date as "startDate", end_date as "endDate", created_at as "createdAt" from ${calendarEvents} order by created_at asc limit 1000`
      );
      const data = (rows as any).rows || rows;
      res.json({ total: data.length, rows: data });
    } catch (error) {
      console.error('Analytics debug all error:', error);
      res.status(500).json({ error: 'Failed to dump events' });
    }
  });

  router.get('/debug/counts-by-user', async (_req: Request, res: Response) => {
    try {
      const db = getDb();
      const rows = await db.execute(
        sql`select user_id as "userId", count(*) as cnt from ${calendarEvents} group by user_id order by cnt desc`
      );
      const data = (rows as any).rows || rows;
      res.json({ rows: data });
    } catch (error) {
      console.error('Analytics debug counts error:', error);
      res.status(500).json({ error: 'Failed to get counts' });
    }
  });
}

export default router;
