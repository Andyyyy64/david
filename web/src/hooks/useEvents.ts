import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { Event } from '../lib/types';

const POLL_INTERVAL = 30_000;

export function useEvents(date: string) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(() => {
    if (!date) return;
    api.events
      .list(date)
      .then(setEvents)
      .catch(console.error);
  }, [date]);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    api.events
      .list(date)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    if (!date) return;
    const isToday = date === new Date().toISOString().slice(0, 10);
    if (!isToday) return;

    const id = setInterval(fetchEvents, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [date, fetchEvents]);

  return { events, loading };
}
