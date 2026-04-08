import type { DayStats, Frame, Summary } from '@web/lib/types';

export const DEMO_DATES = [
  '2026-04-01',
  '2026-04-02',
  '2026-04-03',
  '2026-04-04',
  '2026-04-05',
  '2026-04-06',
  '2026-04-07',
];

export const FIXTURE_FRAMES: Frame[] = [
  {
    id: 1,
    timestamp: '2026-04-07T08:00:00.000Z',
    path: '/screens/camera-placeholder.jpg',
    screen_path: '/screens/code-editor.png',
    audio_path: '',
    transcription: '',
    brightness: 144,
    motion_score: 0.03,
    scene_type: 'bright',
    claude_description: 'Working at a desk in a focused coding session.',
    activity: 'programming',
    screen_extra_paths: '',
    foreground_window: 'code|VS Code - demo.ts',
  },
];

export const FIXTURE_SUMMARIES: Summary[] = [
  {
    id: 1,
    timestamp: '2026-04-07T09:00:00.000Z',
    scale: '1h',
    content: 'Focused development work with short breaks and one communication block.',
    frame_count: 120,
  },
];

export const FIXTURE_DAY_STATS: DayStats = {
  date: '2026-04-07',
  frames: 120,
  events: 8,
  summaries: 6,
  avgMotion: 0.04,
  avgBrightness: 138,
  activity: Array.from({ length: 24 }, (_, hour) => (hour >= 8 && hour <= 18 ? 5 : 0)),
};
