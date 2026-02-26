import { Hono } from 'hono';
import { getDb } from '../db.js';
import { getMetaCategory } from './activities.js';

interface RawFrame {
  id: number;
  timestamp: string;
  activity: string;
}

interface Session {
  activity: string;
  metaCategory: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  frameCount: number;
}

const app = new Hono();

// GET /api/sessions?date=YYYY-MM-DD
app.get('/', (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date required' }, 400);

  const db = getDb();
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  const frames = db
    .prepare(
      `SELECT id, timestamp, activity FROM frames
       WHERE timestamp BETWEEN ? AND ? AND activity != ''
       ORDER BY timestamp`,
    )
    .all(start, end) as RawFrame[];

  if (frames.length === 0) return c.json([]);

  // Estimate frame interval from data
  let intervalSec = 30;
  if (frames.length >= 2) {
    const t0 = new Date(frames[0].timestamp).getTime();
    const t1 = new Date(frames[1].timestamp).getTime();
    const diff = (t1 - t0) / 1000;
    if (diff > 0 && diff < 300) intervalSec = Math.round(diff);
  }

  // Group consecutive frames with same activity into sessions
  const sessions: Session[] = [];
  let sessionStart = frames[0];
  let sessionActivity = frames[0].activity;
  let frameCount = 1;

  for (let i = 1; i < frames.length; i++) {
    if (frames[i].activity === sessionActivity) {
      frameCount++;
    } else {
      // Close current session
      const startTime = sessionStart.timestamp;
      const endTime = frames[i - 1].timestamp;
      const durationSec = frameCount * intervalSec;
      sessions.push({
        activity: sessionActivity,
        metaCategory: getMetaCategory(sessionActivity),
        startTime,
        endTime,
        durationSec,
        frameCount,
      });
      // Start new session
      sessionStart = frames[i];
      sessionActivity = frames[i].activity;
      frameCount = 1;
    }
  }

  // Close last session
  sessions.push({
    activity: sessionActivity,
    metaCategory: getMetaCategory(sessionActivity),
    startTime: sessionStart.timestamp,
    endTime: frames[frames.length - 1].timestamp,
    durationSec: frameCount * intervalSec,
    frameCount,
  });

  return c.json(sessions);
});

export default app;
