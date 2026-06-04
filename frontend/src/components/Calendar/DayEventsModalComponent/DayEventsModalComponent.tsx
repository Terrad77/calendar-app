import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Modal from '../../Modal/Modal';
import DotLoader from '../../DotLoader/DotLoader';
import type { CalendarEvent } from '../../../types/calendar.types';
import { useLanguage } from '../../../hooks/useLanguage';

type Props = {
  date: string;
  tasks: CalendarEvent[];
  holidays: CalendarEvent[];
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onEditTask: (task: CalendarEvent) => void;
  onAdd?: (date: string) => void;
  otherDays?: { date: string; tasks: number; holidays: number }[];
  onSelectDay?: (date: string) => void;
};

export const DayEventsModal: React.FC<Props> = ({
  date,
  tasks,
  holidays,
  isOpen,
  isLoading = false,
  onClose,
  onEditTask,
  onAdd,
  otherDays = [],
  onSelectDay,
}) => {
  const { t } = useTranslation('calendar');
  const { currentLanguage } = useLanguage();
  const isPastDay = dayjs(date).isBefore(dayjs().startOf('day'), 'day');
  const locale = currentLanguage.startsWith('uk') ? 'uk' : 'en';
  const formattedDate = dayjs(date).locale(locale).format('DD MMMM YYYY');

  const getColorClass = (c?: string) => {
    if (!c) return 'bg-neutral-400 dark:bg-neutral-600';
    switch (c) {
      case 'red':
        return 'bg-red-500 dark:bg-red-400';
      case 'yellow':
        return 'bg-yellow-400 dark:bg-yellow-300';
      case 'green':
        return 'bg-green-500 dark:bg-green-400';
      default:
        return 'bg-neutral-400 dark:bg-neutral-600';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showLogo>
      <div className="relative w-full max-w-3xl xl:max-w-4xl 2xl:max-w-5xl rounded-lg overflow-hidden">
        {/* header */}
        <header
          className="flex items-center justify-between gap-4 px-4 py-3 border-b"
          style={{ borderColor: 'var(--surface-panel-border)' }}
          aria-label={t('day_details_header')}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm xl:text-[0.95rem] 2xl:text-base text-neutral-500 dark:text-neutral-400">
                {t('day')}
              </span>
              <h3 className="text-lg xl:text-[1.15rem] 2xl:text-[1.2rem] font-semibold text-neutral-900 dark:text-neutral-100">
                {formattedDate}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAdd && (
              <button
                className="modal-button text-sm xl:text-[0.95rem] 2xl:text-base"
                onClick={() => onAdd(date)}
                disabled={isPastDay}
                title={isPastDay ? t('past_events_only_edit_delete') : undefined}
              >
                {t('add_event')}
              </button>
            )}
          </div>
        </header>

        {/* body */}
        <div className="flex">
          {/* left: animated content for selected day */}
          <div
            className="w-2/3 p-4 xl:p-5 2xl:p-6 border-r"
            style={{ borderColor: 'var(--surface-panel-border)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={date}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="space-y-4">
                  {/* Holidays */}
                  {holidays.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                        {t('holidays')}
                      </div>
                      <div className="space-y-2">
                        {holidays.map((h) => (
                          <div
                            key={h.id}
                            className="p-2 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-lg">🎉</div>
                              <div className="text-sm font-medium text-red-600 dark:text-red-300">
                                {h.title}
                              </div>
                            </div>
                            {h.countryCode && (
                              <div className="text-xs text-red-500">{h.countryCode}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {tasks.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                        {t('tasks')}
                      </div>
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-neutral-900 border"
                            style={{ borderColor: 'var(--surface-panel-inset)' }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2.5 h-2 rounded-sm ${getColorClass(task.colors && task.colors[0])}`}
                              />
                              <div>
                                <div className="text-sm font-medium">{task.title}</div>
                                {task.description && (
                                  <div
                                    className="text-xs text-neutral-500 dark:text-neutral-400 truncate"
                                    style={{ maxWidth: 240 }}
                                  >
                                    {String(task.description).split('\n')[0]}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <button
                                className="modal-button text-sm px-2 py-1"
                                onClick={() => onEditTask(task)}
                              >
                                {t('edit')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoading && <DotLoader text={t('loading')} />}

                  {!isLoading && tasks.length === 0 && holidays.length === 0 && (
                    <div className="text-sm text-neutral-500">{t('no_events_on_day')}</div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* right: other days list */}
          <div className="w-1/3 p-4 xl:p-5 2xl:p-6">
            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3">
              {t('other_days_with_events')}
            </div>
            <div
              className="space-y-2 xl:space-y-2.5 2xl:space-y-3 max-h-64 xl:max-h-72 2xl:max-h-80 overflow-y-auto overflow-x-hidden"
              style={{ scrollbarGutter: 'stable' }}
            >
              {otherDays.length === 0 && (
                <div className="text-sm text-neutral-500">{t('no_other_days')}</div>
              )}
              {otherDays.map((d) => {
                const isSelected = d.date === date;
                return (
                  <motion.button
                    key={d.date}
                    onClick={() => onSelectDay && onSelectDay(d.date)}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className={`modal-button modal-other-day w-full text-left p-2 xl:p-2.5 2xl:p-3 rounded-md flex items-center justify-between ${isSelected ? 'selected-day' : 'hoverable-day'}`}
                  >
                    <div>
                      <div className="text-sm xl:text-[0.95rem] 2xl:text-base font-medium">
                        {dayjs(d.date).format('DD MMM')}
                      </div>
                      <div className="text-xs xl:text-sm text-neutral-500 dark:text-neutral-400">
                        {t('tasks_count_holidays_count', {
                          tasks: d.tasks,
                          holidays: d.holidays,
                        })}
                      </div>
                    </div>
                    <div className="text-sm xl:text-base text-neutral-400 dark:text-neutral-400">
                      ›
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DayEventsModal;
