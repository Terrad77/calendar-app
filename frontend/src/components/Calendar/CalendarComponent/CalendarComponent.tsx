import { useState, useEffect, useTransition, useCallback, useMemo, Suspense, lazy } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import debounce from 'lodash.debounce';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Active,
  type DragEndEvent,
} from '@dnd-kit/core'; // dnd-kit for D&D functionality
import { arrayMove } from '@dnd-kit/sortable';
import type { CalendarEvent, ColorType } from '../../../types/types';
import { TASK_MARKER_COLORS } from '../../../types/types';
import { CalendarDayCell } from '../CalendarDayCellComponent/CalendarDayCellComponent';
const DayEventsModal = lazy(() => import('../DayEventsModalComponent/DayEventsModalComponent'));
import { TaskCardDraggable } from '../TaskCardDraggableComponent/TaskCardDraggableComponent';
import Modal from '../../Modal/Modal';
import { TaskInputForm } from '../TaskInputFormComponent/TaskInputFormComponent';
import { CalendarHeader } from '../CalendarHeaderComponent/CalendarHeaderComponent';
import { CalendarGridHeader } from '../CalendarGridHeaderComponent/CalendarGridHeaderComponent';
import { generateUniqueId } from '../../../utils/idGenerator';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../../redux/hooks';
import { saveLanguageAndCountry } from '../../../redux/user/operations';
import { selectUser } from '../../../redux/user/selectors';

// Extend dayjs with plugins for date comparison
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Tailwind styling moved to JSX
type CalendarProps = {
  events?: CalendarEvent[];
  setEvents?: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
};

// Tailwind styling moved to JSX
// --- KEY for LOCAL STORAGE ---
const LOCAL_STORAGE_KEY = 'calendarTasks';

// --- BASE URL for backend ---
const BACKEND_API_BASE_URL = 'http://localhost:3001';

type RawHoliday = {
  id: string;
  date: string;
  title?: string;
  name?: string;
  countryCode?: string;
};

const isRawHoliday = (value: unknown): value is RawHoliday => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.date === 'string';
};

