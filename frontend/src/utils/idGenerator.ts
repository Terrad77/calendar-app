import { nanoid } from 'nanoid';

/**
 * Генерує унікальний ID з опціональним префіксом
 * @param prefix - префікс для ID (наприклад, 'task', 'holiday')
 * @returns унікальний рядок ID
 */
export const generateUniqueId = (prefix?: string): string => {
  const id = nanoid(10);
  return prefix ? `${prefix}-${id}` : id;
};

/**
 * Генерує унікальний ID для подій календаря
 * @param type - тип події ('task' або 'holiday')
 * @param date - дата події
 * @returns унікальний рядок ID
 */
export const generateCalendarEventId = (type: 'task' | 'holiday', date?: string): string => {
  const id = nanoid(10);
  const datePart = date ? `-${date.replace(/-/g, '')}` : '';
  return `${type}${datePart}-${id}`;
};
