import { Hono } from 'hono';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const app = new Hono();

// In packaged mode, HOMELIFE_PYTHON is set by main.ts.
// In dev mode, fall back to the repo's .venv.
const REPO_ROOT = resolve(process.cwd(), '..');

function getPython(): string {
  if (process.env.HOMELIFE_PYTHON) return process.env.HOMELIFE_PYTHON;
  const isWindows = process.platform === 'win32';
  const bin = isWindows ? 'python.exe' : 'python';
  return resolve(REPO_ROOT, '.venv', isWindows ? 'Scripts' : 'bin', bin);
}

function getDaemonSrc(): string {
  return process.env.HOMELIFE_DAEMON_SRC || REPO_ROOT;
}

interface DeviceResult {
  cameras: { index: number; name: string }[];
  audio: { id: string; name: string }[];
  error?: string;
}

// Simple in-process cache (30s TTL) so repeated opens of Settings don't re-spawn
let cache: { data: DeviceResult; ts: number } | null = null;
const CACHE_TTL = 30_000;

function runDevices(): Promise<DeviceResult> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return Promise.resolve(cache.data);
  }

  const python = getPython();
  if (!existsSync(python)) {
    return Promise.resolve({
      cameras: [],
      audio: [],
      error: 'Python venv not found. Run: uv sync',
    });
  }

  return new Promise((resolve_fn) => {
    const daemonSrc = getDaemonSrc();
    const script = resolve(daemonSrc, 'daemon', 'devices.py');
    const proc = spawn(python, [script], {
      cwd: daemonSrc,
      env: { ...process.env, PYTHONPATH: daemonSrc },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      resolve_fn({ cameras: [], audio: [], error: 'Device enumeration timed out' });
    }, 15_000);

    proc.on('close', () => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(stdout) as DeviceResult;
        cache = { data, ts: Date.now() };
        resolve_fn(data);
      } catch {
        resolve_fn({
          cameras: [],
          audio: [],
          error: stderr.slice(0, 300) || 'Failed to parse device list',
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve_fn({ cameras: [], audio: [], error: err.message });
    });
  });
}

app.get('/', async (c) => {
  const result = await runDevices();
  return c.json(result);
});

export default app;
