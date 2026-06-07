import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import css from './HomePage.module.css';
import type { HomePageProps } from '../../types/calendar.types';
import { useLocation } from 'react-router-dom';
import { useMemo, useEffect, useState } from 'react';
import { getCalendarEvents } from '../../API/apiOperations';
import DotLoader from '../../components/DotLoader/DotLoader';

const Calendar = React.lazy(
  () => import('../../components/Calendar/CalendarComponent/CalendarComponent')
);

export default function HomePage({ events, setEvents }: HomePageProps) {
  const { t } = useTranslation('calendar');
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const contactFilter = searchParams.get('contact');

  const [contactEvents, setContactEvents] = useState<typeof events | null>(null);
  const [contactEventsLoading, setContactEventsLoading] = useState(false);
  const [contactEventsError, setContactEventsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!contactFilter) {
        setContactEvents(null);
        return;
      }

      try {
        setContactEvents([]);
        setContactEventsLoading(true);
        setContactEventsError(null);
        const loaded = await getCalendarEvents(contactFilter);
        if (!mounted) return;
        setContactEvents(loaded);
      } catch (err) {
        console.error('Failed to load contact events:', err);
        if (mounted) setContactEvents([]);
        if (mounted)
          setContactEventsError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        if (mounted) setContactEventsLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [contactFilter]);

  const filteredEvents = useMemo(() => {
    if (contactFilter) return contactEvents ?? [];
    return events;
  }, [contactFilter, contactEvents, events]);

  return (
    <div className={css.homeContainer}>
      {contactEventsLoading && <div className={css.banner}>Завантаження подій контакту…</div>}
      {contactEventsError && <div className={css.bannerError}>Помилка: {contactEventsError}</div>}
      <Suspense
        fallback={
          <div className={css.loadingContainer}>
            <DotLoader text={t('loading_calendar')} />
          </div>
        }
      >
        <Calendar events={filteredEvents} setEvents={setEvents} />
      </Suspense>
    </div>
  );
}
