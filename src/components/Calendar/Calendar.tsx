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
import debounce from "lodash.debounce";

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

import type { PublicHolidayApiResponse, Task } from "./types";
import { CalendarDayCell } from "./CalendarDayCell";
import { TaskCardDraggable } from "./TaskCardDraggable";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGridHeader } from "./CalendarGridHeader";
import { SearchInput } from "./SearchInput";

// Extend dayjs with plugins for date comparison
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const Wrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "1400px",
  margin: "20px",
  backgroundColor: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  overflow: "hidden",
});

const CalendarGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(150px, 1fr))",
  gap: "4px",
  backgroundColor: "#edeff1",
  minHeight: `calc((var(--calendar-day-cell-min-height, 120px) * 6) + (4px * 5))`,
  "@media (max-width: 768px)": {
    minHeight: `auto`,
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

// --- КЛЮЧ ДЛЯ LOCAL STORAGE ---
const LOCAL_STORAGE_KEY = "calendarTasks";

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // --- download from Local Storage ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
      return storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
      console.error("Failed to load tasks from Local Storage:", error);
      return [];
    }
  });

  // --- Save tasks to Local Storage every change in state tasks ---
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
      console.log("Tasks saved to Local Storage:", tasks); // Для дебагу
    } catch (error) {
      console.error("Failed to save tasks to Local Storage:", error);
    }
  }, [tasks]);

  const [publicHolidays, setPublicHolidays] = useState<Task[]>([]);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>("UA");
  const [isPending, startTransition] = useTransition();
  const [activeDayForInput, setActiveDayForInput] = useState<string | null>(
    null
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // function for debounce Search
  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value);
      }, 300),
    []
  );

  // function to handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetSearchQuery(e.target.value);
    },
    [debouncedSetSearchQuery]
  );

  // function for filter tasks by Query
  const filteredTasksAndHolidaysByDay = useMemo(() => {
    const lowerCaseSearchQuery = searchQuery.toLowerCase();
    const result: { [key: string]: { tasks: Task[]; holidays: Task[] } } = {};

    // Determine the range of days to include based on viewMode
    let startDate: Dayjs;
    let endDate: Dayjs;

    if (viewMode === "month") {
      const firstDayOfMonth = currentDate.startOf("month");
      const lastDayOfMonth = currentDate.endOf("month");
      startDate = firstDayOfMonth.startOf("week");
      endDate = lastDayOfMonth.endOf("week");
    } else {
      startDate = currentDate.startOf("week");
      endDate = currentDate.endOf("week");
    }

    let currentDayInLoop = dayjs(startDate);

    while (currentDayInLoop.isSameOrBefore(endDate, "day")) {
      const formattedDay = currentDayInLoop.format("YYYY-MM-DD");
      result[formattedDay] = { tasks: [], holidays: [] };
      currentDayInLoop = currentDayInLoop.add(1, "day");
    }

    // group filtered Tasks
    tasks.forEach((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(lowerCaseSearchQuery);

      if (matchesSearch || lowerCaseSearchQuery === "") {
        const taskDate = dayjs(task.date).format("YYYY-MM-DD");
        if (!result[taskDate]) {
          result[taskDate] = { tasks: [], holidays: [] };
        }
        result[taskDate].tasks.push(task);
      }
    });

    // group publicHolidays
    publicHolidays.forEach((holiday) => {
      const holidayDate = dayjs(holiday.date).format("YYYY-MM-DD");
      if (!result[holidayDate]) {
        result[holidayDate] = { tasks: [], holidays: [] };
      }
      result[holidayDate].holidays.push(holiday);
    });

    // sotring Tasks and Holidays
    Object.keys(result).forEach((date) => {
      result[date].tasks.sort((a, b) => a.id.localeCompare(b.id));
      result[date].holidays.sort((a, b) => a.title.localeCompare(b.title));
    });

    return result;
  }, [tasks, publicHolidays, searchQuery, currentDate, viewMode]);

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

  const renderedDays = useMemo(() => {
    const allDaysInGrid: Dayjs[] = [];

    let startVisibleDate: Dayjs;
    let endVisibleDate: Dayjs;

    if (viewMode === "month") {
      const firstDayOfMonth = currentDate.startOf("month");
      const lastDayOfMonth = currentDate.endOf("month");
      startVisibleDate = firstDayOfMonth.startOf("week");
      endVisibleDate = lastDayOfMonth.endOf("week");
    } else {
      // viewMode === "week"
      startVisibleDate = currentDate.startOf("week");
      endVisibleDate = currentDate.endOf("week");
    }
    // always generate full 6 weeks (42 days) for grid
    let currentDayInLoop = dayjs(startVisibleDate.startOf("week"));

    // while (currentDayInLoop.isSameOrBefore(endVisibleDate, "day")) {
    //   allDaysInGrid.push(currentDayInLoop);
    //   currentDayInLoop = currentDayInLoop.add(1, "day");
    // }

    for (let i = 0; i < 42; i++) {
      allDaysInGrid.push(currentDayInLoop);
      currentDayInLoop = currentDayInLoop.add(1, "day");
    }

    return allDaysInGrid.map((dayInLoop) => {
      const formattedDay = dayInLoop.format("YYYY-MM-DD");
      const dayData = filteredTasksAndHolidaysByDay[formattedDay] || {
        tasks: [],
        holidays: [],
      };

      // ****** logic for Fillers ****** //
      const isFiller =
        (viewMode === "month" && !dayInLoop.isSame(currentDate, "month")) ||
        (viewMode === "week" &&
          (!dayInLoop.isSameOrAfter(startVisibleDate, "day") ||
            !dayInLoop.isSameOrBefore(endVisibleDate, "day")));

      return (
        <CalendarDayCell
          key={dayInLoop.format("YYYY-MM-DD")}
          dayInLoop={dayInLoop}
          currentMonth={currentDate}
          dailyTasks={isFiller ? [] : dayData.tasks} // empty tasks for fillers
          dailyHolidays={isFiller ? [] : dayData.holidays} // empty holidays for fillers
          activeDragItem={activeDragItem}
          activeDayForInput={activeDayForInput}
          setActiveDayForInput={setActiveDayForInput}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          setAllTasks={setTasks}
          allTasks={tasks}
          isFiller={isFiller}
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
        <SearchInput
          placeholder="Search task..."
          onChange={handleSearchChange}
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
              id={activeDragItem.id as string}
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
