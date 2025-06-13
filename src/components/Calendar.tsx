import { useState, useEffect, useTransition, type JSX } from "react";
import { styled } from "@stitches/react";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import Icon from "./Icon";

// Extend dayjs with plugins for date comparison
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Define the types for the props of the Calendar component
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

// allowed types for color markers of tasks
type ColorType =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "turquoise"
  | "yellow"
  | "holiday"
  | "default";

// Task interface to represent tasks in the calendar
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
  // alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  // gap: "12px",
  backgroundColor: "#edeff1",
  padding: "10px 16px 2px 16px",
  color: "#555",
  // borderBottom: "1px solid #e0e0e0", // Легкая нижняя граница для отделения шапки
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
  position: "relative", // Для позиционирования задач или инлайн-редактирования
  fontSize: "1rem",
  fontWeight: "700",

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
  // "& .day-number": {},
  // "& .month-abbr": {},
  "& .task-count": {
    color: "#97999a",
    fontSize: "0.75rem",
    marginLeft: "2px",
  },

  // styling days outside the current month
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
  },
});

const TaskMarker = styled("span", {
  width: "34px",
  height: "6px",
  borderRadius: "6px",
  flexShrink: 0, // Не позволяет маркеру сжиматься
  variants: {
    color: {
      blue: { backgroundColor: "#0070bc" },
      green: { backgroundColor: "#62c050" },
      orange: { backgroundColor: "#fea93f" },
      purple: { backgroundColor: "#c67ae3" },
      turquoise: { backgroundColor: "#51ea9d" },
      yellow: { backgroundColor: "#f2d200" },
      holiday: { backgroundColor: "#dc3545" },
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
        // default styles for tasks
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

// Стили для сообщений о загрузке/ошибке
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

// Стили для выпадающего списка стран
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

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"month" | "week">("month"); //state for view mode
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      date: "2025-06-10",
      title: "Запланировать встречу",
      colors: ["blue"], // Теперь массив цветов
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
        startTransition(() => {
          setPublicHolidays([]);
        });
      }
    };

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

      let showMonthAbbr = false; // trigger for showing month abbreviation

      const isFirstDayOfItsMonth = dayInLoop.date() === 1;
      const isLastDayOfItsMonth = dayInLoop.isSame(
        dayInLoop.endOf("month"),
        "day"
      );

      if (isFirstDayOfItsMonth || isLastDayOfItsMonth) {
        showMonthAbbr = true;
      }

      days.push(
        <DayCell
          key={dayInLoop.format("YYYY-MM-DD")}
          isOutsideMonth={isOutsideMonth}
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
            <TaskCard key={event.id} eventType={event.eventType}>
              {event.eventType === "task" ? (
                // eventType === "task"
                <div style={{ display: "flex", gap: "4px" }}>
                  {(event.colors || ["default"]).map((color, idx) => (
                    <TaskMarker key={idx} color={color} />
                  ))}
                </div>
              ) : // eventType === "holiday"
              // no use any markers for holidays
              null}
              <span className="task-title">{event.title}</span>
            </TaskCard>
          ))}
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
            <NavButton onClick={handlePrev}>
              <Icon name="chevron-up" />
            </NavButton>
            <NavButton onClick={handleNext}>
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
          <CountrySelect value={countryCode} onChange={handleCountryChange}>
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </CountrySelect>
          <ViewButton
            active={viewMode === "week"}
            onClick={() => setViewMode("week")}
          >
            Week
          </ViewButton>
          <ViewButton
            active={viewMode === "month"}
            onClick={() => setViewMode("month")}
          >
            Month
          </ViewButton>
        </ButtonContainer>
      </Header>

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
