import React from 'react';
import { styled } from '@stitches/react';

const WeekdayHeaderContainer = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '4px',
  backgroundColor: '#eceded',
});

const WeekdayHeaderCell = styled('div', {
  fontWeight: '500',
  fontSize: '0.9rem',
  textAlign: 'center',
  backgroundColor: '#edeff1',
  color: '#777',
  height: '35px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid #e0e0e0',
});

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarGridHeader: React.FC = () => {
  return (
    <WeekdayHeaderContainer>
      {daysOfWeek.map((day) => (
        <WeekdayHeaderCell key={day}>{day}</WeekdayHeaderCell>
      ))}
    </WeekdayHeaderContainer>
  );
};
