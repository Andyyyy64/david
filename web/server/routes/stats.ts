import { Hono } from 'hono';
import { getDb } from '../db.js';
import { getMetaCategory } from './activities.js';

const app = new Hono();

// GET /api/stats?date=YYYY-MM-DD
app.get('/', (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date required' }, 400);

  const db = getDb();
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  const frameCount = db
    .prepare('SELECT COUNT(*) as count FROM frames WHERE timestamp BETWEEN ? AND ?')
    .get(start, end) as { count: number };

  const eventCount = db
    .prepare('SELECT COUNT(*) as count FROM events WHERE timestamp BETWEEN ? AND ?')
    .get(start, end) as { count: number };

  const summaryCount = db
    .prepare('SELECT COUNT(*) as count FROM summaries WHERE timestamp BETWEEN ? AND ?')
    .get(start, end) as { count: number };

  const avgMotion = db
    .prepare('SELECT AVG(motion_score) as avg FROM frames WHERE timestamp BETWEEN ? AND ?')
    .get(start, end) as { avg: number | null };

  const avgBrightness = db
    .prepare('SELECT AVG(brightness) as avg FROM frames WHERE timestamp BETWEEN ? AND ?')
    .get(start, end) as { avg: number | null };

  // Hourly activity (frames per hour)
  const hourly = db
    .prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
       FROM frames WHERE timestamp BETWEEN ? AND ?
       GROUP BY hour ORDER BY hour`,
    )
    .all(start, end) as { hour: number; count: number }[];

  // Fill in all 24 hours
  const activity = Array.from({ length: 24 }, (_, i) => {
    const found = hourly.find((h) => h.hour === i);
    return found ? found.count : 0;
  });

  return c.json({
    date,
    frames: frameCount.count,
    events: eventCount.count,
    summaries: summaryCount.count,
    avgMotion: avgMotion.avg ?? 0,
    avgBrightness: avgBrightness.avg ?? 0,
    activity,
  });
});

// GET /api/stats/activities?date=YYYY-MM-DD
app.get('/activities', (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date required' }, 400);

  const db = getDb();
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  // Get frame interval to estimate duration (default 30s)
  const intervalRow = db
    .prepare(
      `SELECT MIN(julianday(t2.timestamp) - julianday(t1.timestamp)) * 86400 as interval_sec
       FROM frames t1, frames t2
       WHERE t1.timestamp BETWEEN ? AND ? AND t2.timestamp BETWEEN ? AND ?
         AND t2.rowid = t1.rowid + 1`,
    )
    .get(start, end, start, end) as { interval_sec: number | null } | undefined;
  const frameDuration = intervalRow?.interval_sec && intervalRow.interval_sec > 0
    ? Math.round(intervalRow.interval_sec)
    : 30;

  // Activity totals
  const activityRows = db
    .prepare(
      `SELECT activity, COUNT(*) as frame_count
       FROM frames WHERE timestamp BETWEEN ? AND ? AND activity != ''
       GROUP BY activity ORDER BY frame_count DESC`,
    )
    .all(start, end) as { activity: string; frame_count: number }[];

  const activities = activityRows.map((r) => ({
    activity: r.activity,
    frameCount: r.frame_count,
    durationSec: r.frame_count * frameDuration,
  }));

  // Hourly breakdown
  const hourlyRows = db
    .prepare(
      `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour,
              activity, COUNT(*) as frame_count
       FROM frames WHERE timestamp BETWEEN ? AND ? AND activity != ''
       GROUP BY hour, activity ORDER BY hour, frame_count DESC`,
    )
    .all(start, end) as { hour: number; activity: string; frame_count: number }[];

  const hourly = hourlyRows.map((r) => ({
    hour: r.hour,
    activity: r.activity,
    frameCount: r.frame_count,
    durationSec: r.frame_count * frameDuration,
  }));

  return c.json({ activities, hourly });
});

// GET /api/stats/dates
app.get('/dates', (c) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT DISTINCT date(timestamp) as d FROM frames ORDER BY d DESC')
    .all() as { d: string }[];

  return c.json(rows.map((r) => r.d));
});

// GET /api/stats/range?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns per-day stats for a date range (for weekly/monthly views)
app.get('/range', (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  if (!from || !to) return c.json({ error: 'from and to required' }, 400);

  const db = getDb();
  const start = `${from}T00:00:00`;
  const end = `${to}T23:59:59`;

  // Per-day frame counts
  const dailyFrames = db
    .prepare(
      `SELECT date(timestamp) as d, COUNT(*) as frame_count
       FROM frames WHERE timestamp BETWEEN ? AND ?
       GROUP BY d ORDER BY d`,
    )
    .all(start, end) as { d: string; frame_count: number }[];

  // Per-day activity breakdown
  const dailyActivities = db
    .prepare(
      `SELECT date(timestamp) as d, activity, COUNT(*) as frame_count
       FROM frames WHERE timestamp BETWEEN ? AND ? AND activity != ''
       GROUP BY d, activity ORDER BY d, frame_count DESC`,
    )
    .all(start, end) as { d: string; activity: string; frame_count: number }[];

  // Per-day meta-category breakdown
  const metaByDay: Record<string, Record<string, number>> = {};
  for (const row of dailyActivities) {
    if (!metaByDay[row.d]) metaByDay[row.d] = {};
    const meta = getMetaCategory(row.activity);
    metaByDay[row.d][meta] = (metaByDay[row.d][meta] || 0) + row.frame_count;
  }

  // Estimate frame interval
  const intervalRow = db
    .prepare(
      `SELECT MIN(julianday(t2.timestamp) - julianday(t1.timestamp)) * 86400 as interval_sec
       FROM frames t1, frames t2
       WHERE t1.timestamp BETWEEN ? AND ? AND t2.timestamp BETWEEN ? AND ?
         AND t2.rowid = t1.rowid + 1`,
    )
    .get(start, end, start, end) as { interval_sec: number | null } | undefined;
  const frameDuration = intervalRow?.interval_sec && intervalRow.interval_sec > 0
    ? Math.round(intervalRow.interval_sec)
    : 30;

  const days = dailyFrames.map((df) => {
    const activities: Record<string, number> = {};
    for (const da of dailyActivities.filter((a) => a.d === df.d)) {
      activities[da.activity] = da.frame_count * frameDuration;
    }
    return {
      date: df.d,
      frameCount: df.frame_count,
      totalSec: df.frame_count * frameDuration,
      activities,
      metaCategories: metaByDay[df.d] || {},
    };
  });

  // Totals across range
  const totalFrames = days.reduce((s, d) => s + d.frameCount, 0);
  const activityTotals: Record<string, number> = {};
  const metaTotals: Record<string, number> = {};
  for (const day of days) {
    for (const [act, sec] of Object.entries(day.activities)) {
      activityTotals[act] = (activityTotals[act] || 0) + sec;
    }
    for (const [meta, count] of Object.entries(day.metaCategories)) {
      metaTotals[meta] = (metaTotals[meta] || 0) + count;
    }
  }

  return c.json({
    from,
    to,
    frameDuration,
    totalFrames,
    totalSec: totalFrames * frameDuration,
    days,
    activityTotals,
    metaTotals,
  });
});

export default app;
