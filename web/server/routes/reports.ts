import { Hono } from 'hono';
import { getDb } from '../db.js';

const app = new Hono();

// GET /api/reports?date=YYYY-MM-DD — get report for a specific date
app.get('/', (c) => {
  const date = c.req.query('date');
  const db = getDb();

  if (date) {
    const row = db
      .prepare('SELECT * FROM reports WHERE date = ?')
      .get(date) as Record<string, unknown> | undefined;
    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json(row);
  }

  // List recent reports
  const limit = parseInt(c.req.query('limit') || '30');
  const rows = db
    .prepare('SELECT * FROM reports ORDER BY date DESC LIMIT ?')
    .all(limit);
  return c.json(rows);
});

export default app;
