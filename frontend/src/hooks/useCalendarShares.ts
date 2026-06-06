import { useEffect, useState } from 'react';
import { getCalendarShares } from '../API/apiOperations';

export const SHARED_CALENDAR_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
];

export interface SharedCalendar {
  id: string;
  name: string;
  color: string;
}

export const useCalendarShares = (enabled: boolean) => {
  const [sharedCalendars, setSharedCalendars] = useState<SharedCalendar[]>([]);

  useEffect(() => {
    if (!enabled) return;
    getCalendarShares()
      .then(({ sharedWithMe }) => {
        setSharedCalendars(
          sharedWithMe.map((s, i) => ({
            id: s.ownerId,
            name: s.ownerName ?? 'Unknown',
            color: SHARED_CALENDAR_COLORS[i % SHARED_CALENDAR_COLORS.length],
          }))
        );
      })
      .catch(() => {});
  }, [enabled]);

  return sharedCalendars;
};
