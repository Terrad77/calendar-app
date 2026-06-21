import React from 'react';
import { styled } from '@stitches/react';
import { useTranslation } from 'react-i18next';

const WeekdayHeaderContainer = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '6px',
  padding: '6px',
  backgroundColor: 'var(--surface-calendar-grid)',
  borderRadius: '12px',
  overflow: 'hidden',
});

const WeekdayHeaderCell = styled('div', {
  fontWeight: '600',
  fontSize: '0.82rem',
  letterSpacing: '0.02em',
  // textTransform: 'uppercase',
  textAlign: 'center',
  backgroundColor: 'var(--surface-calendar-cell)',
  color: 'var(--surface-calendar-muted)',
  height: '34px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--surface-calendar-cell-border)',
  borderRadius: '10px',
  boxShadow: '0 1px 4px var(--surface-calendar-cell-shadow)',
});

export interface CalendarGridHeaderProps {
  // 0 = Sunday-first, 1 = Monday-first (matches dayjs weekStart convention)
  weekStart?: 0 | 1;
}

export const CalendarGridHeader: React.FC<CalendarGridHeaderProps> = ({ weekStart = 1 }) => {
  const { t } = useTranslation('calendar');
  const mondayFirst = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const daysOfWeek = weekStart === 0 ? ['sun', ...mondayFirst.slice(0, 6)] : mondayFirst;

  return (
    <WeekdayHeaderContainer>
      {daysOfWeek.map((day) => (
        <WeekdayHeaderCell key={day}>{t(day)}</WeekdayHeaderCell>
      ))}
    </WeekdayHeaderContainer>
  );
};
