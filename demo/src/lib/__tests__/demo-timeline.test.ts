import { describe, expect, test } from 'vitest';
import { buildFrameVirtualMinutes, formatDemoTimestamp } from '../demo-timeline';

describe('demo timeline helpers', () => {
  test('formats demo timestamps in local time without a UTC suffix', () => {
    expect(formatDemoTimestamp(12 * 60 + 1.3)).toBe('2026-04-07T12:01:18.000');
  });

  test('builds frame positions from midnight to the current virtual time', () => {
    const minutes = buildFrameVirtualMinutes(12 * 60 + 1, 5);
    expect(minutes[0]).toBe(0);
    expect(minutes.at(-1)).toBe(12 * 60);
    expect(minutes).toHaveLength(145);
  });
});
