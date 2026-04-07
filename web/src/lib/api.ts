import { invoke } from '@tauri-apps/api/core';
import type {
  Frame,
  Event,
  Summary,
  DayStats,
  ActivityStats,
  SearchResults,
  Session,
  ActivityInfo,
  RangeStats,
  Report,
  AppStat,
  Memo,
  ChatData,
} from './types';

export const api = {
  frames: {
    list: (date: string): Promise<Frame[]> =>
      invoke('get_frames', { date }),

    latest: (): Promise<Frame> =>
      invoke<Frame | null>('get_latest_frame').then((f) => {
        if (!f) throw new Error('No frames');
        return f;
      }),

    get: (id: number): Promise<Frame> =>
      invoke<Frame | null>('get_frame', { id }).then((f) => {
        if (!f) throw new Error('Frame not found');
        return f;
      }),
  },

  summaries: {
    list: (date: string, scale?: string): Promise<Summary[]> =>
      invoke('get_summaries', { date, scale: scale ?? null }),
  },

  events: {
    list: (date: string): Promise<Event[]> =>
      invoke('get_events', { date }),
  },

  stats: {
    get: (date: string): Promise<DayStats> =>
      invoke('get_stats', { date }),

    dates: (): Promise<string[]> =>
      invoke('get_dates'),

    activities: (date: string): Promise<ActivityStats> =>
      invoke('get_activities', { date }),

    range: (from: string, to: string): Promise<RangeStats> =>
      invoke('get_range_stats', { from, to }),

    apps: (date: string): Promise<AppStat[]> =>
      invoke('get_apps', { date }),
  },

  sessions: (date: string): Promise<Session[]> =>
    invoke('get_sessions', { date }),

  reports: {
    get: (date: string): Promise<Report> =>
      invoke<Report | null>('get_report', { date }).then((r) => {
        if (!r) throw new Error('Report not found');
        return r;
      }),

    list: (): Promise<Report[]> =>
      invoke('list_reports'),
  },

  activities: {
    list: (): Promise<ActivityInfo[]> =>
      invoke('list_activities'),

    mappings: (): Promise<Record<string, string>> =>
      invoke('get_activity_mappings'),
  },

  memos: {
    get: (date: string): Promise<Memo> =>
      invoke<Memo | null>('get_memo', { date }).then((m) => m ?? { date, content: '', updated_at: null }),

    put: (date: string, content: string): Promise<{ ok: boolean }> =>
      invoke<Memo>('put_memo', { date, content }).then(() => ({ ok: true })),
  },

  context: {
    get: (): Promise<{ content: string }> =>
      invoke<string>('get_context').then((content) => ({ content })),

    put: (content: string): Promise<{ ok: boolean }> =>
      invoke<string>('put_context', { content }).then(() => ({ ok: true })),
  },

  chat: (date: string): Promise<ChatData> =>
    invoke('get_chat', { date }),

  status: (): Promise<{ running: boolean; camera: boolean; mic: boolean }> =>
    invoke('get_status'),

  search: (q: string, from?: string, to?: string): Promise<SearchResults> =>
    invoke('search_text', {
      q,
      from: from ?? null,
      to: to ?? null,
    }),

  rag: {
    ask: (
      query: string,
      history?: { role: string; content: string }[],
    ): Promise<{
      response: string;
      sources: { type: string; timestamp: string; preview: string; distance: number }[];
    }> =>
      invoke('ask_rag', { query, history: history ?? [] }),
  },

  settings: {
    get: (): Promise<unknown> =>
      invoke('get_settings'),

    put: (body: unknown): Promise<unknown> =>
      invoke('put_settings', { body }),
  },

  devices: {
    get: (): Promise<unknown> =>
      invoke('get_devices'),
  },

  data: {
    stats: (): Promise<unknown> =>
      invoke('get_data_stats'),

    exportTable: (table: string, format: string = 'csv'): Promise<string> =>
      invoke('export_table', { table, format }),
  },
};
