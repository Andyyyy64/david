import type { ScheduleEntry } from './schedule';

export const DEMO_DAY_MINUTES = 24 * 60;

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function createSimulator({
  schedule,
  loopDurationMs,
  frameIntervalMinutes,
  initialVirtualMinutes = 0,
}: {
  schedule: ScheduleEntry[];
  loopDurationMs: number;
  frameIntervalMinutes: number;
  initialVirtualMinutes?: number;
}) {
  const entries = schedule.map((entry) => ({
    ...entry,
    fromMinutes: toMinutes(entry.from),
    toMinutes: toMinutes(entry.to),
  }));

  function snapshotAtElapsedMs(elapsedMs: number) {
    const progress = (elapsedMs % loopDurationMs) / loopDurationMs;
    const virtualMinutes = (initialVirtualMinutes + progress * DEMO_DAY_MINUTES) % DEMO_DAY_MINUTES;
    const currentEntry = entries.find((entry) => virtualMinutes >= entry.fromMinutes && virtualMinutes < entry.toMinutes) ?? entries[0];
    const nextFrameAtVirtualMinutes = Math.ceil(virtualMinutes / frameIntervalMinutes) * frameIntervalMinutes;
    return { virtualMinutes, currentEntry, nextFrameAtVirtualMinutes };
  }

  return { snapshotAtElapsedMs };
}
