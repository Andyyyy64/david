import { describe, expect, test } from 'vitest';
import type { Frame } from '../lib/types';
import {
  DEFAULT_LIVE_DATA_POLL_INTERVAL_MS,
  DEMO_LIVE_DATA_POLL_INTERVAL_MS,
  getLiveDataPollInterval,
  resolveDemoSelectedFrame,
} from '../lib/demo-runtime';

function createFrame(id: number): Frame {
  return {
    id,
    timestamp: `2026-04-07T10:${String(id).padStart(2, '0')}:00.000Z`,
    path: '',
    screen_path: '',
    audio_path: '',
    transcription: '',
    brightness: 120,
    motion_score: 0.02,
    scene_type: 'normal',
    claude_description: `frame ${id}`,
    activity: 'programming',
    screen_extra_paths: '',
    foreground_window: 'code|VS Code - demo.ts',
  };
}

describe('demo runtime helpers', () => {
  test('uses a short poll interval in demo mode', () => {
    expect(getLiveDataPollInterval(true)).toBe(DEMO_LIVE_DATA_POLL_INTERVAL_MS);
    expect(getLiveDataPollInterval(false)).toBe(DEFAULT_LIVE_DATA_POLL_INTERVAL_MS);
  });

  test('follows the latest frame only while auto-follow is enabled', () => {
    const frames = [createFrame(1), createFrame(2), createFrame(3)];
    expect(resolveDemoSelectedFrame({
      isDemo: true,
      autoFollowLatest: true,
      previousSelectedFrame: createFrame(2),
      frames,
    })?.id).toBe(3);
  });

  test('preserves a manually selected demo frame when auto-follow is disabled', () => {
    const previousSelectedFrame = createFrame(2);
    const refreshedFrames = [
      createFrame(1),
      { ...createFrame(2), claude_description: 'updated frame 2' },
      createFrame(3),
    ];

    expect(resolveDemoSelectedFrame({
      isDemo: true,
      autoFollowLatest: false,
      previousSelectedFrame,
      frames: refreshedFrames,
    })?.timestamp).toBe(previousSelectedFrame.timestamp);
  });

  test('does not force demo selection behavior outside demo mode', () => {
    const frames = [createFrame(1), createFrame(2), createFrame(3)];
    expect(resolveDemoSelectedFrame({
      isDemo: false,
      autoFollowLatest: true,
      previousSelectedFrame: createFrame(2),
      frames,
    })?.id).toBe(2);
  });
});
