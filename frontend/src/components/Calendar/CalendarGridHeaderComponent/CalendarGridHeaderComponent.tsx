import React from 'react';
import { styled } from '@stitches/react';
import { useTranslation } from 'react-i18next';

const WeekdayHeaderContainer = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '6px',
  padding: '6px',
  backgroundColor: 'rgba(255,255,255,0.65)',
});

const WeekdayHeaderCell = styled('div', {
  fontWeight: '600',
  fontSize: '0.82rem',
  letterSpacing: '0.02em',
  // textTransform: 'uppercase',
  textAlign: 'center',
  backgroundColor: 'rgba(255,255,255,0.85)',
  color: '#6b7280',
  height: '34px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: '10px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
});

export const CalendarGridHeader: React.FC = () => {
  const { t } = useTranslation('calendar');
  const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  return (
    <WeekdayHeaderContainer>
      {daysOfWeek.map((day) => (
        <WeekdayHeaderCell key={day}>{t(day)}</WeekdayHeaderCell>
      ))}
    </WeekdayHeaderContainer>
  );
};
