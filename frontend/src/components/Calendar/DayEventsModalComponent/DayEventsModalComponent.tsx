import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../../Modal/Modal';
import type { CalendarEvent } from '../../../types/types';
import Logo from '../../Logo/Logo';

type Props = {
  date: string;
  tasks: CalendarEvent[];
  holidays: CalendarEvent[];
  isOpen: boolean;
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
  onClose,
  onEditTask,
  onAdd,
  otherDays = [],
  onSelectDay,
}) => {
  const isPastDay = dayjs(date).isBefore(dayjs().startOf('day'), 'day');

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-3xl xl:max-w-4xl 2xl:max-w-5xl rounded-lg overflow-hidden">
        {/* header */}
        <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center justify-center w-10 h-10 xl:w-11 xl:h-11 2xl:w-12 2xl:h-12 rounded-full bg-white/80 dark:bg-slate-800/70 border border-neutral-100 dark:border-neutral-700 shadow-sm">
              <div className="w-7 h-7 xl:w-8 xl:h-8 2xl:w-9 2xl:h-9">
                <Logo />
              </div>
            </div>
            <div>
              <div className="text-sm xl:text-[0.95rem] 2xl:text-base text-neutral-500 dark:text-neutral-400">
                День
              </div>
              <div className="text-lg xl:text-[1.15rem] 2xl:text-[1.2rem] font-semibold text-neutral-900 dark:text-neutral-100">
                {dayjs(date).format('DD MMMM YYYY')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="text-sm xl:text-[0.95rem] 2xl:text-base px-3 py-1 xl:px-4 xl:py-1.5 2xl:px-5 2xl:py-2 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onAdd && onAdd(date)}
              disabled={isPastDay}
              title={isPastDay ? 'Past events can only be edited or deleted' : undefined}
            >
              Додати подію
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex">
          {/* left: animated content for selected day */}
          <div className="w-2/3 p-4 xl:p-5 2xl:p-6 border-r border-neutral-100 dark:border-neutral-800">
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
                        Свята
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
                        Задачи
                      </div>
                      <div className="space-y-2">
                        {tasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2.5 h-2 rounded-sm ${getColorClass(t.colors && t.colors[0])}`}
                              />
                              <div>
                                <div className="text-sm font-medium">{t.title}</div>
                                {t.description && (
                                  <div
                                    className="text-xs text-neutral-500 dark:text-neutral-400 truncate"
                                    style={{ maxWidth: 240 }}
                                  >
                                    {String(t.description).split('\n')[0]}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <button
                                className="text-sm px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                                onClick={() => onEditTask(t)}
                              >
                                Редактировать
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tasks.length === 0 && holidays.length === 0 && (
                    <div className="text-sm text-neutral-500">Нет событий на этот день.</div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* right: other days list */}
          <div className="w-1/3 p-4 xl:p-5 2xl:p-6">
            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3">
              Другие дни с событиями
            </div>
            <div className="space-y-2 xl:space-y-2.5 2xl:space-y-3 max-h-64 xl:max-h-72 2xl:max-h-80 overflow-auto">
              {otherDays.length === 0 && (
                <div className="text-sm text-neutral-500">Нет других дней</div>
              )}
              {otherDays.map((d) => {
                const isSelected = d.date === date;
                return (
                  <motion.button
                    key={d.date}
                    onClick={() => onSelectDay && onSelectDay(d.date)}
                    animate={
                      isSelected
                        ? {
                            scale: [1, 1.02, 1],
                            boxShadow: [
                              '0 0 0 rgba(0,0,0,0)',
                              '0 10px 30px rgba(59,130,246,0.08)',
                              '0 0 0 rgba(0,0,0,0)',
                            ],
                          }
                        : { scale: 1 }
                    }
                    transition={
                      isSelected
                        ? { duration: 1.0, repeat: Infinity, repeatDelay: 0.6 }
                        : { duration: 0.18 }
                    }
                    className={`w-full text-left p-2 xl:p-2.5 2xl:p-3 rounded-md flex items-center justify-between ${isSelected ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-primary-500 dark:border-primary-400' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                  >
                    <div>
                      <div className="text-sm xl:text-[0.95rem] 2xl:text-base font-medium">
                        {dayjs(d.date).format('DD MMM')}
                      </div>
                      <div className="text-xs xl:text-sm text-neutral-500 dark:text-neutral-400">
                        {d.tasks} задач · {d.holidays} праздников
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
