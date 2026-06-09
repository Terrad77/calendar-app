import { describe, expect, it } from 'vitest';
import { generateCalendarEventId, generateUniqueId } from './idGenerator';

describe('generateUniqueId', () => {
  it('generates a non-empty string', () => {
    const id = generateUniqueId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns different values on consecutive calls', () => {
    expect(generateUniqueId()).not.toBe(generateUniqueId());
  });

  it('prefixes the id and matches the expected format', () => {
    const id = generateUniqueId('task');
    // nanoid's default alphabet is A-Za-z0-9_- and the helper uses length 10.
    expect(id).toMatch(/^task-[A-Za-z0-9_-]{10}$/);
  });
});

describe('generateCalendarEventId', () => {
  it('embeds the type and the stripped date', () => {
    const id = generateCalendarEventId('task', '2030-01-15');
    expect(id).toMatch(/^task-20300115-[A-Za-z0-9_-]{10}$/);
  });

  it('omits the date segment when no date is given', () => {
    const id = generateCalendarEventId('holiday');
    expect(id).toMatch(/^holiday-[A-Za-z0-9_-]{10}$/);
  });
});
