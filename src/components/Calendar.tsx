import { useState, useEffect, useTransition, type JSX } from "react";
import { styled } from "@stitches/react";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import Icon from "./Icon";

// Extend dayjs with plugins for date comparison
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// types for props of the Calendar component
interface PublicHolidayApiResponse {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

// types for color markers of tasks
type ColorType =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "turquoise"
  | "yellow"
  | "default";

// interface to represent tasks in the calendar
interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  eventType: "task" | "holiday";
  colors?: ColorType[];
}

const Wrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: "700px",
  backgroundColor: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  overflow: "hidden",
});

const Header = styled("div", {
  display: "flex",

  justifyContent: "space-between",
  flexWrap: "wrap",
  // gap: "12px",
  backgroundColor: "#edeff1",
  padding: "10px 16px 2px 16px",
  color: "#555",
});

const MonthLabel = styled("h2", {
  margin: 0,
  fontSize: "1.5rem",
  color: "#36343a",
});

const CurrentViewDisplayButton = styled("button", {
  fontSize: "1rem",
  backgroundColor: "#e3e5e6", // Светлый фон кнопки, как на макете
  border: "1px solid #e0e0e0", // Легкая рамка
  borderRadius: "3px",
  cursor: "default", // Курсор по умолчанию, т.к. кнопка некликабельна
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#555",
  fontWeight: "700",
  padding: "6px 12px",
  boxShadow: "0 1px 0 #ced0d1",

  "&:hover": {
    borderColor: "#e0e0e0",
  },
  "&:focus": {
    outline: "none",
  },
});

const NavButton = styled("button", {
  fontSize: "1rem",
  backgroundColor: "#e3e5e6",
  border: "1px solid #e0e0e0",
  borderRadius: "3px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#97999a",
  padding: "8px 10px",
  boxShadow: "0 1px 0 #ced0d1",
  transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
  "&:focus, &:hover": {
    outline: "none",
    backgroundColor: "#c7cbcf", // Чуть темнее при наведении
    color: "#333",
    borderColor: "#d0d0d0",
  },
  "&:active": {
    backgroundColor: "#c7cbcf",
    color: "#222",
    borderColor: "#c0c0c0",
    outline: "none",
  },
  "&:disabled": {
    backgroundColor: "#e0e0e0",
    color: "#a0a0a0",
    cursor: "not-allowed",
    borderColor: "#d0d0d0",
  },
});

const ButtonContainer = styled("div", {
  display: "flex",
  gap: "4px",
});

const ViewButton = styled("button", {
  fontSize: "1rem",
  backgroundColor: "#e3e5e6",
  border: "1px solid #e0e0e0",
  borderRadius: "3px",
  cursor: "pointer",
  alignItems: "center",
  justifyContent: "center",
  color: "#36343a",
  fontWeight: "700",
  padding: "6px 12px",
  boxShadow: "0 1px 0 #ced0d1",
  transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
  "&:focus, &:hover": {
    backgroundColor: "#c7cbcf",
    outline: "none",
    borderColor: "#d0d0d0",
  },
  "&:active": { backgroundColor: "#c7cbcf" },
});

const WeekdayHeaderContainer = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "4px",
  backgroundColor: "#eceded", // as the color grid lines
});

const WeekdayHeaderCell = styled("div", {
  fontWeight: "500",
  fontSize: "0.9rem",
  textAlign: "center",
  backgroundColor: "#edeff1",
  color: "#777",
  height: "35px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderBottom: "1px solid #e0e0e0",
});

const CalendarGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "4px",
  backgroundColor: "#edeff1", // as the color grid lines
});

