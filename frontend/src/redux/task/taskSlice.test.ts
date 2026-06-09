import { describe, expect, it, vi } from 'vitest';

// The slice transitively imports the auth service (via task operations →
// axios instance), which reads localStorage at module-load time. Provide a
// minimal in-memory localStorage before imports run for the Node environment.
vi.hoisted(() => {
  // jsdom already provides localStorage; only polyfill when it's missing (Node).
  if (typeof globalThis.localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage =
    localStorageMock;
});

import reducer, { setActiveDay } from './taskSlice';
import { addTask, deleteTask } from './operations';
import { selectDayTasks } from './selectors';
import type { Task, TaskState } from './types';

const getInitialState = (): TaskState => reducer(undefined, { type: '@@INIT' });

// Normalize a date the same way the reducer does (UTC midnight ISO string).
const toUtcMidnightISO = (date: string): string => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  _id: 't1',
  date: '2030-01-15',
  title: 'Sample task',
  eventType: 'task',
  ...overrides,
});

describe('taskSlice', () => {
  it('has the expected initial state', () => {
    expect(getInitialState()).toEqual({
      activeDay: '',
      dayTasks: { date: '', tasks: [] },
      monthTasks: [],
      currentDay: [],
      loading: false,
      error: null,
    });
  });

  it('adds an event to the active day on addTask.fulfilled', () => {
    const task = makeTask();
    // The reducer only pushes into dayTasks when activeDay matches the task date.
    const withActiveDay = reducer(getInitialState(), setActiveDay(toUtcMidnightISO(task.date)));
    const state = reducer(
      withActiveDay,
      addTask.fulfilled(task as never, 'req-id', undefined as never)
    );
    expect(state.dayTasks.tasks).toHaveLength(1);
    expect(state.dayTasks.tasks[0]._id).toBe('t1');
    expect(state.loading).toBe(false);
  });

  it('removes an event on deleteTask.fulfilled', () => {
    const seeded: TaskState = {
      ...getInitialState(),
      dayTasks: { date: '', tasks: [makeTask({ _id: 't1' }), makeTask({ _id: 't2' })] },
      currentDay: [makeTask({ _id: 't1' }), makeTask({ _id: 't2' })],
    };
    const state = reducer(
      seeded,
      deleteTask.fulfilled({ success: true, id: 't1' } as never, 'req-id', 't1' as never)
    );
    expect(state.dayTasks.tasks.map((t) => t._id)).toEqual(['t2']);
    expect(state.currentDay.map((t) => t._id)).toEqual(['t2']);
  });

  it('selectDayTasks returns the day-tasks slice', () => {
    const dayTasks = { date: '2030-01-15', tasks: [makeTask()] };
    expect(selectDayTasks({ task: { dayTasks } } as never)).toEqual(dayTasks);
  });
});
