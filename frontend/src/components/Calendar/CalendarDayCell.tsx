import { useCallback, useMemo } from 'react';
import { styled } from '@stitches/react';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'; // plugin for checking if a date is between two dates
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { CalendarEvent } from '../../types/types';
import { TaskCardDraggable } from './TaskCardDraggable';
import { TaskInputForm } from './TaskInputForm';
import { useLanguage } from '../../hooks/useLanguage';

dayjs.extend(isBetween); // extend dayjs with isBetween plugin

interface CalendarDayCellProps {
  dayInLoop: Dayjs;
  currentMonth: Dayjs;
  dailyTasks: CalendarEvent[];
  dailyHolidays: CalendarEvent[];
  activeDragItem: CalendarEvent | null;
  activeDayForInput: string | null;
  setActiveDayForInput: React.Dispatch<React.SetStateAction<string | null>>;
  editingTask: CalendarEvent | null;
  setEditingTask: (task: CalendarEvent | null) => void;
  setAllTasks: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  allTasks: CalendarEvent[];
  isFiller: boolean;
}

const DayCell = styled('div', {
  minHeight: 'var(--calendar-day-cell-min-height, 120px)',
  padding: '8px',
  textAlign: 'left',
  position: 'relative',
  fontSize: '0.92rem',
  fontWeight: '600',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 4px 14px rgba(15,23,42,0.05)',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
  },
  '& .day-number-and-month': {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '6px',
  },
  '& .task-count': {
    color: '#6b7280',
    fontSize: '0.72rem',
    marginLeft: '2px',
  },
  '& .tasks-container': {
    flexGrow: 1,
    overflowY: 'auto',
    paddingRight: '2px',
    overflowX: 'hidden',
  },
  variants: {
    isOutsideMonth: {
      true: {
        backgroundColor: 'rgba(249,250,251,0.95)',
        color: '#9ca3af',
        '& .day-number': {
          color: '#9ca3af',
        },
        '& .month-abbr': {
          color: '#9ca3af',
        },
      },
      false: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        color: '#374151',
        '& .day-number': {
          color: '#374151',
        },
        '& .month-abbr': {
          color: '#4b5563',
        },
      },
    },
    isToday: {
      true: {
        borderColor: 'rgba(59,130,246,0.35)',
        boxShadow: '0 10px 24px rgba(59,130,246,0.14)',
      },
    },
    isDragOver: {
      true: {
        outline: '2px solid rgba(59,130,246,0.5)',
        backgroundColor: 'rgba(239,246,255,0.95)',
      },
    },
    isFiller: {
      true: {
        backgroundColor: 'rgba(249,250,251,0.9)',
        color: '#d1d5db',
        opacity: 0.75,
      },
    },
    isPastDate: {
      true: {
        opacity: 0.65,
        backgroundColor: 'rgba(243,244,246,0.92)',
      },
    },
    isInteractive: {
      true: { cursor: 'pointer', pointerEvents: 'auto' },
      false: { cursor: 'default', pointerEvents: 'none' },
    },
  },
  defaultVariants: {
    isOutsideMonth: false,
    isToday: false,
    isDragOver: false,
    isFiller: false,
    isPastDate: false,
    isInteractive: true,
  },
});