const DayCell = styled("div", {
  height: "100px",
  width: "180px",
  padding: "2px 2px",
  textAlign: "left",
  position: "relative", // for positioning tasks or inline edit
  fontSize: "1rem",
  fontWeight: "700",
  cursor: "pointer", // to show ability to click on the day cell for adding tasks
  // style for the day number
  "& .day-content-wrapper": {
    display: "flex",
    flexDirection: "column",
  },
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

  // styling days
  variants: {
    isOutsideMonth: {
      //outside the current month
      true: {
        backgroundColor: "#ebebeb",
        "& .day-number": {
          color: "#97999a",
        },
        "& .month-abbr": {
          color: "#97999a",
        },
      },
      //inside the current month
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
  },
});

const TaskMarker = styled("span", {
  width: "34px",
  height: "6px",
  borderRadius: "6px",
  flexShrink: 0,
  variants: {
    color: {
      blue: { backgroundColor: "#0070bc" },
      green: { backgroundColor: "#62c050" },
      orange: { backgroundColor: "#fea93f" },
      purple: { backgroundColor: "#c67ae3" },
      turquoise: { backgroundColor: "#51ea9d" },
      yellow: { backgroundColor: "#f2d200" },
      default: { backgroundColor: "#a0a0a0" },
    },
  },
});

const TaskCard = styled("div", {
  backgroundColor: "#ffffff",
  borderRadius: "3px",
  padding: "4px 8px",
  fontSize: "0.7rem",
  fontWeight: "500",
  color: "#333",
  marginBottom: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "grab",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",

  "& .task-title": {
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "wrap",
  },
  variants: {
    eventType: {
      task: {
        // styles for tasks
        backgroundColor: "f0f8ff",
        border: "1px solid #d0d0d0",
      },
      holiday: {
        // styles for holidays
        border: "1px solid #dc3545",
        color: "red",
      },
    },
  },
  defaultVariants: {
    eventType: "task",
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

const CountrySelect = styled("select", {
  padding: "6px 10px",
  borderRadius: "3px",
  border: "1px solid #e0e0e0",
  backgroundColor: "#e3e5e6",
  color: "#36343a",
  fontSize: "1rem",
  fontWeight: "700",
  cursor: "pointer",
  boxShadow: "0 1px 0 #ced0d1",
  "&:focus, &:hover": {
    backgroundColor: "#c7cbcf",
    outline: "none",
    borderColor: "#d0d0d0",
  },
  "&:disabled": {
    backgroundColor: "#e0e0e0",
    color: "#a0a0a0",
    cursor: "not-allowed",
    borderColor: "#d0d0d0",
  },
});

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// list of countries for public holidays
const countryOptions = [
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "USA" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "PL", name: "Poland" },
  { code: "CA", name: "Canada" },
];

const TaskInputFormWrapper = styled("div", {
  marginTop: "8px",
  padding: "4px",
  backgroundColor: "#f9f9f9",
  border: "1px solid #e0e0e0",
  borderRadius: "3px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  position: "absolute",
  bottom: "4px",
  left: "4px",
  right: "4px",
  zIndex: 10,
});

const TaskInput = styled("input", {
  width: "calc(100% - 8px)",
  padding: "4px",
  border: "1px solid #d0d0d0",
  borderRadius: "3px",
  fontSize: "0.85rem",
  "&:focus": {
    outline: "none",
    borderColor: "#007bff",
  },
});
// ------------------ Task input buttons ----------------- //
const TaskInputButtons = styled("div", {
  display: "flex",
  justifyContent: "flex-end",
  gap: "4px",
});

// Button for adding or editing tasks
const TaskInputButton = styled("button", {
  padding: "4px 8px",
  borderRadius: "3px",
  border: "1px solid #d0d0d0",
  backgroundColor: "#e3e5e6",
  cursor: "pointer",
  fontSize: "0.8rem",
  boxShadow: "0 1px 0 #ced0d1",
  transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
  "&:hover": {
    backgroundColor: "#c7cbcf",
    borderColor: "#c7cbcf",
  },
  // Primary button variant for adding or saving tasks
  variants: {
    primary: {
      true: {
        backgroundColor: "#007bff",
        color: "#fff",
        borderColor: "#007bff",
        "&:hover": {
          backgroundColor: "#0056b3",
          borderColor: "#0056b3",
        },
      },
    },
  },
});

// --- Color choise components ---

const ColorSelectorWrapper = styled("div", {
  display: "flex",
  gap: "4px",
  marginTop: "4px",
  flexWrap: "wrap",
});

const ColorOption = styled("div", {
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  cursor: "pointer",
  border: "2px solid transparent", // Граница для выделения
  transition: "border-color 0.2s",

  "&:hover": {
    borderColor: "#ccc",
  },

  variants: {
    color: {
      blue: { backgroundColor: "#0070bc" },
      green: { backgroundColor: "#62c050" },
      orange: { backgroundColor: "#fea93f" },
      purple: { backgroundColor: "#c67ae3" },
      turquoise: { backgroundColor: "#51ea9d" },
      yellow: { backgroundColor: "#f2d200" },
      default: { backgroundColor: "#a0a0a0" },
    },
    isSelected: {
      true: {
        borderColor: "#007bff", // Цвет границы при выборе
        boxShadow: "0 0 0 2px rgba(0, 123, 255, 0.5)", // Легкая тень для акцента
      },
    },
  },
});

// ---------------- Form component for task input -------------- //

interface TaskInputFormProps {
  day: string; // Дата в формате YYYY-MM-DD
  initialTitle?: string; // Для редактирования существующей задачи
  initialColors?: ColorType[]; // Для редактирования существующей задачи
  onAddTask: (date: string, title: string, colors: ColorType[]) => void;
  onUpdateTask?: (taskId: string, title: string, colors: ColorType[]) => void; // Для редактирования
  onCancel: () => void; // Для закрытия формы
  taskId?: string; // Если редактируем, то передаем ID задачи
}

const TaskInputForm: React.FC<TaskInputFormProps> = ({
  day,
  initialTitle = "",
  initialColors = [],
  onAddTask,
  onUpdateTask,
  onCancel,
  taskId,
}) => {
  const [title, setTitle] = useState(initialTitle);

  // интерфейс Set для удобного управления уникальными цветами,
  // затем преобразуем в массив для передачи в onAddTask/onUpdateTask
  const [selectedColors, setSelectedColors] = useState<Set<ColorType>>(
    new Set(initialColors.length > 0 ? initialColors : ["default"])
  );

  // определяем возможные значения для ColorType как массив констант
  const availableColors = [
    "blue",
    "green",
    "orange",
    "purple",
    "turquoise",
    "yellow",
    "default",
  ] as const;

  // Использование typeof и [number] здесь по-прежнему хорошая практика, так как это гарантирует, что ваш тип ColorType всегда будет соответствовать этому массиву.

  type ColorType = (typeof availableColors)[number];

  // Доступные цвета для выбора, исключаем "holiday"
  // const availableColors: ColorType[] = [
  //   "blue",
  //   "green",
  //   "orange",
  //   "purple",
  //   "turquoise",
  //   "yellow",
  //   "default",
  // ];

  const handleColorToggle = (color: ColorType) => {
    setSelectedColors((prevColors) => {
      const newColors = new Set(prevColors);
      if (newColors.has(color)) {
        newColors.delete(color);
      } else {
        newColors.add(color);
      }
      // Если никаких цветов не выбрано, выбираем 'default'
      if (newColors.size === 0) {
        newColors.add("default");
      }
      return newColors;
    });
  };

  // function to save the task
  const handleSave = () => {
    if (title.trim()) {
      // Преобразуем Set обратно в массив для сохранения
      const colorsToSave = Array.from(selectedColors);

      if (taskId && onUpdateTask) {
        onUpdateTask(taskId, title, colorsToSave);
      } else {
        onAddTask(day, title, colorsToSave);
      }
      onCancel();
    }
  };

  // function to handle keydown events for saving or cancelling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <TaskInputFormWrapper onClick={(e) => e.stopPropagation()}>
      <TaskInput
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label="Task title input"
      />
      <ColorSelectorWrapper>
        {availableColors.map((color) => (
          <ColorOption
            key={color}
            color={color}
            isSelected={selectedColors.has(color)}
            onClick={() => handleColorToggle(color)}
          />
        ))}
      </ColorSelectorWrapper>
      <TaskInputButtons>
        <TaskInputButton onClick={onCancel}>Cancel</TaskInputButton>
        <TaskInputButton primary onClick={handleSave}>
          {taskId ? "Save" : "Add Task"}
        </TaskInputButton>
      </TaskInputButtons>
    </TaskInputFormWrapper>
  );
};

// --------------------- main Calendar component ------------------------- //

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
    // update public holidays when currentDate or countryCode changes
    fetchPublicHolidays();
  }, [currentDate, countryCode]);

  // function to handle previous button click
  const handlePrev = () => {
    setCurrentDate((prev) =>
      viewMode === "month"
        ? prev.subtract(1, "month")
        : prev.subtract(1, "week")
    );
  };

  // function to handle next button click
  const handleNext = () => {
    setCurrentDate((prev) =>
      viewMode === "month" ? prev.add(1, "month") : prev.add(1, "week")
    );
  };

  // function to handle country change
  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(event.target.value);
  };

  // function fo adding a New task
  const handleAddTask = (date: string, title: string, colors: ColorType[]) => {
    const newTask: Task = {
      id: String(Date.now()), // Простой уникальный ID
      date,
      title,
      eventType: "task",
      colors,
    };
    setTasks((prevTasks) => [...prevTasks, newTask]);

    setActiveDayForInput(null); // reset the active day for input
  };

  //function for updating an Existing task
  const handleUpdateTask = (
    taskId: string,
    newTitle: string,
    newColors: ColorType[]
  ) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, title: newTitle, colors: newColors }
          : task
      )
    );
    setEditingTask(null); // reset the editing task
    setActiveDayForInput(null); // reset the active day for input
  };

  // function to render days based on the current view mode
  const renderDays = () => {
    const days: JSX.Element[] = [];

    const getEventsForDate = (date: Dayjs): Task[] => {
      const formattedDate = date.format("YYYY-MM-DD");
      const dailyTasks = tasks.filter((task) => task.date === formattedDate);
      const dailyHolidays = publicHolidays.filter(
        (holiday) => holiday.date === formattedDate
      );

      // Combine tasks and holidays for the day
      const allEvents = [...dailyTasks, ...dailyHolidays].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
      return allEvents;
    };

    const allDaysInGrid: Dayjs[] = []; // Array to hold all days in the grid

    // ViewMode === "month"
    if (viewMode === "month") {
      const firstDayOfMonth = currentDate.startOf("month");
      const lastDayOfMonth = currentDate.endOf("month");
      // ViewMode === "month" requires a full grid of weeks
      const startDate = firstDayOfMonth.startOf("week"); // Start of week for the first day of the month
      const endDate = lastDayOfMonth.endOf("week"); // End of week for the last day of the month
      let currentDayInLoop = dayjs(startDate); // constant for update current day in loop

      while (currentDayInLoop.isSameOrBefore(endDate, "day")) {
        allDaysInGrid.push(currentDayInLoop); // Add each day to the grid array
        currentDayInLoop = currentDayInLoop.add(1, "day");
      }
    } else {
      // ViewMode === "week"
      const startOfWeek = currentDate.startOf("week");
      for (let i = 0; i < 7; i++) {
        allDaysInGrid.push(startOfWeek.add(i, "day"));
      }
    }

    allDaysInGrid.forEach((dayInLoop) => {
      const isOutsideMonth = !dayInLoop.isSame(currentDate, "month");
      const dailyEvents = getEventsForDate(dayInLoop);
      // filter only tasks for counting "cards"
      const dailyTasksOnly = dailyEvents.filter(
        (event) => event.eventType === "task"
      );

      // Determine if the month abbreviation should be shown
      let showMonthAbbr = false; // trigger for showing month abbreviation

      const isFirstDayOfItsMonth = dayInLoop.date() === 1;
      const isLastDayOfItsMonth = dayInLoop.isSame(
        dayInLoop.endOf("month"),
        "day"
      );
      if (isFirstDayOfItsMonth || isLastDayOfItsMonth) {
        showMonthAbbr = true;
      }

      // Check if the day is active for input
      const dayFormatted = dayInLoop.format("YYYY-MM-DD");
      const isDayActiveForInput = activeDayForInput === dayFormatted;

      days.push(
        <DayCell
          key={dayFormatted}
          isOutsideMonth={isOutsideMonth}
          onClick={() => {
            // if there is an active task being edited for this day, do not open the form
            if (isDayActiveForInput) {
              setActiveDayForInput(null); // reset active day for input
              setEditingTask(null); // reset editing task when closing the form
            } else if (!editingTask) {
              setActiveDayForInput(dayFormatted);
            }
          }}
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
          {dailyEvents.map((event) => (
            <TaskCard
              key={event.id}
              eventType={event.eventType}
              onClick={(e) => {
                e.stopPropagation(); //  Prevent click from bubbling up to the DayCell
                if (event.eventType === "task") {
                  setEditingTask(event);
                  setActiveDayForInput(dayFormatted);
                }
              }}
            >
              {event.eventType === "task" ? (
                // eventType === "task"
                <div style={{ display: "flex", gap: "4px" }}>
                  {(event.colors || ["default"]).map((color, idx) => (
                    <TaskMarker key={idx} color={color} />
                  ))}
                </div>
              ) : // eventType === "holiday"
              null}
              <span className="task-title">{event.title}</span>
            </TaskCard>
          ))}
          {/* Form for adding/editing tasks */}
          {isDayActiveForInput && (
            <TaskInputForm
              day={dayFormatted}
              initialTitle={editingTask?.title}
              initialColors={editingTask?.colors}
              taskId={editingTask?.id}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onCancel={() => {
                setActiveDayForInput(null);
                setEditingTask(null);
              }}
            />
          )}
        </DayCell>
      );
    });
    return days;
  };

  return (
    <Wrapper>
      <Header>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CurrentViewDisplayButton tabIndex={-1}>
            {viewMode === "month" ? "Monthly" : "Weekly"}
          </CurrentViewDisplayButton>
          <ButtonContainer>
            <NavButton onClick={handlePrev} disabled={isPending}>
              <Icon name="chevron-up" />
            </NavButton>
            <NavButton onClick={handleNext} disabled={isPending}>
              <Icon name="chevron-down" />
            </NavButton>
          </ButtonContainer>
        </div>
        <MonthLabel>
          {currentDate.format("MMMM")}
          &nbsp;
          {currentDate.year()}
        </MonthLabel>
        <ButtonContainer>
          <CountrySelect
            value={countryCode}
            onChange={handleCountryChange}
            disabled={isPending}
          >
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </CountrySelect>
          <ViewButton onClick={() => setViewMode("week")}>Week</ViewButton>
          <ViewButton onClick={() => setViewMode("month")}>Month</ViewButton>
        </ButtonContainer>
      </Header>
      {isPending && <StatusMessage type="loading">Loading...</StatusMessage>}
      {holidayError && (
        <StatusMessage type="error">{holidayError}</StatusMessage>
      )}

      <WeekdayHeaderContainer>
        {daysOfWeek.map((day) => (
          <WeekdayHeaderCell key={day}>{day}</WeekdayHeaderCell>
        ))}
      </WeekdayHeaderContainer>

      <CalendarGrid>{renderDays()}</CalendarGrid>
    </Wrapper>
  );
};

export default Calendar;
