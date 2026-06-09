import { nanoid } from 'nanoid';

/**
 * Generates a unique ID with an optional prefix
 * @param prefix - prefix for the ID (e.g. 'task', 'holiday')
 * @returns a unique ID string
 */
export const generateUniqueId = (prefix?: string): string => {
  const id = nanoid(10);
  return prefix ? `${prefix}-${id}` : id;
};

/**
 * Generates a unique ID for calendar events
 * @param type - event type ('task' or 'holiday')
 * @param date - event date
 * @returns a unique ID string
 */
export const generateCalendarEventId = (type: 'task' | 'holiday', date?: string): string => {
  const id = nanoid(10);
  const datePart = date ? `-${date.replace(/-/g, '')}` : '';
  return `${type}${datePart}-${id}`;
};
