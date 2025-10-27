import Calendar from '../../components/Calendar/Calendar';
import WelcomeSection from '../../components/WelcomeSection/WelcomeSection';
import type { CalendarEvent } from '../../services/aiService';
import css from './HomePage.module.css';

export default function HomePage() {
  return (
    <div className={css.homeContainer}>
      <Calendar />
      <WelcomeSection />
    </div>
  );
}
