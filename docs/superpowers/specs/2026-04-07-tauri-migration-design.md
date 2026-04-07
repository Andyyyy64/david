# Electron to Tauri v2 Migration

## Goal

Replace Electron with Tauri v2 to eliminate Chromium bundling (~200MB → ~10MB), remove Node.js runtime dependency, and reduce process count from 3 to 2.

## Current Architecture

```
Electron main process
  ├─ spawns Python daemon (python -m daemon start)
  ├─ spawns Hono server (tsx server/index.ts)
  ├─ BrowserWindow → http://localhost:3001
  ├─ System tray (Open / Open in Browser / Quit)
  └─ Auto-updater (electron-updater → GitHub Releases)
```

Frontend talks to Hono via `fetch('/api/...')` (20 endpoints in `api.ts`). Media served at `/media/*`.

## Target Architecture

```
Tauri (Rust core process)
  ├─ spawns Python daemon via std::process::Command
  ├─ rusqlite + sqlite-vec (replaces Hono/better-sqlite3)
  ├─ Asset Protocol (replaces /media/* serving)
  ├─ ~20 #[tauri::command] functions (replaces Hono routes)
  ├─ System tray (TrayIconBuilder)
  └─ Auto-updater (tauri-plugin-updater)

WebView (OS native) → frontendDist (Vite build)
```

MJPEG live stream: frontend connects directly to daemon's port 3002.

## Migration Strategy: Two Phases

### Phase 1 — Tauri Shell (get it running)

Create `web/src-tauri/` alongside existing `web/electron/`. Tauri spawns Python daemon and Hono server as child processes, WebView loads `http://localhost:3001`. Zero frontend changes. This validates the Tauri setup works before touching the API layer.

### Phase 2 — Replace Hono with Rust

Migrate all Hono API routes to `#[tauri::command]` functions with `rusqlite`. Switch frontend `api.ts` from `fetch()` to `invoke()`. Enable Asset Protocol for media files. Remove Hono server, tsx, better-sqlite3, and all Node.js server dependencies.

## File Structure

```
web/src-tauri/
├── Cargo.toml              # rusqlite, sqlite-vec, serde, tauri + plugins
├── tauri.conf.json         # app config, build config, plugins, security
├── build.rs                # tauri build script
├── capabilities/
│   └── default.json        # permissions for commands, shell, tray, updater
├── icons/                  # app icons (generated via tauri icon)
└── src/
    ├── main.rs             # desktop entry point (boilerplate)
    ├── lib.rs              # tauri::Builder setup, plugin registration, tray
    ├── db.rs               # rusqlite connection pool, sqlite-vec loading
    ├── commands/
    │   ├── mod.rs
    │   ├── frames.rs       # get_frames, get_frame, get_latest_frame
    │   ├── stats.rs        # get_stats, get_activities, get_apps, get_focus, get_date_range
    │   ├── summaries.rs    # get_summaries
    │   ├── search.rs       # search_text, search_semantic
    │   ├── reports.rs      # get_report, list_reports
    │   ├── memos.rs        # get_memo, put_memo
    │   ├── sessions.rs     # get_sessions
    │   ├── events.rs       # get_events
    │   ├── chat.rs         # get_chat
    │   ├── context.rs      # get_context, put_context
    │   ├── rag.rs          # ask_rag (proxies to Python daemon)
    │   └── status.rs       # get_status
    └── process.rs          # Python daemon lifecycle (spawn, kill, health check)
```

## API Migration Map

Each Hono route becomes a Tauri command. Frontend `api.ts` changes from `fetch()` to `invoke()`:

| Hono Route | Tauri Command | Notes |
|---|---|---|
| GET /api/frames?date= | get_frames(date) | rusqlite query |
| GET /api/frames/:id | get_frame(id) | rusqlite query |
| GET /api/frames/latest | get_latest_frame() | rusqlite query |
| GET /api/stats?date= | get_stats(date) | rusqlite query |
| GET /api/stats/activities?date= | get_activities(date) | rusqlite query |
| GET /api/stats/apps?date= | get_apps(date) | rusqlite query |
| GET /api/stats/range?from=&to= | get_range_stats(from, to) | rusqlite query |
| GET /api/stats/dates | get_dates() | rusqlite query |
| GET /api/summaries?date=&scale= | get_summaries(date, scale) | rusqlite query |
| GET /api/events?date= | get_events(date) | rusqlite query |
| GET /api/sessions?date= | get_sessions(date) | rusqlite query |
| GET /api/reports?date= | get_report(date) | rusqlite query |
| GET /api/reports | list_reports() | rusqlite query |
| GET /api/activities | list_activities() | rusqlite query |
| GET /api/memos?date= | get_memo(date) | rusqlite query |
| PUT /api/memos | put_memo(date, content) | rusqlite write (only memos table needs write) |
| GET /api/context | get_context() | reads life.toml |
| PUT /api/context | put_context(content) | writes life.toml |
| GET /api/search?q= | search_text(q, from, to) | FTS5 query |
| POST /api/rag/ask | ask_rag(query, history) | HTTP call to Python daemon's RAG endpoint |
| GET /api/status | get_status() | check daemon process alive |
| GET /api/chat?date= | get_chat(date) | rusqlite query |
| GET /api/live/stream | N/A | frontend connects to port 3002 directly |
| GET /media/* | N/A | Asset Protocol (asset://localhost/...) |

## Frontend Changes

`web/src/lib/api.ts` — replace `fetchJson`/`putJson`/`postJson` with `invoke`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

export const api = {
  frames: {
    list: (date: string) => invoke<Frame[]>('get_frames', { date }),
    get: (id: number) => invoke<Frame>('get_frame', { id }),
    latest: () => invoke<Frame>('get_latest_frame'),
  },
  // ... same pattern for all endpoints
};

// Media URLs: components use convertFileSrc(absolutePath) instead of /media/...
```

Components referencing `/media/frames/...` or `/media/screens/...` switch to `convertFileSrc()`. Frame objects from the API will include absolute paths.

MJPEG `LiveFeed.tsx`: change source URL from `/api/live/stream` to `http://localhost:3002`.

## Dependencies

### Rust (Cargo.toml)
- `tauri` v2 with features: tray-icon
- `tauri-plugin-shell` — spawn Python daemon
- `tauri-plugin-updater` — auto-update
- `tauri-plugin-process` — relaunch after update
- `rusqlite` with features: bundled, load_extension
- `serde`, `serde_json` — serialization
- `toml` — life.toml read/write

### Remove from package.json
- `electron`, `electron-builder`, `electron-updater`, `esbuild`, `wait-on`
- `better-sqlite3`, `@types/better-sqlite3` (Phase 2)
- `@hono/node-server`, `hono`, `tsx` (Phase 2)

### Add to package.json
- `@tauri-apps/api` — invoke, convertFileSrc
- `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`

## Process Management

Python daemon spawned in `setup()` via `std::process::Command`:
- Store `Child` handle in `tauri::State<Mutex<Option<Child>>>`
- Pipe stdout/stderr for logging
- Kill on `RunEvent::Exit`
- No sidecar — assumes Python + venv available at known path

## What Stays Unchanged

- Python daemon (all capture, analysis, LLM, embedding code)
- React components (except api.ts and media URL references)
- SQLite schema and data directory structure
- life.toml configuration format
- Vite build pipeline (just outputs to dist/ for Tauri to serve)

## Platform Targets

- Windows: NSIS installer (primary — WSL2 development environment)
- Linux: AppImage (secondary)
- macOS: DMG (optional)
