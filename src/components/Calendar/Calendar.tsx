// src/components/Calendar/Calendar.tsx
import {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import { styled } from "@stitches/react";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

// dnd-kit for D&D functionality
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
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

// Импортируем дочерние компоненты и типы
import type { PublicHolidayApiResponse, Task, ColorType } from "./types";
import { CalendarDayCell } from "./CalendarDayCell";
import { TaskCardDraggable } from "./TaskCardDraggable";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGridHeader } from "./CalendarGridHeader";

// Extend dayjs with plugins for date comparison
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const Wrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1400px", // Увеличил максимальную ширину
  margin: "0 auto",
  backgroundColor: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  overflow: "hidden",
});

const CalendarGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "4px",
  backgroundColor: "#edeff1",

  "@media (max-width: 768px)": {
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", // Адаптивная сетка
  },
});

const StatusMessage = styled("div", {
  padding: "8px 16px",
  backgroundColor: "#fffbe6",
  color: "#856404",
  border: "1px solid #ffeeba",
  borderRadius: "4px",
  margin: "12px",
  textAlign: "center",
  variants: {
    type: {
      error: {
        backgroundColor: "#f8d7da",
        color: "#721c24",
        border: "1px solid #f5c6cb",
      },
      loading: {
        backgroundColor: "#d1ecf1",
        color: "#0c5460",
        border: "1px solid #bee5eb",
      },
    },
  },
});

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      date: "2025-06-10",
      title: "Запланировать встречу",
      colors: ["blue"],
      eventType: "task",
    },
    {
      id: "2",
      date: "2025-06-10",
      title: "Подготовить отчет",
      colors: ["green", "orange"],
      eventType: "task",
    },
    {
      id: "3",
      date: "2025-06-15",
      title: "Купить продукты",
      colors: ["orange"],
      eventType: "task",
    },
    {
      id: "4",
      date: "2025-06-15",
      title: "Позвонить отцу",
      colors: ["default"],
      eventType: "task",
    },
    {
      id: "5",
      date: "2025-07-01",
      title: "Начать новый проект",
      eventType: "task",
    },
    {
      id: "6",
      date: "2025-06-10",
      title: "Забрать почту",
      colors: ["yellow"],
      eventType: "task",
    },
  ]);

  const [publicHolidays, setPublicHolidays] = useState<Task[]>([]);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>("UA");
  const [isPending, startTransition] = useTransition();

  const [activeDayForInput, setActiveDayForInput] = useState<string | null>(
    null
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);

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

  useEffect(() => {
    const fetchPublicHolidays = async () => {
      setHolidayError(null);
      try {
        const year = currentDate.year();
        const response = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: PublicHolidayApiResponse[] = await response.json();

        const mappedHolidays: Task[] = data.map((holiday) => ({
          id: `holiday-${holiday.date}-${
            holiday.countryCode
          }-${holiday.name.replace(/\s/g, "-")}`,
          date: holiday.date,
          title: holiday.localName || holiday.name,
          eventType: "holiday",
        }));

        startTransition(() => {
          setPublicHolidays(mappedHolidays);
        });
      } catch (error) {
        console.error("Error fetching public holidays:", error);
        setHolidayError(
          "Failed to fetch public holidays. Please try again later."
        );
        setPublicHolidays([]);
      }
    };
    fetchPublicHolidays();
  }, [currentDate, countryCode]);

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) =>
      viewMode === "month"
        ? prev.subtract(1, "month")
        : prev.subtract(1, "week")
    );
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) =>
      viewMode === "month" ? prev.add(1, "month") : prev.add(1, "week")
    );
  }, [viewMode]);

  const handleCountryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setCountryCode(event.target.value);
    },
    []
  );

  const handleViewModeChange = useCallback((mode: "month" | "week") => {
    setViewMode(mode);
  }, []);

  const handleAddTask = useCallback(
    (date: string, title: string, colors: ColorType[]) => {
      const newTask: Task = {
        id: String(Date.now()), // simple Unique ID based on timestamp
        date,
        title,
        eventType: "task",
        colors,
      };
      setTasks((prevTasks) => [...prevTasks, newTask]);
      setActiveDayForInput(null);
      setEditingTask(null);
    },
    []
  );

  const handleUpdateTask = useCallback(
    (taskId: string, newTitle: string, newColors: ColorType[]) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? { ...task, title: newTitle, colors: newColors }
            : task
        )
      );
      setEditingTask(null);
      setActiveDayForInput(null);
    },
    []
  );

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    setEditingTask(null);
    setActiveDayForInput(null);
  }, []);

  const handleDragStart = useCallback((event: { active: Active }) => {
    if (event.active.data.current?.eventType === "task") {
      setActiveDragItem(event.active);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!active.id || !over?.id) {
        setActiveDragItem(null);
        return;
      }

      const activeTask = tasks.find((t) => t.id === active.id);
      if (!activeTask) {
        setActiveDragItem(null);
        return;
      }

      if (typeof over.id === "string" && over.id.startsWith("day-")) {
        const newDate = over.id.replace("day-", "");
        if (activeTask.date !== newDate) {
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === active.id ? { ...task, date: newDate } : task
            )
          );
        }
      } else if (
        active.data.current?.eventType === "task" &&
        typeof over.id === "string" &&
        tasks.some((t) => t.id === over.id)
      ) {
        const overTask = tasks.find((t) => t.id === over.id);

        if (activeTask && overTask && activeTask.date === overTask.date) {
          setTasks((prevTasks) => {
            const currentDayTasks = prevTasks.filter(
              (task) => task.date === activeTask.date
            );
            const otherDayTasks = prevTasks.filter(
              (task) => task.date !== activeTask.date
            );

            const activeIndex = currentDayTasks.findIndex(
              (task) => task.id === active.id
            );
            const overIndex = currentDayTasks.findIndex(
              (task) => task.id === over.id
            );

            if (activeIndex !== -1 && overIndex !== -1) {
              const newOrderDayTasks = arrayMove(
                currentDayTasks,
                activeIndex,
                overIndex
              );
              return [...otherDayTasks, ...newOrderDayTasks];
            }
            return prevTasks;
          });
        }
      }
      setActiveDragItem(null);
    },
    [tasks]
  );

  const getEventsForDate = useCallback(
    (date: Dayjs): Task[] => {
      const formattedDate = date.format("YYYY-MM-DD");
      // filter tasks by date
      const dailyTasks = tasks.filter((task) => task.date === formattedDate);
      // filter public holidays by date
      const dailyHolidays = publicHolidays.filter(
        (holiday) => holiday.date === formattedDate
      );

      // sort holidays by title
      const sortedHolidays = dailyHolidays.sort((a, b) =>
        a.title.localeCompare(b.title)
      );
      // first holidays, then tasks
      return [...sortedHolidays, ...dailyTasks];
    },
    [tasks, publicHolidays] // Залежність від tasks та publicHolidays
  );

  const renderedDays = useMemo(() => {
    const allDaysInGrid: Dayjs[] = [];

    if (viewMode === "month") {
      const firstDayOfMonth = currentDate.startOf("month");
      const lastDayOfMonth = currentDate.endOf("month");
      const startDate = firstDayOfMonth.startOf("week");
      const endDate = lastDayOfMonth.endOf("week");
      let currentDayInLoop = dayjs(startDate);

      while (currentDayInLoop.isSameOrBefore(endDate, "day")) {
        allDaysInGrid.push(currentDayInLoop);
        currentDayInLoop = currentDayInLoop.add(1, "day");
      }
    } else {
      const startOfWeek = currentDate.startOf("week");
      for (let i = 0; i < 7; i++) {
        allDaysInGrid.push(startOfWeek.add(i, "day"));
      }
    }

    return allDaysInGrid.map((dayInLoop) => {
      const dailyEvents = getEventsForDate(dayInLoop);
      return (
        <CalendarDayCell
          key={dayInLoop.format("YYYY-MM-DD")}
          dayInLoop={dayInLoop}
          currentMonth={currentDate} // Передаем текущий месяц
          dailyEvents={dailyEvents}
          activeDragItem={activeDragItem}
          handleAddTask={handleAddTask}
          handleUpdateTask={handleUpdateTask}
          handleDeleteTask={handleDeleteTask}
          activeDayForInput={activeDayForInput}
          setActiveDayForInput={setActiveDayForInput}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
        />
      );
    });
  }, [
    currentDate,
    viewMode,
    getEventsForDate,
    activeDragItem,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    activeDayForInput,
    setActiveDayForInput,
    editingTask,
    setEditingTask,
  ]);

  return (
    <Wrapper>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter} // for
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          isPending={isPending}
          countryCode={countryCode}
          onPrev={handlePrev}
          onNext={handleNext}
          onCountryChange={handleCountryChange}
          onViewModeChange={handleViewModeChange}
        />
        {isPending && <StatusMessage type="loading">Loading...</StatusMessage>}
        {holidayError && (
          <StatusMessage type="error">{holidayError}</StatusMessage>
        )}

        <CalendarGridHeader />

        <CalendarGrid>{renderedDays}</CalendarGrid>

        <DragOverlay>
          {activeDragItem && (
            <TaskCardDraggable
              id={activeDragItem.id.toString()}
              eventType={activeDragItem.data.current?.eventType || "task"}
              colors={activeDragItem.data.current?.colors}
              title={activeDragItem.data.current?.title}
              isDragging={true}
              customCursor="grabbing"
            />
          )}
        </DragOverlay>
      </DndContext>
    </Wrapper>
  );
};

export default Calendar;
