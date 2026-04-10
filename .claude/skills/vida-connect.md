---
name: vida-connect
description: Use when the user asks to connect to vida, watch their activity, or have Claude Code act as vida's AI brain. Works with any LLM provider — automatically switches between observer mode (gemini/claude) and analysis mode (external).
---

# vida Connect

You are connecting to vida, a personal life observer daemon running on the local machine. What you actually do after connecting depends on which LLM provider the daemon is configured for. **Do not assume analysis mode** — always run Step 1 first.

## Step 1: Check the daemon and pick a mode

```bash
vida status-json
```

Expected fields:

- `running`: must be `true`. If `false`, tell the user to start the daemon (`vida start` or launch the Tauri app) and stop here.
- `llm_provider`: drives everything below.
  - `"external"` → **Analysis mode.** You are the AI brain. Jump to the [Analysis mode](#analysis-mode) section.
  - anything else (`"gemini"`, `"claude"`, …) → **Observer mode.** The daemon is already running its own analysis. Jump to the [Observer mode](#observer-mode) section.
- `data_dir`: every image path in WebSocket events is relative to this.
- `ws_port`: the WebSocket port (default `3004`).

Report the mode to the user in one short line before entering the loop, e.g.:

> Connected to vida (provider=gemini, data_dir=/home/andy/.../data). Entering observer mode.

## Observer mode

**Use when `llm_provider != "external"`.** The daemon is handling frame analysis itself. Your job is to stay attached, keep an eye on what the user is doing, and answer questions on demand. **Do not** analyze frames or call `frames-update` in this mode — you would be duplicating work the daemon already did.

### Live loop

Run this loop. Each iteration blocks until either an event arrives or the timeout fires.

```bash
vida watch --type frame_analyzed --timeout 300
```

What to do with each result:

- **Got a `frame_analyzed` event.** Note the `frame_id`, `activity`, and `description[:200]`. Keep a light in-memory rolling log of the last ~10 events so you can answer "what was I just doing?" without hitting the DB. Do not print every frame to the user — stay quiet unless they ask.
- **Timeout (no events for 5 minutes).** Run `vida status-json` again to verify the daemon is still alive. If `running` is still `true`, loop. If it's `false`, tell the user and stop.

Also watch for `llm_error` events on the same stream — if the daemon is hitting rate limits or auth errors, surface the scrubbed message to the user immediately:

```bash
vida watch --type llm_error --timeout 1
```

(Run this opportunistically, not every iteration — once every ~5 iterations is fine.)

### When the user asks a question

You have the full vida CLI available. Use it instead of guessing from the rolling log whenever precision matters:

| Question | Command |
| --- | --- |
| "What was I doing at 2pm?" | `vida search "..."` or `vida frames-list 2026-04-11 \| jq 'map(select(.timestamp \| contains("T14")))'` |
| "How much time did I spend coding today?" | `vida activity-stats` |
| "Show me today's summary" | `vida summary-list` |
| "Find when I was on Discord" | `vida search "Discord"` |
| "What's my focus score?" | Compute from `vida activity-stats` meta-category breakdown |

Keep answers short and cite the frame IDs or timestamps so the user can open the frame in the UI.

## Analysis mode

**Use only when `llm_provider == "external"`.** The daemon has disabled its own LLM and is broadcasting `analyze_request` events over WebSocket. You are the AI brain — read images, classify activities, send results back, repeat.

### Step 2: Process pending backlog

Before entering the live loop, clear any unanalyzed frames:

```bash
vida frames-pending --limit 10
```

For each pending frame, run the [Analysis cycle](#analysis-cycle) below. If there are many (>20), process the most recent 20 and skip the rest.

### Step 3: Live analysis loop

```
┌─→ vida watch --type analyze_request --timeout 120
│   (blocks until next frame or timeout)
│
│   timeout → loop back (daemon may be idle)
│   event received ↓
│
├─→ Analysis cycle
│
├─→ Every 10 frames: check if summaries need generation (see vida-summarize)
│
└── Loop back to watch
```

### Analysis cycle

For each frame that needs analysis:

**1. Read the event payload.**

```json
{
  "frame_id": 123,
  "image_paths": ["frames/2026-04-11/14-30-00.jpg", "screens/2026-04-11/14-30-00.png"],
  "data_dir": "/absolute/path/to/data",
  "transcription": "...",
  "foreground_window": "Code.exe|main.py - vida",
  "idle_seconds": 5,
  "has_face": true,
  "pose_data": "..."
}
```

**2. Read the images.** Use the Read tool on `<data_dir>/<image_paths[0]>` (camera) and `<data_dir>/<image_paths[1]>` (screen).

**3. Classify.** Produce three fields:

- **Description** — 1–2 sentences in Japanese. Continuous log tone; don't re-introduce the user each time. Reference `transcription` and `foreground_window` for context.
- **Activity** — short Japanese category name. Use existing categories when possible (`vida activity-stats` to see them). Common: `プログラミング`, `ブラウジング`, `動画視聴`, `休憩`, `食事`, `睡眠`, `不在`, `チャット`.
- **Meta-category** — exactly one of: `focus`, `communication`, `entertainment`, `browsing`, `break`, `idle`.

**Priority rules.**

- Physical state beats screen content. User lying down with code on screen → `break`, not `focus`.
- `idle_seconds >= 300` → likely `idle`.
- `has_face == false` + idle screen → `idle`.

**4. Send the result.**

```bash
vida frames-update <frame_id> \
  --analysis "デスクでVS Codeを使ってTypeScriptのコードを書いている" \
  --activity "プログラミング" \
  --meta-category "focus"
```

Immediately loop back to the watch command.

### Important notes (analysis mode only)

- **Speed matters.** Each cycle should take seconds, not minutes. The daemon captures every 30 s.
- **Don't ask the user** for each frame. This is autonomous — analyze and update silently.
- **Be consistent.** Use the same activity names across frames.
- **Errors are OK.** If a read fails, skip and continue.
- **Summaries.** Every ~10 frames, check whether 10 m / 30 m / 1 h summaries need generation (see vida-summarize skill).

## Stopping

When the user says to disconnect, stop watching and exit the loop. No cleanup is needed — the WebSocket closes automatically.
