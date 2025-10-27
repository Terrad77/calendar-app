import Calendar from "../../components/Calendar/Calendar";
import WelcomeSection from "../../components/WelcomeSection/WelcomeSection";
import type { CalendarEvent } from "../../services/aiService";
import css from "./HomePage.module.css";

interface HomePageProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

export default function HomePage({ events, setEvents }: HomePageProps) {
  return (
    <div className={css.homeContainer}>
      <Calendar events={events} setEvents={setEvents} />
      <WelcomeSection />
    </div>
  );
}

