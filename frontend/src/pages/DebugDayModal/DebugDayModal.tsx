import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import DayEventsModal from '../../components/Calendar/DayEventsModalComponent/DayEventsModalComponent';
import type { CalendarEvent } from '../../types/types';

const sampleTasks: CalendarEvent[] = [
  {
    id: 't1',
    date: '2026-05-19',
    title: 'Встреча с командой',
    description: 'Обсудить релиз',
    eventType: 'task',
    colors: ['green'],
  },
  {
    id: 't2',
    date: '2026-05-19',
    title: 'Код-ревью',
    description: 'Проверить PR #42',
    eventType: 'task',
    colors: ['yellow'],
  },
];

const sampleHolidays: CalendarEvent[] = [
  {
    id: 'h1',
    date: '2026-05-19',
    title: 'День тестирования',
    description: '',
    eventType: 'holiday',
    countryCode: 'UA',
  },
];

const otherDays = [
  { date: '2026-05-18', tasks: 2, holidays: 0 },
  { date: '2026-05-20', tasks: 1, holidays: 1 },
  { date: '2026-06-01', tasks: 3, holidays: 0 },
];

export default function DebugDayModal() {
  const [open, setOpen] = useState(true);
  const { toggleTheme, isDark } = useTheme();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={() => setOpen(true)}>Open Day Modal</button>
        <button onClick={() => toggleTheme()}>
          {isDark ? 'Switch to light' : 'Switch to dark'}
        </button>
      </div>
      <DayEventsModal
        date={'2026-05-19'}
        tasks={sampleTasks}
        holidays={sampleHolidays}
        isOpen={open}
        onClose={() => setOpen(false)}
        onEditTask={(t: CalendarEvent) => console.log('edit', t)}
        onAdd={(d) => console.log('add', d)}
        otherDays={otherDays}
        onSelectDay={(d) => console.log('select', d)}
      />
    </div>
  );
}
