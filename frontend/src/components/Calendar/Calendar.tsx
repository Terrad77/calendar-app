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

import type { CalendarEvent, ColorType, Holiday } from "../../types/types";
import { TASK_MARKER_COLORS } from "../../types/types";

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
  backgroundColor: "#fffbebe6", // Поправив опечатку
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

// --- BASE URL, value for Vite building---
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // --- parsing Tasks from Local Storage ---
  const [tasks, setTasks] = useState<CalendarEvent[]>(() => {
    try {
      const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (storedTasks) {
        const parsedTasks: unknown = JSON.parse(storedTasks);

        if (Array.isArray(parsedTasks)) {
          return parsedTasks
            .map((task: unknown) => {
              if (
                typeof task === "object" &&
                task !== null &&
                "id" in task &&
                "date" in task &&
                "title" in task &&
                "eventType" in task
              ) {
                const t = task as {
                  id: string;
                  date: string;
                  title: string;
                  description?: string;
                  eventType: string;
                  colors?: unknown;
                  countryCode?: string;
                };

                const safeColors: ColorType[] = Array.isArray(t.colors)
                  ? t.colors.filter((color): color is ColorType =>
                      TASK_MARKER_COLORS.includes(color as ColorType)
                    )
                  : [];

                return {
                  id: t.id,
                  date: t.date,
                  title: t.title,
                  description: t.description || "",
                  eventType: t.eventType,
                  colors: t.eventType === "task" ? safeColors : undefined,
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
      console.error("Failed to load tasks from Local Storage:", error);
      return [];
    }
  });

  // --- loading WorldwideHolidays from own backend ---
  useEffect(() => {
    const fetchWorldwideHolidays = async () => {
      setHolidayError(null);
      startTransition(async () => {
        try {
          const year = currentDate.year();
          const month =
            viewMode === "month" ? currentDate.month() + 1 : undefined;

          let url = `${BACKEND_API_BASE_URL}/api/v1/holidays/worldwide?year=${year}`;
          if (month) {
            url += `&month=${month}`;
          }

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Holiday[] = await response.json(); // Data will be an array of objects of type Holiday

          const uniqueHolidaysMap = new Map<string, Holiday>();
          data.forEach((holiday) => {
            uniqueHolidaysMap.set(holiday.id, holiday);
          });
          const deduplicatedData = Array.from(uniqueHolidaysMap.values());

          const mappedHolidays: CalendarEvent[] = deduplicatedData.map(
            (holiday) => ({
              id: holiday.id, // ID from backend
              date: holiday.date,
              title: holiday.title,
              eventType: "holiday",
              countryCode: holiday.countryCode,
            })
          );

          setPublicHolidaysWorldwide(mappedHolidays);
        } catch (error: unknown) {
          console.error("Error fetching worldwide public holidays:", error);
          // type guard
          if (error instanceof Error) {
            setHolidayError(
              error.message ||
                "Failed to fetch worldwide public holidays from backend."
            );
          } // general errormessage
          else {
            setHolidayError(
              "Failed to fetch worldwide public holidays from backend."
            );
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
      console.error("Failed to save tasks to Local Storage:", error);
    }
  }, [tasks]);

  const [publicHolidaysWorldwide, setPublicHolidaysWorldwide] = useState<
    CalendarEvent[]
  >([]);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeDayForInput, setActiveDayForInput] = useState<string | null>(
    null
  );
  const [editingTask, setEditingTask] = useState<CalendarEvent | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<CalendarEvent | null>(
    null
  );

  const [searchInputValue, setSearchInputValue] = useState(""); // immediate update input field
  const [searchQuery, setSearchQuery] = useState(""); // Delayed search

  // function for debounce Search
  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((value: string) => {
        if (value.trim() !== "") {
          setSearchQuery(value);
        } else {
          setSearchQuery("");
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
    if (searchInputValue.trim() !== "") {
      setSearchQuery(searchInputValue);
    } else {
      setSearchQuery("");
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
    publicHolidaysWorldwide.forEach((holiday) => {
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
  }, [tasks, publicHolidaysWorldwide, searchQuery, currentDate, viewMode]);

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
      viewMode === "month"
        ? prev.subtract(1, "month")
        : prev.subtract(1, "week")
    );
    setActiveDayForInput(null);
    setEditingTask(null);
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) =>
      viewMode === "month" ? prev.add(1, "month") : prev.add(1, "week")
    );
    setActiveDayForInput(null);
    setEditingTask(null);
  }, [viewMode]);

  const handleViewModeChange = useCallback((mode: "month" | "week") => {
    setViewMode(mode);
    setActiveDayForInput(null);
    setEditingTask(null);
  }, []);

  const handleDragStart = useCallback(
    (event: { active: Active }) => {
      // find object CalendarEvent by id with `active`
      const draggedItem = tasks.find((t) => t.id === event.active.id);

      if (draggedItem && draggedItem.eventType === "task") {
        setActiveDragItem(draggedItem);
      } else {
        setActiveDragItem(null);
      }
    },
    [tasks]
  );

  const today = dayjs().startOf("day"); // define current day

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      // Extracting date from id drop zone
      let targetDay: dayjs.Dayjs | null = null;
      if (typeof over.id === "string" && over.id.startsWith("day-")) {
        const dateStr = over.id.replace("day-", "");
        targetDay = dayjs(dateStr);
      }

      if (!active.id || !over?.id) {
        setActiveDragItem(null);
        return;
      }

      if (!activeDragItem || activeDragItem.eventType !== "task") {
        setActiveDragItem(null);
        return;
      }

      // Check that targetDay is valid and not earlier than today
      if (targetDay && targetDay.isBefore(today, "day")) {
        setActiveDragItem(null);
        return;
      }

      // Drag to another day (change date)
      if (targetDay && activeDragItem.date !== targetDay.format("YYYY-MM-DD")) {
        setTasks((prevTasks) => {
          const updatedTasks = prevTasks.map((task) =>
            task.id === activeDragItem.id
              ? { ...task, date: targetDay!.format("YYYY-MM-DD") }
              : task
          );
          return updatedTasks;
        });
      }
      // Drag and drop within a day (reorder)
      else if (
        // check that over is another task
        typeof over.id === "string" &&
        tasks.some((t) => t.id === over.id)
      ) {
        const overTask = tasks.find((t) => t.id === over.id);

        // check tasks exist and are on the same date
        if (
          activeDragItem &&
          overTask &&
          activeDragItem.date === overTask.date
        ) {
          setTasks((prevTasks) => {
            const currentDayTasks = prevTasks.filter(
              (task) => task.date === activeDragItem.date
            );
            const otherDayTasks = prevTasks.filter(
              (task) => task.date !== activeDragItem.date
            );

            const activeIndex = currentDayTasks.findIndex(
              (task) => task.id === activeDragItem.id
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
      setActiveDragItem(null); // reset activeDragItem after dragging is complete
    },
    [tasks, activeDragItem, today]
  );

  const renderedDays = useMemo(() => {
    const allDaysInGrid: Dayjs[] = [];

    // start and end dates for the grid based on view mode
    let startVisibleDate: Dayjs;

    if (viewMode === "month") {
      // For month view, start from the first day of the week of the first day of the month
      startVisibleDate = currentDate.startOf("month").startOf("week");
      // Generate 42 days (6 weeks) to cover the entire month grid
      for (let i = 0; i < 42; i++) {
        allDaysInGrid.push(startVisibleDate.add(i, "day"));
      }
    } else {
      // viewMode === "week"
      //start from the first day of the current week
      startVisibleDate = currentDate.startOf("week");
      // Generate 7 days for the week
      for (let i = 0; i < 7; i++) {
        allDaysInGrid.push(startVisibleDate.add(i, "day"));
      }
    }

    return allDaysInGrid.map((dayInLoop) => {
      const formattedDay = dayInLoop.format("YYYY-MM-DD");
      const dayData = filteredTasksAndHolidaysByDay[formattedDay] || {
        tasks: [],
        holidays: [],
      };

      // ****** logic for Fillers ****** //
      // A day is a "filler" if it's outside the current month (in month view) or outside the current week (in week view)

      const isFiller =
        (viewMode === "month" && !dayInLoop.isSame(currentDate, "month")) ||
        (viewMode === "week" &&
          (!dayInLoop.isSameOrAfter(currentDate.startOf("week"), "day") ||
            !dayInLoop.isSameOrBefore(currentDate.endOf("week"), "day")));

      return (
        <CalendarDayCell
          key={dayInLoop.format("YYYY-MM-DD")}
          dayInLoop={dayInLoop}
          currentMonth={currentDate}
          dailyTasks={dayData.tasks} // ={isFiller ? [] : dayData.tasks} to show empty tasks for fillers
          dailyHolidays={dayData.holidays} // ={isFiller ? [] : dayData.holidays} to show empty holidays for fillers
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          isPending={isPending}
          onPrev={handlePrev}
          onNext={handleNext}
          onViewModeChange={handleViewModeChange}
          onSearchChange={handleSearchChange}
          searchInputValue={searchInputValue}
          onSearchClick={handleSearchIconClick}
        />

        {isPending && (
          <StatusMessage type="loading">
            Loading worldwide holidays...
          </StatusMessage>
        )}
        {holidayError && (
          <StatusMessage type="error">{holidayError}</StatusMessage>
        )}
        <CalendarGridHeader />

        <CalendarGrid>{renderedDays}</CalendarGrid>

        <DragOverlay>
          {activeDragItem && (
            <TaskCardDraggable
              event={activeDragItem}
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
