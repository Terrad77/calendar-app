import { useCallback, useMemo } from "react";
import { styled } from "@stitches/react";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useDroppable, type Active } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import type { CalendarEvent, EventType } from "../../types";
import { TaskCardDraggable } from "./TaskCardDraggable";
import { TaskInputForm } from "./TaskInputForm";

dayjs.extend(isBetween);

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

const DayCell = styled("div", {
  minHeight: "var(--calendar-day-cell-min-height, 120px)",
  padding: "2px 2px",
  textAlign: "left",
  position: "relative",
  fontSize: "1rem",
  fontWeight: "700",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  "& .day-number-and-month": {
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
    marginBottom: "2px",
  },
  "& .task-count": {
    color: "#97999a",
    fontSize: "0.75rem",
    marginLeft: "2px",
  },
  "& .tasks-container": {
    flexGrow: 1,
    overflowY: "auto",
    paddingRight: "2px",
    overflowX: "hidden",
  },
  variants: {
    isOutsideMonth: {
      true: {
        backgroundColor: "#ebebeb",
        color: "#97999a",
        "& .day-number": {
          color: "#97999a",
        },
        "& .month-abbr": {
          color: "#97999a",
        },
      },
      false: {
        backgroundColor: "#e3e5e6",
        color: "#47494a",
        "& .day-number": {
          color: "#47494a",
        },
        "& .month-abbr": {
          color: "#47494a",
        },
      },
    },
    isToday: {
      true: {
        backgroundColor: "#e6f7ff",
      },
    },
    isDragOver: {
      true: {
        outline: "2px solid #007bff",
        backgroundColor: "#dbe8f5",
      },
    },
    isFiller: {
      true: {
        backgroundColor: "#f9f9f9",
        color: "#ccc",
        opacity: 0.6,
      },
    },
    isPastDate: {
      true: {
        opacity: 0.5,
        backgroundColor: "#f0f0f0",
      },
    },
    isInteractive: {
      true: { cursor: "pointer", pointerEvents: "auto" },
      false: { cursor: "default", pointerEvents: "none" },
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

const HolidayName = styled("div", {
  fontSize: "0.85em",
  fontWeight: "bold",
  color: "#dc3545", // Червоний колір для свят
  marginBottom: "4px",
  padding: "2px 4px",
  borderRadius: "3px",
  backgroundColor: "#f8d7da", // Світло-червоний фон
  border: "1px solid #f5c6cb",
  textAlign: "left",
  whiteSpace: "wrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const DayNumber = styled("span", {
  variants: {
    isCurrentMonth: {
      true: { color: "#47494a" },
      false: { color: "#97999a" },
    },
    isToday: {
      true: {
        color: "#fff",
        backgroundColor: "#007bff", // for current day
        borderRadius: "50%",
        padding: "2px 6px",
        fontSize: "0.9em",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
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
  const dayFormatted = dayInLoop.format("YYYY-MM-DD");
  const today = dayjs().startOf("day");
  const isOutsideActualMonth = !dayInLoop.isSame(currentMonth, "month");
  const isToday = dayjs().isSame(dayInLoop, "day");
  const isPastDate = dayInLoop.isBefore(today, "day");

  const shouldBeInteractive = !isPastDate;

  // show abbr of month for first & last day of month
  const showMonthAbbr = useMemo(() => {
    const isFirstDayOfItsMonth = dayInLoop.date() === 1;
    const isLastDayOfItsMonth = dayInLoop.isSame(
      dayInLoop.endOf("month"),
      "day"
    );
    return isFirstDayOfItsMonth || isLastDayOfItsMonth;
  }, [dayInLoop]);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `day-${dayFormatted}`,
    // prevent target for Drag&Drop if cell is must be not interacive
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

      if (event.eventType === "task") {
        setEditingTask(event); // set the task to be edited
        setActiveDayForInput(dayFormatted); // open input for this day
      }
    },
    [
      shouldBeInteractive,
      activeDragItem,
      dayFormatted,
      setActiveDayForInput,
      setEditingTask,
    ]
  );

  // Save function
  const handleSaveTaskForm = useCallback(
    (taskData: CalendarEvent) => {
      setAllTasks((prevTasks) => {
        // if exist initialTask (editingTask), editing
        if (editingTask) {
          return prevTasks.map((task) =>
            task.id === taskData.id ? taskData : task
          );
        } else {
          // Add new Task
          return [...prevTasks, taskData];
        }
      });
      // Close forms after Save
      setActiveDayForInput(null);
      setEditingTask(null);
    },
    [editingTask, setAllTasks, setActiveDayForInput, setEditingTask] // Залежності
  );

  // Delete function
  const handleDeleteTaskForm = useCallback(
    (taskId: string) => {
      setAllTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== taskId)
      );
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
      isDragOver={isOver && activeDragItem?.eventType === "task"}
      isOutsideMonth={isOutsideActualMonth}
      isFiller={isFiller}
      isPastDate={isPastDate}
      isInteractive={shouldBeInteractive}
      onClick={handleCellClick}
    >
      <div className="day-number-and-month">
        {showMonthAbbr && (
          <span className="month-abbr">{dayInLoop.format("MMM")}</span>
        )}
        <DayNumber isCurrentMonth={!isOutsideActualMonth} isToday={isToday}>
          {dayInLoop.date()}
        </DayNumber>
        {/* task counter */}
        {dailyTasks.length > 0 && (
          <span className="task-count">
            {dailyTasks.length}&nbsp;
            {dailyTasks.length === 1 ? "card" : "cards"}
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
            <TaskCardDraggable
              key={task.id}
              event={task}
              onCardClick={handleTaskCardClick}
            />
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
