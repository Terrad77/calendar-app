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
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div
          className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/70 border border-neutral-100 dark:border-neutral-700 shadow-sm"
          style={{ left: 14, top: 14, zIndex: 2 }}
        >
          <div className="w-7 h-7">
            <Logo />
          </div>
        </div>
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 pl-12 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm text-neutral-500">День</div>
              <div className="text-lg font-semibold">{dayjs(date).format('DD MMMM YYYY')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="text-sm px-3 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              onClick={() => onAdd && onAdd(date)}
            >
              Додати подію
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex">
          {/* left: animated content for selected day */}
          <div className="w-2/3 p-4 border-r border-neutral-100 dark:border-neutral-800">
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
                                style={{
                                  width: 10,
                                  height: 8,
                                  borderRadius: 4,
                                  background:
                                    (t.colors && t.colors[0]) === 'red'
                                      ? '#f05050'
                                      : (t.colors && t.colors[0]) === 'yellow'
                                        ? '#f2d200'
                                        : (t.colors && t.colors[0]) === 'green'
                                          ? '#62c050'
                                          : '#9ca3af',
                                }}
                              />
                              <div>
                                <div className="text-sm font-medium">{t.title}</div>
                                {t.description && (
                                  <div
                                    className="text-xs text-neutral-500 truncate"
                                    style={{ maxWidth: 240 }}
                                  >
                                    {String(t.description).split('\n')[0]}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <button
                                className="text-sm px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800"
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
          <div className="w-1/3 p-4">
            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3">
              Другие дни с событиями
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
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
                    className={`w-full text-left p-2 rounded-md flex items-center justify-between ${isSelected ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-primary-500' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                  >
                    <div>
                      <div className="text-sm font-medium">{dayjs(d.date).format('DD MMM')}</div>
                      <div className="text-xs text-neutral-500">
                        {d.tasks} задач · {d.holidays} праздников
                      </div>
                    </div>
                    <div className="text-sm text-neutral-400">›</div>
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
