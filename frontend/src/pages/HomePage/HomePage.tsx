import React, { Suspense } from 'react';
import css from './HomePage.module.css';
import type { HomePageProps } from '../../types/types';

const Calendar = React.lazy(
  () => import('../../components/Calendar/CalendarComponent/CalendarComponent')
);

export default function HomePage({ events, setEvents }: HomePageProps) {
  return (
    <div className={css.homeContainer}>
      <Suspense fallback={<div>Loading calendar…</div>}>
        <Calendar events={events} setEvents={setEvents} />
      </Suspense>
    </div>
  );
}