const HolidayName = styled('div', {
  fontSize: '0.74rem',
  fontWeight: '600',
  color: '#be123c',
  marginBottom: '6px',
  padding: '4px 8px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 228, 230, 0.85)',
  border: '1px solid rgba(251, 113, 133, 0.35)',
  textAlign: 'left',
  whiteSpace: 'wrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const DayNumber = styled('span', {
  variants: {
    isCurrentMonth: {
      true: { color: '#374151' },
      false: { color: '#9ca3af' },
    },
    isToday: {
      true: {
        color: '#fff',
        backgroundColor: '#2563eb',
        borderRadius: '50%',
        padding: '3px 7px',
        fontSize: '0.9em',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
  },
});

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dayInLoop,
  currentMonth,
  dailyTasks,
  dailyHolidays,
  activeDragItem,
  activeDayForInput,
  setActiveDayForInput,
  editingTask,
  setEditingTask,
  setAllTasks,
  isFiller,
}) => {
  const { currentLanguage } = useLanguage(); // get current language
  const locale = currentLanguage === 'uk' ? 'uk' : 'en';
  const dayFormatted = dayInLoop.format('YYYY-MM-DD');
  const today = dayjs().startOf('day');
  const isOutsideActualMonth = !dayInLoop.isSame(currentMonth, 'month');
  const isToday = dayjs().isSame(dayInLoop, 'day');
  const isPastDate = dayInLoop.isBefore(today, 'day');

  const shouldBeInteractive = !isPastDate;

  // show title (abbr of month) for first & last day of month
  const showMonthAbbr = useMemo(() => {
    const isFirstDayOfItsMonth = dayInLoop.date() === 1;
    const isLastDayOfItsMonth = dayInLoop.isSame(dayInLoop.endOf('month'), 'day');

    if (isFirstDayOfItsMonth || isLastDayOfItsMonth) {
      return dayInLoop.locale(locale).format('MMM');
    }
    return null;
  }, [dayInLoop, locale]);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `day-${dayFormatted}`,
    // prevent target for Drag&Drop if cell is must be not interactive
    disabled: !shouldBeInteractive,
  });

  // function to handle Cell Click (add new task)
  const handleCellClick = useCallback(() => {
    if (!shouldBeInteractive || activeDragItem) return;

    if (activeDayForInput === dayFormatted) {
      setActiveDayForInput(null);
      setEditingTask(null);
    } else {
      setActiveDayForInput(dayFormatted); // open input for this day
      setEditingTask(null);
    }
  }, [
    shouldBeInteractive,
    activeDragItem,
    activeDayForInput,
    dayFormatted,
    setActiveDayForInput,
    setEditingTask,
  ]);

  //function to handle TaskCardClick (edit existing task)
  const handleTaskCardClick = useCallback(
    (e: React.MouseEvent, event: CalendarEvent) => {
      e.stopPropagation(); // stop Event Bubbling, to prevent click from reaching DayCell

      if (!shouldBeInteractive || activeDragItem) return;

      if (event.eventType === 'task') {
        setEditingTask(event); // set the task to be edited
        setActiveDayForInput(dayFormatted); // open input for this day
      }
    },
    [shouldBeInteractive, activeDragItem, dayFormatted, setActiveDayForInput, setEditingTask]
  );

  // Save function
  const handleSaveTaskForm = useCallback(
    (taskData: CalendarEvent) => {
      setAllTasks((prevTasks) => {
        // if exist initialTask (editingTask), editing
        if (editingTask) {
          return prevTasks.map((task) => (task.id === taskData.id ? taskData : task));
        } else {
          // Add new Task
          return [...prevTasks, taskData];
        }
      });
      // Close forms after Save
      setActiveDayForInput(null);
      setEditingTask(null);
    },
    [editingTask, setAllTasks, setActiveDayForInput, setEditingTask]
  );

  // Delete function
  const handleDeleteTaskForm = useCallback(
    (taskId: string) => {
      setAllTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      setActiveDayForInput(null);
      setEditingTask(null);
    },
    [setAllTasks, setActiveDayForInput, setEditingTask]
  );

  // Cancel function
  const handleCancelForm = useCallback(() => {
    setActiveDayForInput(null);
    setEditingTask(null);
  }, [setActiveDayForInput, setEditingTask]);

  return (
    <DayCell
      ref={setDroppableRef}
      isDragOver={isOver && activeDragItem?.eventType === 'task'}
      isOutsideMonth={isOutsideActualMonth}
      isFiller={isFiller}
      isPastDate={isPastDate}
      isInteractive={shouldBeInteractive}
      onClick={handleCellClick}
    >
      <div className="day-number-and-month">
        {/* show title (abbr of month) if it exists */}
        {showMonthAbbr && (
          <span className="month-abbr" style={{ textTransform: 'capitalize' }}>
            {showMonthAbbr}
          </span>
        )}
        <DayNumber isCurrentMonth={!isOutsideActualMonth} isToday={isToday}>
          {dayInLoop.date()}
        </DayNumber>
        {/* task counter */}
        {dailyTasks.length > 0 && (
          <span className="task-count">
            {dailyTasks.length}&nbsp;
            {dailyTasks.length === 1 ? 'card' : 'cards'}
          </span>
        )}
      </div>

      <div className="holidays-container">
        {dailyHolidays.map((holiday) => (
          <HolidayName key={holiday.id}>{holiday.title}</HolidayName>
        ))}
      </div>
      <div className="tasks-container">
        <SortableContext
          items={dailyTasks.map((task) => task.id)}
          id={`sortable-day-${dayFormatted}`}
        >
          {dailyTasks.map((task) => (
            <TaskCardDraggable key={task.id} event={task} onCardClick={handleTaskCardClick} />
          ))}
        </SortableContext>
      </div>
      {/* show TaskInputForm only for interactive days */}
      {activeDayForInput === dayFormatted && shouldBeInteractive && (
        <TaskInputForm
          initialTask={editingTask}
          onSave={handleSaveTaskForm}
          onCancel={handleCancelForm}
          onDelete={handleDeleteTaskForm}
          initialDate={editingTask ? undefined : dayFormatted}
        />
      )}
    </DayCell>
  );
};