export const Calendar = ({
  events: externalEvents,
  setEvents: externalSetEvents,
}: CalendarProps) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    const savedCountry = localStorage.getItem('preferredCountry');
    return savedCountry || 'ALL';
  });

  // --- parsing Tasks from Local Storage ---
  const [internalTasks, setInternalTasks] = useState<CalendarEvent[]>(() => {
    try {
      const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (storedTasks) {
        const parsedTasks: unknown = JSON.parse(storedTasks);

        if (Array.isArray(parsedTasks)) {
          return parsedTasks
            .map((task: unknown) => {
              if (
                typeof task === 'object' &&
                task !== null &&
                'date' in task &&
                'title' in task &&
                'eventType' in task
              ) {
                const t = task as {
                  id?: string;
                  date: string;
                  title: string;
                  description?: string;
                  eventType: string;
                  colors?: unknown;
                  countryCode?: string;
                };

                // generate new unique ID if id is not valid
                const safeId = t.id && t.id.trim() !== '' ? t.id : generateUniqueId('task');

                const safeColors: ColorType[] = Array.isArray(t.colors)
                  ? t.colors.filter((color): color is ColorType =>
                      TASK_MARKER_COLORS.includes(color as ColorType)
                    )
                  : [];

                return {
                  id: safeId,
                  date: t.date,
                  title: t.title,
                  description: t.description || '',
                  eventType: t.eventType,
                  colors: t.eventType === 'task' ? safeColors : undefined,
                  countryCode: t.countryCode,
                } as CalendarEvent;
              }
              // fallback for invalid task
              return null;
            })
            .filter((task): task is CalendarEvent => task !== null);
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to load tasks from Local Storage:', error);
      return [];
    }
  });

  const tasks = externalEvents !== undefined ? externalEvents : internalTasks;
  const setTasks = externalSetEvents !== undefined ? externalSetEvents : setInternalTasks;

  // --- loading WorldwideHolidays from own backend ---
  useEffect(() => {
    const fetchWorldwideHolidays = async () => {
      setHolidayError(null);
      startTransition(async () => {
        try {
          const year = currentDate.year();
          const month = viewMode === 'month' ? currentDate.month() + 1 : undefined;

          let url = `${BACKEND_API_BASE_URL}/api/v1/holidays/worldwide?year=${year}`;
          if (month) {
            url += `&month=${month}`;
          }
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Expected JSON but got: ${contentType}`);
          }

          const result = await response.json();

          // get array of holidays
          let holidaysData: unknown[] = [];

          // handling different possible response structures
          if (Array.isArray(result)) {
            // Якщо бекенд повертає масив напряму
            holidaysData = result;
          } else if (result && typeof result === 'object') {
            // Якщо бекенд повертає об'єкт з властивістю holidays
            if (Array.isArray(result.holidays)) {
              holidaysData = result.holidays;
            } else if (Array.isArray(result.data)) {
              holidaysData = result.data;
            } else {
              console.warn('Unexpected response format:', result);
              holidaysData = [];
            }
          } else {
            console.warn('Invalid response:', result);
            holidaysData = [];
          }

          const uniqueHolidaysMap = new Map<string, RawHoliday>();
          holidaysData.filter(isRawHoliday).forEach((holiday) => {
            uniqueHolidaysMap.set(holiday.id, holiday);
          });

          const deduplicatedData = Array.from(uniqueHolidaysMap.values());

          const mappedHolidays: CalendarEvent[] = deduplicatedData.map((holiday) => ({
            id: generateUniqueId('holiday'), // generate new unique ID
            date: holiday.date,
            title: holiday.title || holiday.name || 'Holiday',
            eventType: 'holiday',
            countryCode: holiday.countryCode,
          }));

          setPublicHolidaysWorldwide(mappedHolidays);
        } catch (error: unknown) {
          console.error('Error fetching worldwide public holidays:', error);
          // type guard
          if (error instanceof Error) {
            setHolidayError(
              error.message || 'Failed to fetch worldwide public holidays from backend.'
            );
          } // general errormessage
          else {
            setHolidayError('Failed to fetch worldwide public holidays from backend.');
          }
          setPublicHolidaysWorldwide([]);
        }
      });
    };
    fetchWorldwideHolidays();
  }, [currentDate, viewMode]);

  // --- Save tasks to Local Storage every change in state tasks ---
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save tasks to Local Storage:', error);
    }
  }, [tasks]);

  const [publicHolidaysWorldwide, setPublicHolidaysWorldwide] = useState<CalendarEvent[]>([]);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeDayForInput, setActiveDayForInput] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<CalendarEvent | null>(null);
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<CalendarEvent | null>(null);

  const [searchInputValue, setSearchInputValue] = useState(''); // immediate update input field
  const [searchQuery, setSearchQuery] = useState(''); // Delayed search

  // Close modal on component mount
  useEffect(() => {
    setActiveDayForInput(null);
    setEditingTask(null);
  }, []);

  useEffect(() => {
    const savedCountry = user?.preferredCountry || localStorage.getItem('preferredCountry');
    if (savedCountry && savedCountry !== selectedCountry) {
      setSelectedCountry(savedCountry);
    }
  }, [user?.preferredCountry, selectedCountry]);

  const handleCountryChange = useCallback(
    (countryCode: string) => {
      setSelectedCountry(countryCode);
      localStorage.setItem('preferredCountry', countryCode);

      if (user) {
        dispatch(saveLanguageAndCountry({ preferredCountry: countryCode }));
      }
    },
    [dispatch, user]
  );

  const visibleHolidays = useMemo(() => {
    if (selectedCountry === 'ALL') {
      return publicHolidaysWorldwide;
    }
    return publicHolidaysWorldwide.filter((holiday) => holiday.countryCode === selectedCountry);
  }, [publicHolidaysWorldwide, selectedCountry]);

  // debounce-function  for delay Search input 200ms
  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((value: string) => {
        if (value.trim() !== '') {
          setSearchQuery(value);
        } else {
          setSearchQuery('');
        }
      }, 200),
    []
  );

  // function to handle Search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // immediately update the input value
      setSearchInputValue(e.target.value);
      // debounced updating searchQuery
      debouncedSetSearchQuery(e.target.value);
    },
    [debouncedSetSearchQuery]
  );

  // function to handle immediately Search icon click
  const handleSearchIconClick = useCallback(() => {
    if (searchInputValue.trim() !== '') {
      setSearchQuery(searchInputValue);
    } else {
      setSearchQuery('');
    }
  }, [searchInputValue]);

  // function for filter tasks by Query
  const filteredTasksAndHolidaysByDay = useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();
    const result: {
      [key: string]: { tasks: CalendarEvent[]; holidays: CalendarEvent[] };
    } = {};

    // Determine the range of days to include based on viewMode
    let startDate: Dayjs;
    let endDate: Dayjs;

    if (viewMode === 'month') {
      const firstDayOfMonth = currentDate.startOf('month');
      const lastDayOfMonth = currentDate.endOf('month');
      startDate = firstDayOfMonth.startOf('week');
      endDate = lastDayOfMonth.endOf('week');
    } else {
      startDate = currentDate.startOf('week');
      endDate = currentDate.endOf('week');
    }

    let currentDayInLoop = dayjs(startDate);

    while (currentDayInLoop.isSameOrBefore(endDate, 'day')) {
      const formattedDay = currentDayInLoop.format('YYYY-MM-DD');
      result[formattedDay] = { tasks: [], holidays: [] };
      currentDayInLoop = currentDayInLoop.add(1, 'day');
    }

    // group filtered Tasks
    tasks.forEach((task) => {
      const matchesSearch = task.title.toLowerCase().includes(lowerCaseSearchQuery);

      if (matchesSearch || lowerCaseSearchQuery === '') {
        const taskDate = dayjs(task.date).format('YYYY-MM-DD');
        if (!result[taskDate]) {
          result[taskDate] = { tasks: [], holidays: [] };
        }
        result[taskDate].tasks.push(task);
      }
    });

    // group publicHolidays
    visibleHolidays.forEach((holiday) => {
      const holidayDate = dayjs(holiday.date).format('YYYY-MM-DD');
      if (!result[holidayDate]) {
        result[holidayDate] = { tasks: [], holidays: [] };
      }
      result[holidayDate].holidays.push(holiday);
    });

    // sorting Tasks and Holidays
    Object.keys(result).forEach((date) => {
      result[date].tasks.sort((a, b) => a.id.localeCompare(b.id));
      result[date].holidays.sort((a, b) => a.title.localeCompare(b.title));
    });

    return result;
  }, [tasks, visibleHolidays, searchQuery, currentDate, viewMode]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) =>
      viewMode === 'month' ? prev.subtract(1, 'month') : prev.subtract(1, 'week')
    );
    setActiveDayForInput(null);
    setEditingTask(null);
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => (viewMode === 'month' ? prev.add(1, 'month') : prev.add(1, 'week')));
    setActiveDayForInput(null);
    setEditingTask(null);
  }, [viewMode]);

  const handleViewModeChange = useCallback((mode: 'month' | 'week') => {
    setViewMode(mode);
    setActiveDayForInput(null);
    setEditingTask(null);
  }, []);

  const handleDragStart = useCallback(
    (event: { active: Active }) => {
      // find object CalendarEvent by id with `active`
      const draggedItem = tasks.find((t) => t.id === event.active.id);

      if (draggedItem && draggedItem.eventType === 'task') {
        setActiveDragItem(draggedItem);
      } else {
        setActiveDragItem(null);
      }
    },
    [tasks]
  );

  const today = dayjs().startOf('day'); // define current day

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      // Extracting date from id drop zone
      let targetDay: dayjs.Dayjs | null = null;
      if (typeof over.id === 'string' && over.id.startsWith('day-')) {
        const dateStr = over.id.replace('day-', '');
        targetDay = dayjs(dateStr);
      }

      if (!active.id || !over?.id) {
        setActiveDragItem(null);
        return;
      }

      if (!activeDragItem || activeDragItem.eventType !== 'task') {
        setActiveDragItem(null);
        return;
      }

      // Check that targetDay is valid and not earlier than today
      if (targetDay && targetDay.isBefore(today, 'day')) {
        setActiveDragItem(null);
        return;
      }

      // Drag to another day (change date)
      if (targetDay && activeDragItem.date !== targetDay.format('YYYY-MM-DD')) {
        setTasks((prevTasks) => {
          const updatedTasks = prevTasks.map((task) =>
            task.id === activeDragItem.id
              ? { ...task, date: targetDay!.format('YYYY-MM-DD') }
              : task
          );
          return updatedTasks;
        });
      }
      // Drag and drop within a day (reorder)
      else if (
        // check that over is another task
        typeof over.id === 'string' &&
        tasks.some((t) => t.id === over.id)
      ) {
        const overTask = tasks.find((t) => t.id === over.id);

        // check tasks exist and are on the same date
        if (activeDragItem && overTask && activeDragItem.date === overTask.date) {
          setTasks((prevTasks) => {
            const currentDayTasks = prevTasks.filter((task) => task.date === activeDragItem.date);
            const otherDayTasks = prevTasks.filter((task) => task.date !== activeDragItem.date);

            const activeIndex = currentDayTasks.findIndex((task) => task.id === activeDragItem.id);
            const overIndex = currentDayTasks.findIndex((task) => task.id === over.id);

            if (activeIndex !== -1 && overIndex !== -1) {
              const newOrderDayTasks = arrayMove(currentDayTasks, activeIndex, overIndex);
              return [...otherDayTasks, ...newOrderDayTasks];
            }
            return prevTasks;
          });
        }
      }
      setActiveDragItem(null); // reset activeDragItem after dragging is complete
    },
    [tasks, activeDragItem, setTasks, today]
  );

  const renderedDays = useMemo(() => {
    const allDaysInGrid: Dayjs[] = [];

    // start and end dates for the grid based on view mode
    let startVisibleDate: Dayjs;

    if (viewMode === 'month') {
      // For month view, start from the first day of the week of the first day of the month
      startVisibleDate = currentDate.startOf('month').startOf('week');
      // Generate 42 days (6 weeks) to cover the entire month grid
      for (let i = 0; i < 42; i++) {
        allDaysInGrid.push(startVisibleDate.add(i, 'day'));
      }
    } else {
      // viewMode === "week"
      //start from the first day of the current week
      startVisibleDate = currentDate.startOf('week');
      // Generate 7 days for the week
      for (let i = 0; i < 7; i++) {
        allDaysInGrid.push(startVisibleDate.add(i, 'day'));
      }
    }

    return allDaysInGrid.map((dayInLoop) => {
      const formattedDay = dayInLoop.format('YYYY-MM-DD');
      const dayData = filteredTasksAndHolidaysByDay[formattedDay] || {
        tasks: [],
        holidays: [],
      };

      // ****** logic for Fillers ****** //
      // A day is a "filler" if it's outside the current month (in month view) or outside the current week (in week view)

      const isFiller =
        (viewMode === 'month' && !dayInLoop.isSame(currentDate, 'month')) ||
        (viewMode === 'week' &&
          (!dayInLoop.isSameOrAfter(currentDate.startOf('week'), 'day') ||
            !dayInLoop.isSameOrBefore(currentDate.endOf('week'), 'day')));

      return (
        <CalendarDayCell
          key={dayInLoop.format('YYYY-MM-DD')}
          dayInLoop={dayInLoop}
          currentMonth={currentDate}
          dailyTasks={dayData.tasks} // ={isFiller ? [] : dayData.tasks} to show empty tasks for fillers
          dailyHolidays={dayData.holidays} // ={isFiller ? [] : dayData.holidays} to show empty holidays for fillers
          activeDragItem={activeDragItem}
          activeDayForInput={activeDayForInput}
          setActiveDayForInput={setActiveDayForInput}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          allTasks={tasks}
          isFiller={isFiller}
          onDayClick={(date) => {
            // Always open day modal so user can add an event even when the day is empty
            setDayModalDate(date);
          }}
          onTaskClick={(task) => {
            setEditingTask(task);
          }}
        />
      );
    });
  }, [
    currentDate,
    viewMode,
    filteredTasksAndHolidaysByDay,
    tasks,
    activeDragItem,
    activeDayForInput,
    setActiveDayForInput,
    editingTask,
    setEditingTask,
  ]);

  const handleCloseDayModal = useCallback(() => {
    setDayModalDate(null);
  }, []);

  const handleEditFromDayModal = useCallback((task: CalendarEvent) => {
    setEditingTask(task);
    setDayModalDate(null);
  }, []);

  return (
    <div
      className="flex flex-col w-full gap-4 p-4 sm:p-6 lg:p-6 xl:p-8 2xl:p-10 bg-white dark:bg-neutral-900 rounded-lg shadow-sm dark:shadow-none xl:rounded-2xl 2xl:rounded-[1.5rem]"
      style={{ marginTop: '2px' }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          isPending={isPending}
          selectedCountry={selectedCountry}
          onPrev={handlePrev}
          onNext={handleNext}
          onCountryChange={handleCountryChange}
          onViewModeChange={handleViewModeChange}
          onSearchChange={handleSearchChange}
          searchInputValue={searchInputValue}
          onSearchClick={handleSearchIconClick}
        />

        {isPending && (
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md text-center text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
            Loading worldwide holidays...
          </div>
        )}
        {holidayError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-center text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100">
            {holidayError}
          </div>
        )}
        <CalendarGridHeader />

        <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden">
          {renderedDays}
        </div>

        {/* Day events list modal (opened when day has items) */}
        {dayModalDate && (
          <Suspense fallback={<div className="p-4">Loading...</div>}>
            <DayEventsModal
              isOpen={!!dayModalDate}
              date={dayModalDate}
              tasks={
                (filteredTasksAndHolidaysByDay[dayModalDate] || { tasks: [], holidays: [] }).tasks
              }
              holidays={
                (filteredTasksAndHolidaysByDay[dayModalDate] || { tasks: [], holidays: [] })
                  .holidays
              }
              onClose={handleCloseDayModal}
              onEditTask={handleEditFromDayModal}
              onAdd={(date) => {
                // open creation form for this date
                setActiveDayForInput(date);
                setDayModalDate(null);
              }}
              otherDays={Object.keys(filteredTasksAndHolidaysByDay)
                .filter((d) => d !== dayModalDate)
                .map((d) => ({
                  date: d,
                  tasks: (filteredTasksAndHolidaysByDay[d]?.tasks || []).length,
                  holidays: (filteredTasksAndHolidaysByDay[d]?.holidays || []).length,
                }))
                .filter((x) => x.tasks + x.holidays > 0)}
              onSelectDay={(d) => setDayModalDate(d)}
            />
          </Suspense>
        )}

        {/* Top-level modal for editing/creating tasks (opened when editingTask is set) */}
        <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)}>
          {editingTask && (
            <TaskInputForm
              initialTask={editingTask}
              onSave={(task) => {
                // update tasks
                setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
                setEditingTask(null);
              }}
              onDuplicate={(task) => {
                setTasks((prev) => [...prev, task]);
                setEditingTask(null);
              }}
              onCancel={() => setEditingTask(null)}
              onDelete={(taskId) => {
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
                setEditingTask(null);
              }}
            />
          )}
        </Modal>

        {/* Top-level modal for creating a new task on a selected day */}
        <Modal
          isOpen={!!activeDayForInput && !editingTask}
          onClose={() => setActiveDayForInput(null)}
        >
          {activeDayForInput && !editingTask && (
            <TaskInputForm
              initialDate={activeDayForInput}
              onSave={(task) => {
                setTasks((prev) => [...prev, task]);
                setActiveDayForInput(null);
              }}
              onDuplicate={(task) => {
                setTasks((prev) => [...prev, task]);
                setActiveDayForInput(null);
              }}
              onCancel={() => {
                const reopenDate = activeDayForInput;
                setActiveDayForInput(null);
                if (reopenDate) {
                  setDayModalDate(reopenDate);
                }
              }}
              onDelete={(taskId) => {
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
                setActiveDayForInput(null);
              }}
            />
          )}
        </Modal>

        <DragOverlay>
          {activeDragItem && (
            <TaskCardDraggable event={activeDragItem} isDragging={true} customCursor="grabbing" />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Calendar;
