import type { Frame } from '@web/lib/types';
import { demoSchedule } from './schedule';
import { buildDemoScreenDataUrl } from './screen-art';

function getFrameMetrics(activity: string, timestamp: string) {
  const date = new Date(timestamp);
  const hour = Number.isNaN(date.getTime()) ? 12 : date.getHours();
  const variant = Number.isNaN(date.getTime()) ? 0 : Math.floor(date.getMinutes() / 5) % 3;
  const isNight = hour < 7 || hour >= 23;

  if (activity === 'sleeping') {
    return {
      brightness: 52,
      motionScore: 0.01,
      sceneType: 'dark',
    };
  }

  if (activity === 'meeting') {
    return {
      brightness: 150,
      motionScore: 0.04,
      sceneType: 'bright',
    };
  }

  if (activity === 'programming') {
    return {
      brightness: isNight ? 96 : 136 + variant * 6,
      motionScore: 0.02 + variant * 0.01,
      sceneType: 'normal',
    };
  }

  return {
    brightness: isNight ? 88 : 128,
    motionScore: activity === 'morning_routine' || activity === 'dinner' ? 0.06 : 0.03,
    sceneType: isNight ? 'dark' : 'normal',
  };
}

export function buildFrame(
  id: number,
  timestamp: string,
  activity: string,
  description: string,
  windowTitle = '',
  screenActivity = activity,
  screenWindowTitle = windowTitle,
): Frame {
  const { brightness, motionScore, sceneType } = getFrameMetrics(activity, timestamp);
  return {
    id,
    timestamp,
    path: '/screens/camera-placeholder.jpg',
    screen_path: buildDemoScreenDataUrl(screenActivity, screenWindowTitle, timestamp),
    audio_path: '',
    transcription: '',
    brightness,
    motion_score: motionScore,
    scene_type: sceneType,
    claude_description: description,
    activity,
    screen_extra_paths: '',
    foreground_window: windowTitle,
  };
}

export function buildActivityMappings() {
  return Object.fromEntries(demoSchedule.map((entry) => [entry.activity, entry.meta]));
}
