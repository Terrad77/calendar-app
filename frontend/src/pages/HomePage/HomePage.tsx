import Calendar from '../../components/Calendar/Calendar';
import css from './HomePage.module.css';
import type { HomePageProps } from '../../types/types';

export default function HomePage({ events, setEvents }: HomePageProps) {
  return (
    <div className={css.homeContainer}>
      <Calendar events={events} setEvents={setEvents} />
    </div>
  );
}
