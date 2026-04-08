import { DEMO_DAY_MINUTES } from './simulator';

function wrapVirtualMinutes(minutes: number) {
  return (minutes + DEMO_DAY_MINUTES) % DEMO_DAY_MINUTES;
}

export function formatDemoTimestamp(virtualMinutes: number) {
  const normalizedMinutes = wrapVirtualMinutes(virtualMinutes);
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = Math.floor(normalizedMinutes % 60);
  const secs = Math.floor((normalizedMinutes % 1) * 60);

  return `2026-04-07T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.000`;
}

export function buildFrameVirtualMinutes(currentVirtualMinutes: number, frameIntervalMinutes: number) {
  const normalizedMinutes = wrapVirtualMinutes(currentVirtualMinutes);
  const lastFrameMinute = Math.floor(normalizedMinutes / frameIntervalMinutes) * frameIntervalMinutes;
  const frameMinutes: number[] = [];

  for (let minute = 0; minute <= lastFrameMinute + 1e-9; minute += frameIntervalMinutes) {
    frameMinutes.push(Number(minute.toFixed(4)));
  }

  return frameMinutes;
}
