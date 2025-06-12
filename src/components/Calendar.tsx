import { useState, type JSX } from "react";
import { styled } from "@stitches/react";
import dayjs, { Dayjs } from "dayjs";
import Icon from "./Icon";

// Task interface to represent tasks in the calendar
interface Task {
  id: string;
  date: string;
  title: string;
  description?: string;
  color?: "blue" | "green" | "red" | "yellow" | "default";
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
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  backgroundColor: "#edeff1",
  padding: "12px 16px",
  color: "#555",
  borderBottom: "1px solid #e0e0e0", // Легкая нижняя граница для отделения шапки
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
  "&:hover": {
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
  color: "#555",
  fontWeight: "700",
  padding: "6px 12px",
  boxShadow: "0 1px 0 #ced0d1",

  transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
  variants: {
    active: {
      true: {
        backgroundColor: "#c7cbcf",

        borderColor: "#e0e0e0",
        outline: "none",
      },
      false: {
        backgroundColor: "#e3e5e6",
      },
      "&:focus": {
        outline: "none",
        borderColor: "#e0e0e0",
      },
      "&:hover": {
        outline: "none",
        backgroundColor: "#e8e8e8", // Чуть темнее при наведении
        // color: "#333",
        borderColor: "#e0e0e0",
      },
    },
  },
});

const WeekdayHeaderContainer = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "1px", // Создает вертикальные разделители
  backgroundColor: "#e0e0e0", // Цвет, который виден в промежутках (линиях)
});

// WeekdayHeaderCell теперь имеет правильные стили для выравнивания и нижней границы
const WeekdayHeaderCell = styled("div", {
  fontWeight: "500",
  textAlign: "center",
  backgroundColor: "#f7f7f7", // Фон для заголовков дней недели, немного светлее чем линии
  color: "#777", // Более мягкий цвет текста
  height: "35px", // УМЕНЬШЕННАЯ ВЫСОТА, чтобы соответствовать макету
  display: "flex",
  alignItems: "center", // ВЫРАВНИВАЕТ ПО ВЕРТИКАЛИ ПО ЦЕНТРУ
  justifyContent: "center", // ВЫРАВНИВАЕТ ПО ГОРИЗОНТАЛИ ПО ЦЕНТРУ
  borderBottom: "1px solid #e0e0e0", // ГОРИЗОНТАЛЬНАЯ ЛИНИЯ ПОД ЗАГОЛОВКАМИ
});

const CalendarGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "1px", // Задает разделители между ячейками дней
  backgroundColor: "#e0e0e0", // Цвет линий сетки
});

const DayCell = styled("div", {
  backgroundColor: "#ffffff", // Белый фон для ячеек дня, как на макете
  color: "red",
  height: "100px", // Высота для ячеек с датами
  padding: "4px",
  paddingTop: "8px", // Отступ для номера дня сверху
  textAlign: "left",
  position: "relative", // Для позиционирования задач или инлайн-редактирования
  fontSize: "0.9rem",

  // style for the day number
  "& .day-content-wrapper": {
    display: "flex",
    flexDirection: "column",
  },
  "& .day-number-and-month": {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    marginBottom: "4px",
  },
  "& .day-number": {
    fontSize: "1.1rem",
    color: "#47494a",
  },
  "& .month-abbr": {
    fontSize: "0.8rem",
    color: "#97999a",
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
        backgroundColor: "#ffffff",
        "& .day-number": {
          color: "#47494a",
        },
      },
    },
  },
});

