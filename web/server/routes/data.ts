import { Hono } from 'hono';
import { getDb, getWriteDb, DB_PATH } from '../db.js';
import { statSync } from 'node:fs';

const app = new Hono();

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

const EXPORT_TABLES = [
  'frames',
  'summaries',
  'events',
  'chat_messages',
  'memos',
  'reports',
  'activity_mappings',
];

const IMPORT_TABLES = [
  'frames',
  'summaries',
  'events',
  'chat_messages',
  'memos',
  'reports',
];

// Tables that have a timestamp column for dedup
const TIMESTAMP_TABLES = new Set([
  'frames',
  'summaries',
  'events',
  'chat_messages',
]);

// GET /api/data/stats
app.get('/stats', (c) => {
  const db = getDb();

  const counts: Record<string, number> = {};
  const allTables = [
    ...EXPORT_TABLES,
    'window_events',
    'knowledge',
  ];

  for (const table of allTables) {
    try {
      const row = db
        .prepare(`SELECT COUNT(*) as count FROM ${table}`)
        .get() as { count: number };
      counts[table] = row.count;
    } catch {
      counts[table] = 0;
    }
  }

  // Date range
  let firstDate = '';
  let lastDate = '';
  try {
    const first = db
      .prepare('SELECT MIN(timestamp) as ts FROM frames')
      .get() as { ts: string | null };
    const last = db
      .prepare('SELECT MAX(timestamp) as ts FROM frames')
      .get() as { ts: string | null };
    firstDate = first?.ts || '';
    lastDate = last?.ts || '';
  } catch {
    /* empty */
  }

  // DB file size
  let dbSize = 0;
  try {
    dbSize = statSync(DB_PATH).size;
  } catch {
    /* empty */
  }

  return c.json({
    counts,
    firstDate,
    lastDate,
    dbSizeBytes: dbSize,
  });
});

// GET /api/data/export/:table?format=csv|json
app.get('/export/:table', (c) => {
  const table = c.req.param('table');
  if (!EXPORT_TABLES.includes(table)) {
    return c.json({ error: 'invalid table' }, 400);
  }

  const format = c.req.query('format') || 'csv';
  const db = getDb();

  const rows = db
    .prepare(`SELECT * FROM ${table} ORDER BY rowid`)
    .all() as Record<string, unknown>[];

  const filename = `${table}-all.${format === 'json' ? 'json' : 'csv'}`;

  if (format === 'json') {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// POST /api/data/import/:table
app.post('/import/:table', async (c) => {
  const table = c.req.param('table');
  if (!IMPORT_TABLES.includes(table)) {
    return c.json({ error: 'invalid table' }, 400);
  }

  const contentType = c.req.header('content-type') || '';
  let csvText = '';

  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'file required' }, 400);
    }
    csvText = await file.text();
  } else {
    csvText = await c.req.text();
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return c.json({ error: 'no data in CSV' }, 400);
  }

  const db = getWriteDb();

  // Get existing columns for the table
  const tableInfo = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string; pk: number }[];
  const validColumns = new Set(tableInfo.map((col) => col.name));

  // Filter CSV columns to only valid ones, skip 'id' (auto-increment PK)
  const csvColumns = Object.keys(rows[0]).filter(
    (col) => validColumns.has(col) && col !== 'id',
  );

  if (csvColumns.length === 0) {
    return c.json({ error: 'no matching columns found' }, 400);
  }

  const hasTimestamp = TIMESTAMP_TABLES.has(table) && csvColumns.includes('timestamp');

  const placeholders = csvColumns.map(() => '?').join(', ');
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${table} (${csvColumns.join(', ')}) VALUES (${placeholders})`,
  );

  // For timestamp-based dedup
  const checkTimestamp = hasTimestamp
    ? db.prepare(`SELECT 1 FROM ${table} WHERE timestamp = ?`)
    : null;

  let imported = 0;
  let skipped = 0;

  const tx = db.transaction(() => {
    for (const row of rows) {
      // Dedup by timestamp for applicable tables
      if (checkTimestamp && row.timestamp) {
        const exists = checkTimestamp.get(row.timestamp);
        if (exists) {
          skipped++;
          continue;
        }
      }

      const values = csvColumns.map((col) => {
        const v = row[col];
        return v === '' ? null : v;
      });
      const result = insert.run(...values);
      if (result.changes > 0) {
        imported++;
      } else {
        skipped++;
      }
    }
  });

  try {
    tx();
  } catch (e) {
    return c.json({ error: `Import failed: ${e}` }, 500);
  }

  return c.json({ imported, skipped, total: rows.length });
});

export default app;
