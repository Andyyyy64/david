export interface ScheduleEntry {
  from: string;
  to: string;
  activity: string;
  meta: 'focus' | 'communication' | 'entertainment' | 'browsing' | 'break' | 'idle' | 'other';
  presence: boolean;
  pose: 'sleeping' | 'sitting_desk' | 'standing' | null;
  window?: string;
  description: string;
}

export const demoSchedule: ScheduleEntry[] = [
  { from: '00:00', to: '07:00', activity: 'sleeping', meta: 'idle', presence: true, pose: 'sleeping', description: 'Sleeping in a dark room.' },
  { from: '07:00', to: '07:30', activity: 'morning_routine', meta: 'break', presence: true, pose: 'standing', description: 'Starting the day and getting ready.' },
  { from: '07:30', to: '08:00', activity: 'breakfast', meta: 'break', presence: false, pose: null, description: 'Away from the desk for breakfast.' },
  { from: '08:00', to: '12:00', activity: 'programming', meta: 'focus', presence: true, pose: 'sitting_desk', window: 'code|VS Code - demo.ts', description: 'Working in VS Code with a focused posture.' },
  { from: '12:00', to: '13:00', activity: 'meeting', meta: 'communication', presence: true, pose: 'sitting_desk', window: 'chrome|Google Meet', description: 'In an online meeting at the desk.' },
  { from: '13:00', to: '14:00', activity: 'lunch_break', meta: 'break', presence: false, pose: null, description: 'Away from the desk for lunch.' },
  { from: '14:00', to: '17:30', activity: 'programming', meta: 'focus', presence: true, pose: 'sitting_desk', window: 'chrome|GitHub - Pull Request #42', description: 'Continuing focused product work.' },
  { from: '17:30', to: '19:00', activity: 'gym', meta: 'break', presence: false, pose: null, description: 'Away from the desk at the gym.' },
  { from: '19:00', to: '20:00', activity: 'dinner', meta: 'break', presence: true, pose: 'standing', description: 'Back in the room after dinner.' },
  { from: '20:00', to: '21:00', activity: 'youtube', meta: 'entertainment', presence: true, pose: 'sitting_desk', window: 'chrome|YouTube', description: 'Watching video content at the desk.' },
  { from: '21:00', to: '22:00', activity: 'browsing', meta: 'browsing', presence: true, pose: 'sitting_desk', window: 'chrome|Reddit', description: 'Casual browsing in a seated posture.' },
  { from: '22:00', to: '23:00', activity: 'reading', meta: 'other', presence: true, pose: 'sitting_desk', description: 'Quiet reading before bed.' },
  { from: '23:00', to: '24:00', activity: 'sleeping', meta: 'idle', presence: true, pose: 'sleeping', description: 'Back to sleep.' },
];
