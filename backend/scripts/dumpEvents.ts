import 'dotenv/config';
import { getDb } from '../src/db';

async function main() {
  try {
    const db = getDb();
    const rows = await db.execute(
      `select id, user_id, title, event_type, start_date, end_date, created_at from calendar_events order by created_at asc`
    );
    const data = (rows as any).rows || rows;
    console.log('total:', data.length);
    console.table(
      data.map((r: any) => ({
        id: r.id,
        userId: r.user_id || r.userId,
        title: r.title,
        type: r.event_type || r.eventType,
        startDate: r.start_date || r.startDate,
        createdAt: r.created_at || r.createdAt,
      }))
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
