import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@stitches/react';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween'; // plugin for checking if a date is between two dates
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { CalendarEvent } from '../../../types/calendar.types';
import { TaskCardDraggable } from '../TaskCardDraggableComponent/TaskCardDraggableComponent';
import { useLanguage } from '../../../hooks/useLanguage';

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
  allTasks: CalendarEvent[];
  isFiller: boolean;
  onDayClick?: (date: string) => void;
  onTaskClick?: (task: CalendarEvent) => void;
}

const DayCell = styled('div', {
  minHeight: 'var(--calendar-day-cell-min-height, 100px)',
  padding: '4px',
  textAlign: 'left',
  position: 'relative',
  fontSize: '0.88rem',
  fontWeight: '600',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: '14px',
  border: '1px solid var(--surface-calendar-cell-border)',
  boxShadow: '0 4px 14px var(--surface-calendar-cell-shadow)',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 8px 20px var(--surface-calendar-cell-hover-shadow)',
  },
  '& .day-number-and-month': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: '4px',
  },
  '& .task-count': {
    color: 'var(--surface-calendar-muted)',
    fontSize: '0.6rem',
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
  '& .tasks-container': {
    flexGrow: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    maxHeight: '50px',
    paddingRight: '2px',
    paddingBottom: '30px',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--surface-calendar-muted) transparent',
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'var(--surface-calendar-muted)',
      borderRadius: '999px',
      border: '2px solid transparent',
      backgroundClip: 'padding-box',
    },
  },
  variants: {
    isOutsideMonth: {
      true: {
        backgroundColor: 'var(--surface-calendar-outside-bg)',
        color: 'var(--surface-calendar-muted)',
        '& .day-number': {
          color: 'var(--surface-calendar-muted)',
        },
        '& .month-abbr': {
          color: 'var(--surface-calendar-muted)',
        },
      },
      false: {
        backgroundColor: 'var(--surface-calendar-cell)',
        color: 'var(--surface-calendar-text)',
        '& .day-number': {
          color: 'var(--surface-calendar-text)',
        },
        '& .month-abbr': {
          color: 'var(--surface-calendar-muted)',
        },
      },
    },
    isToday: {
      true: {
        borderColor: 'var(--surface-calendar-today-border)',
        boxShadow: '0 10px 24px var(--surface-calendar-today-shadow)',
      },
    },
    isDragOver: {
      true: {
        outline:
          '2px solid color-mix(in srgb, var(--surface-calendar-today-border) 50%, transparent)',
        backgroundColor: 'var(--surface-calendar-dragover-bg)',
      },
    },
    isFiller: {
      true: {
        backgroundColor: 'var(--surface-calendar-filler-bg)',
        color: 'var(--surface-calendar-filler-text)',
        opacity: 0.75,
      },
    },
    isPastDate: {
      true: {
        opacity: 0.65,
        backgroundColor: 'var(--surface-calendar-past-bg)',
      },
    },
    isInteractive: {
      true: { cursor: 'pointer', pointerEvents: 'auto' },
      false: { cursor: 'default', pointerEvents: 'auto' },
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
  fontSize: '0.68rem',
  fontWeight: '600',
  color: 'var(--surface-calendar-holiday-text)',
  marginBottom: '4px',
  padding: '2px 6px',
  borderRadius: '999px',
  backgroundColor: 'var(--surface-calendar-holiday-bg)',
  border: '1px solid var(--surface-calendar-holiday-border)',
  textAlign: 'left',
  whiteSpace: 'wrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const DayNumber = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '22px',
  minHeight: '22px',
  padding: '0 6px',
  borderRadius: '999px',
  variants: {
    isCurrentMonth: {
      true: { color: 'var(--surface-calendar-day-number-current)' },
      false: { color: 'var(--surface-calendar-day-number-outside)' },
    },
    isToday: {
      true: {
        color: 'var(--surface-calendar-number-today-text)',
        backgroundColor: 'var(--surface-calendar-number-today-bg)',
        fontSize: '0.85em',
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
  activeDayForInput: _activeDayForInput,
  setActiveDayForInput: _setActiveDayForInput,
  editingTask: _editingTask,
  setEditingTask: _setEditingTask,
  // setAllTasks removed; not needed here
  isFiller,
  onDayClick,
  onTaskClick,
}) => {
  const { currentLanguage } = useLanguage(); // get current language
  const locale = currentLanguage === 'uk' ? 'uk' : 'en';
  const { t } = useTranslation('common');
  const dayFormatted = dayInLoop.format('YYYY-MM-DD');
  const today = dayjs().startOf('day');
  const isOutsideActualMonth = !dayInLoop.isSame(currentMonth, 'month');
  const isToday = dayjs().isSame(dayInLoop, 'day');
  const isPastDate = dayInLoop.isBefore(today, 'day');
  const canCreateEvent = !isPastDate;

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
    disabled: !canCreateEvent,
  });

  // detect whether tasks container is overflowing; if not, disable scroll
  const tasksRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [hiddenTaskCount, setHiddenTaskCount] = useState(0);

  useEffect(() => {
    const el = tasksRef.current;
    if (!el) return undefined;

    let frameId = 0;

    const check = () => {
      const children = Array.from(el.children) as HTMLElement[];
      const containerRect = el.getBoundingClientRect();

      const belowWindowCount = children.reduce((count, child) => {
        const childRect = child.getBoundingClientRect();
        return childRect.top >= containerRect.bottom ? count + 1 : count;
      }, 0);

      setHiddenTaskCount(belowWindowCount);

      // read computed max-height from CSS (e.g. '50px')
      const computed = getComputedStyle(el).maxHeight;
      let maxH: number;
      if (computed && computed !== 'none') {
        const parsed = parseFloat(computed);
        maxH = Number.isFinite(parsed) ? parsed : el.clientHeight;
      } else {
        // fallback to clientHeight if no CSS max-height
        maxH = el.clientHeight;
      }
      // compare total scroll height to the constrained max height
      setHasOverflow(el.scrollHeight > maxH + 1);
    };

    const scheduleCheck = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(check);
    };

    scheduleCheck();
    const ro = new ResizeObserver(scheduleCheck);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener('resize', scheduleCheck);
    el.addEventListener('scroll', scheduleCheck, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', scheduleCheck);
      el.removeEventListener('scroll', scheduleCheck);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [dailyTasks]);

  // function to handle Cell Click (add new task)
  const handleCellClick = useCallback(() => {
    // open day list modal on any click (empty or not), unless dragging
    if (activeDragItem) return;
    if (typeof onDayClick === 'function') onDayClick(dayFormatted);
  }, [activeDragItem, dayFormatted, onDayClick]);

  //function to handle TaskCardClick (edit existing task)
  const handleTaskCardClick = useCallback(
    (e: React.MouseEvent, event: CalendarEvent) => {
      e.stopPropagation(); // stop Event Bubbling, to prevent click from reaching DayCell
      if (activeDragItem) return;

      if (typeof onTaskClick === 'function') {
        onTaskClick(event);
      }
    },
    [activeDragItem, onTaskClick]
  );

  // Note: creation/editing handled by parent via callbacks; keep cell lean.

  return (
    <DayCell
      ref={setDroppableRef}
      isDragOver={isOver && activeDragItem?.eventType === 'task'}
      isOutsideMonth={isOutsideActualMonth}
      isFiller={isFiller}
      isPastDate={isPastDate}
      isInteractive={canCreateEvent}
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
            {dailyTasks.length === 1 ? t('card') : t('cards')}
          </span>
        )}
      </div>

      <div className="holidays-container">
        {dailyHolidays.map((holiday) => (
          <HolidayName key={holiday.id}>{holiday.title}</HolidayName>
        ))}
      </div>
      <div
        className="tasks-container"
        ref={tasksRef}
        style={{ overflowY: hasOverflow ? 'auto' : 'hidden', overflowX: 'hidden' }}
      >
        <SortableContext
          items={dailyTasks.map((task) => task.id)}
          id={`sortable-day-${dayFormatted}`}
        >
          {dailyTasks.map((task) => (
            <TaskCardDraggable
              key={task.id}
              event={task}
              onCardClick={handleTaskCardClick}
              compact
            />
          ))}
        </SortableContext>
      </div>
      {hiddenTaskCount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 12,
            background: 'var(--surface-calendar-holiday-bg)',
            color: 'var(--surface-calendar-holiday-text)',
            padding: '4px 8px',
            borderRadius: 999,
            fontSize: '0.72rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--surface-calendar-holiday-border)',
            backdropFilter: 'blur(6px)',
          }}
        >
          +{hiddenTaskCount}
        </div>
      )}
    </DayCell>
  );
};