const TaskCard = styled("div", {
  backgroundColor: "#e7e7e7",
  borderRadius: "3px",
  padding: "4px 8px",
  fontSize: "0.8rem",
  color: "#333",
  marginBottom: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  cursor: "grab",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  variants: {
    taskColor: {
      blue: { backgroundColor: "#e0f2ff", color: "#007bff" },
      green: { backgroundColor: "#e6ffe6", color: "#28a745" },
      red: { backgroundColor: "#ffebe6", color: "#dc3545" },
      yellow: { backgroundColor: "#fff3cd", color: "#856404" },
      default: { backgroundColor: "#f0f0f0", color: "#555" },
    },
  },
  "&:hover": {
    backgroundColor: "#dcdcdc",
  },
});

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"month" | "week">("month"); //state for view mode
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      date: "2025-06-10",
      title: "Запланировать встречу",
      color: "blue",
    },
    { id: "2", date: "2025-06-10", title: "Подготовить отчет", color: "green" },
    { id: "3", date: "2025-06-15", title: "Купить продукты", color: "red" },
    { id: "4", date: "2025-06-15", title: "Позвонить отцу" },
    { id: "5", date: "2025-07-01", title: "Начать новый проект" },
  ]);

  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const startDayOfWeek = startOfMonth.day();
  const daysInMonth = endOfMonth.date();

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

  // function to render days based on the current view mode
  const renderDays = () => {
    const days: JSX.Element[] = [];

    const getTasksForDate = (date: Dayjs): Task[] => {
      const formattedDate = date.format("YYYY-MM-DD");
      return tasks.filter((task) => task.date === formattedDate);
    };

    let allDaysInGrid: Dayjs[] = []; // Array to hold all days in the grid

    // ViewMode === "month"
    if (viewMode === "month") {
      const firstDayOfMonth = currentDate.startOf("month");
      const lastDayOfMonth = currentDate.endOf("month");
      // ViewMode === "month" requires a full grid of weeks
      const startDate = firstDayOfMonth.startOf("week"); // Start of week for the first day of the month
      const endDate = lastDayOfMonth.endOf("week"); // End of week for the last day of the month
      let currentDayInLoop = dayjs(startDate); // constant for update current day in loop

      while (
        currentDayInLoop.isBefore(endDate) ||
        currentDayInLoop.isSame(endDate, "day")
      ) {
        allDaysInGrid.push(currentDayInLoop); // Add each day to the grid array
        currentDayInLoop = currentDayInLoop.add(1, "day");
      }
      //   const isOutsideMonth = !currentDayInLoop.isSame(currentDate, "month");
      //   const dailyTasks = getTasksForDate(currentDayInLoop);

      //   days.push(
      //     <DayCell
      //       key={currentDayInLoop.format("YYYY-MM-DD")}
      //       isOutsideMonth={isOutsideMonth} // Props for  variant to style outside month days
      //     >
      //       <span className="day-number">{currentDayInLoop.date()}</span>
      //       {dailyTasks.map((task) => (
      //         <TaskCard key={task.id} taskColor={task.color || "default"}>
      //           {task.title}
      //         </TaskCard>
      //       ))}
      //     </DayCell>
      //   );
      //   currentDayInLoop = currentDayInLoop.add(1, "day"); // Increment to the next day
      // }
    } else {
      // ViewMode === "week"
      const startOfWeek = currentDate.startOf("week");
      for (let i = 0; i < 7; i++) {
        allDaysInGrid.push(startOfWeek.add(i, "day"));
      }
    }

    allDaysInGrid.forEach((dayInLoop, index) => {
      const isOutsideMonth = !dayInLoop.isSame(currentDate, "month");
      const dailyTasks = getTasksForDate(dayInLoop);

      // Упрощенная логика для отображения сокращенного имени месяца
      let showMonthAbbr = false;
      const isFirstDayOfItsMonth = dayInLoop.date() === 1;
      const isLastDayOfItsMonth = dayInLoop.isSame(
        dayInLoop.endOf("month"),
        "day"
      );

      //show month abbreviation first or last day of the month
      if (isFirstDayOfItsMonth || isLastDayOfItsMonth) {
        showMonthAbbr = true;
      }
      // ИЛИ если это последний день своего *фактического* месяца И он отображается вне текущего месяца
      // (т.е. 30/31 мая, если текущий месяц - июнь)
      else if (
        isOutsideMonth &&
        dayInLoop.isSame(dayInLoop.endOf("month"), "day")
      ) {
        showMonthAbbr = true;
      }
      days.push(
        <DayCell
          key={dayInLoop.format("YYYY-MM-DD")}
          isOutsideMonth={isOutsideMonth}
        >
          <div className="day-number-and-month">
            <span className="day-number">{dayInLoop.date()}</span>
            {showMonthAbbr && (
              <span className="month-abbr">{dayInLoop.format("MMM")}</span>
            )}
          </div>
          {dailyTasks.map((task) => (
            <TaskCard key={task.id} taskColor={task.color || "default"}>
              {task.title}
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
