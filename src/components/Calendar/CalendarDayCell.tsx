import React, { useCallback, useMemo } from "react";
import { styled } from "@stitches/react";
import { Dayjs } from "dayjs";
import { useDroppable, type Active } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import type { Task, ColorType } from "./types"; // Імпорт типів
import { TaskCardDraggable } from "./TaskCardDraggable";
import { TaskInputForm } from "./TaskInputForm";

const DayCell = styled("div", {
  minHeight: "100px",
  padding: "2px 2px",
  textAlign: "left",
  position: "relative",
  fontSize: "1rem",
  fontWeight: "700",
  cursor: "default",
  display: "flex",
  flexDirection: "column",

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
    flexGrow: 1, // Позволяет контейнеру задач растягиваться
    overflowY: "auto", // Добавляет прокрутку, если задач много
    paddingRight: "2px", // Небольшой отступ для скроллбара
  },

  variants: {
    isOutsideMonth: {
      true: {
        backgroundColor: "#ebebeb",
        "& .day-number": {
          color: "#97999a",
        },
        "& .month-abbr": {
          color: "#97999a",
        },
      },
      false: {
        backgroundColor: "#e3e5e6",
        "& .day-number": {
          color: "#47494a",
        },
        "& .month-abbr": {
          color: "#47494a",
        },
      },
    },
    isDragOver: {
      true: {
        outline: "2px solid #007bff",
        backgroundColor: "#dbe8f5",
      },
    },
  },
  defaultVariants: {
    isOutsideMonth: false,
    isDragOver: false,
  },
});

interface CalendarDayCellProps {
  dayInLoop: Dayjs;
  currentMonth: Dayjs;
  dailyEvents: Task[];
  activeDragItem: Active | null;
  handleAddTask: (date: string, title: string, colors: ColorType[]) => void;
  handleUpdateTask: (
    taskId: string,
    title: string,
    colors: ColorType[]
  ) => void;
  handleDeleteTask: (taskId: string) => void;
  activeDayForInput: string | null;
  setActiveDayForInput: React.Dispatch<React.SetStateAction<string | null>>;
  editingTask: Task | null;
  setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dayInLoop,
  currentMonth,
  dailyEvents,
  activeDragItem,
  handleAddTask,
  handleUpdateTask,
  handleDeleteTask,
  activeDayForInput,
  setActiveDayForInput,
  editingTask,
  setEditingTask,
}) => {
  const dayFormatted = dayInLoop.format("YYYY-MM-DD");
  const isOutsideMonth = !dayInLoop.isSame(currentMonth, "month");

  const dailyTasksOnly = dailyEvents.filter(
    (event) => event.eventType === "task"
  );

  // Определение, нужно ли показывать сокращение месяца
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
  });

  // function to handle AddTask
  const handleCellClick = useCallback(() => {
    if (activeDragItem) return; // Prevent cell click if dragging

    if (activeDayForInput === dayFormatted) {
      setActiveDayForInput(null);
      setEditingTask(null);
    } else {
      setActiveDayForInput(dayFormatted); // open input for this day
      // Важливо: скидаємо editingTask, бо клік на саму клітинку означає бажання ДОДАТИ, а не редагувати
      setEditingTask(null);
    }
  }, [
    activeDragItem,
    activeDayForInput,
    dayFormatted,
    setActiveDayForInput,
    setEditingTask,
  ]);

  //function to handle TaskCardClick
  const handleTaskCardClick = useCallback(
    (e: React.MouseEvent, event: Task) => {
      e.stopPropagation(); // stop Event Bubbling, щоб клік не дійшов до DayCell

      if (activeDragItem) return; // Prevent cell click if dragging

      if (event.eventType === "task") {
        setEditingTask(event); // set the task to be edited
        setActiveDayForInput(dayFormatted); // open input for this day
      }
    },
    [activeDragItem, dayFormatted, setActiveDayForInput, setEditingTask]
  );

  return (
    <DayCell
      ref={setDroppableRef}
      isDragOver={isOver && activeDragItem?.data.current?.eventType === "task"}
      isOutsideMonth={isOutsideMonth}
      onClick={handleCellClick}
    >
      <div className="day-number-and-month">
        {showMonthAbbr && (
          <span className="month-abbr">{dayInLoop.format("MMM")}</span>
        )}
        <span className="day-number">{dayInLoop.date()}</span>
        {dailyTasksOnly.length > 0 && (
          <span className="task-count">
            {dailyTasksOnly.length}&nbsp;
            {dailyTasksOnly.length === 1 ? "card" : "cards"}
          </span>
        )}
      </div>
      <div className="tasks-container">
        {" "}
        {/* scrollable container for tasks */}
        <SortableContext
          items={dailyTasksOnly.map((task) => task.id)}
          id={`sortable-day-${dayFormatted}`}
        >
          {dailyEvents.map((event) => (
            <TaskCardDraggable
              key={event.id}
              id={event.id}
              eventType={event.eventType}
              colors={event.colors}
              title={event.title}
              onCardClick={(e) => handleTaskCardClick(e, event)}
            />
          ))}
        </SortableContext>
      </div>
      {activeDayForInput === dayFormatted && (
        <TaskInputForm
          day={dayFormatted}
          initialTitle={editingTask?.title}
          initialColors={editingTask?.colors}
          taskId={editingTask?.id}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask} // Передаем функцию удаления
          onCancel={() => {
            setActiveDayForInput(null);
            setEditingTask(null);
          }}
        />
      )}
    </DayCell>
  );
};
