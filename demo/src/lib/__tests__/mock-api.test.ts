import { describe, expect, test } from 'vitest';
import { createDemoRuntime } from '../runtime-demo';
import { buildFrame, buildActivityMappings } from '../mock-api';
import { createLiveFeedStore } from '../live-feed-store';

describe('demo runtime fixtures', () => {
  test('returns fixture-backed dates and status', async () => {
    const runtime = createDemoRuntime();
    await runtime.init();

    expect(await runtime.api.stats.dates()).toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
      '2026-04-06',
      '2026-04-07',
    ]);

    const status = await runtime.api.status();
    expect(status.running).toBe(true);
  });

  test('returns a complete settings payload for the settings modal', async () => {
    const runtime = createDemoRuntime();
    const settings = await runtime.api.settings.get() as {
      llm?: { gemini_model?: string };
      capture?: { interval_sec?: number };
      presence?: { enabled?: boolean };
      chat?: { enabled?: boolean };
      env_masked?: Record<string, string>;
    };

    expect(settings.llm?.gemini_model).toBeTruthy();
    expect(settings.capture?.interval_sec).toBeTypeOf('number');
    expect(settings.presence?.enabled).toBeTypeOf('boolean');
    expect(settings.chat?.enabled).toBeTypeOf('boolean');
    expect(settings.env_masked?.GEMINI_API_KEY).toBeTruthy();
  });
});

describe('buildFrame', () => {
  test('creates a frame with the given fields', () => {
    const frame = buildFrame(42, '2026-04-07T10:00:00.000Z', 'programming', 'Coding away.', 'code|VS Code');
    expect(frame.id).toBe(42);
    expect(frame.timestamp).toBe('2026-04-07T10:00:00.000Z');
    expect(frame.activity).toBe('programming');
    expect(frame.claude_description).toBe('Coding away.');
    expect(frame.foreground_window).toBe('code|VS Code');
    expect(frame.scene_type).toBe('normal');
  });

  test('defaults windowTitle to empty string', () => {
    const frame = buildFrame(1, '2026-04-07T08:00:00.000Z', 'sleeping', 'Sleeping.');
    expect(frame.foreground_window).toBe('');
  });

  test('uses an inline screen image instead of a missing static asset path', () => {
    const frame = buildFrame(7, '2026-04-07T10:05:00.000Z', 'programming', 'Coding away.', 'code|VS Code - demo.ts');
    expect(frame.screen_path.startsWith('data:image/svg+xml;charset=UTF-8,')).toBe(true);
  });

  test('changes the generated screen image based on activity and time', () => {
    const codingFrame = buildFrame(8, '2026-04-07T10:05:00.000Z', 'programming', 'Coding away.', 'code|VS Code - demo.ts');
    const meetingFrame = buildFrame(9, '2026-04-07T12:20:00.000Z', 'meeting', 'In a meeting.', 'chrome|Google Meet');
    const laterCodingFrame = buildFrame(10, '2026-04-07T10:25:00.000Z', 'programming', 'Coding away.', 'code|VS Code - demo.ts');

    expect(codingFrame.screen_path).not.toBe(meetingFrame.screen_path);
    expect(codingFrame.screen_path).not.toBe(laterCodingFrame.screen_path);
  });

  test('does not render the giant away-from-desk placeholder for afk blocks', () => {
    const frame = buildFrame(11, '2026-04-07T13:20:00.000Z', 'lunch_break', 'Away for lunch.');
    expect(frame.screen_path).not.toContain('Away%20from%20desk');
  });
});

describe('buildActivityMappings', () => {
  test('maps each schedule activity to its meta category', () => {
    const mappings = buildActivityMappings();
    expect(mappings.programming).toBe('focus');
    expect(mappings.meeting).toBe('communication');
    expect(mappings.youtube).toBe('entertainment');
    expect(mappings.browsing).toBe('browsing');
    expect(mappings.sleeping).toBe('idle');
    expect(mappings.morning_routine).toBe('break');
    expect(mappings.reading).toBe('other');
  });
});

describe('live feed store', () => {
  test('starts with empty snapshot', () => {
    const store = createLiveFeedStore();
    expect(store.getSnapshot()).toBe('');
  });

  test('stores the latest camera snapshot as a data URL', () => {
    const store = createLiveFeedStore();
    store.setSnapshot('data:image/jpeg;base64,abc');
    expect(store.getSnapshot()).toBe('data:image/jpeg;base64,abc');
  });

  test('overwrites previous snapshot', () => {
    const store = createLiveFeedStore();
    store.setSnapshot('data:image/jpeg;base64,first');
    store.setSnapshot('data:image/jpeg;base64,second');
    expect(store.getSnapshot()).toBe('data:image/jpeg;base64,second');
  });
});
