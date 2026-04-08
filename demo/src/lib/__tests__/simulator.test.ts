import { describe, expect, test } from 'vitest';
import { createSimulator, DEMO_DAY_MINUTES } from '../simulator';
import { demoSchedule } from '../schedule';

describe('demo simulator', () => {
  test('maps accelerated time into a schedule entry and frame cadence', () => {
    const simulator = createSimulator({
      schedule: demoSchedule,
      loopDurationMs: 10 * 60 * 1000,
      frameIntervalMinutes: 0.5,
    });

    const snapshot = simulator.snapshotAtElapsedMs(5 * 60 * 1000);

    expect(snapshot.virtualMinutes).toBe(DEMO_DAY_MINUTES / 2);
    expect(snapshot.currentEntry.activity).toBe('meeting');
    expect(snapshot.nextFrameAtVirtualMinutes % 0.5).toBe(0);
  });

  test('supports starting from midday instead of midnight', () => {
    const simulator = createSimulator({
      schedule: demoSchedule,
      loopDurationMs: 6 * 60 * 1000,
      frameIntervalMinutes: 0.5,
      initialVirtualMinutes: 11 * 60 + 30,
    });

    const snapshot = simulator.snapshotAtElapsedMs(0);

    expect(snapshot.virtualMinutes).toBe(11 * 60 + 30);
    expect(snapshot.currentEntry.activity).toBe('programming');
  });

  test('advances faster with the shorter loop duration', () => {
    const simulator = createSimulator({
      schedule: demoSchedule,
      loopDurationMs: 6 * 60 * 1000,
      frameIntervalMinutes: 0.5,
      initialVirtualMinutes: 11 * 60 + 30,
    });

    const snapshot = simulator.snapshotAtElapsedMs(60 * 1000);

    expect(snapshot.virtualMinutes).toBe(15 * 60 + 30);
    expect(snapshot.currentEntry.activity).toBe('programming');
  });
});
