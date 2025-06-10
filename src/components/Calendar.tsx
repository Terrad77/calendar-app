import React, { useState } from "react";
import { styled } from "@stitches/react";
import dayjs, { Dayjs } from "dayjs";

const Wrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "24px",
});

const Header = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
});

const MonthLabel = styled("h2", {
  margin: 0,
  fontSize: "1.5rem",
});

const NavButton = styled("button", {
  padding: "6px 12px",
  fontSize: "1rem",
  backgroundColor: "#eee",
  border: "1px solid #ccc",
  borderRadius: "4px",
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "#ddd",
  },
});

const ViewSwitch = styled("div", {
  display: "flex",
  gap: "8px",
});

const ViewButton = styled("button", {
  padding: "6px 12px",
  fontSize: "1rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
  cursor: "pointer",
  variants: {
    active: {
      true: {
        backgroundColor: "#0070f3",
        color: "#fff",
      },
      false: {
        backgroundColor: "#eee",
        color: "#333",
      },
    },
  },
});

const CalendarGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "1px",
  backgroundColor: "#ccc",
});

const DayCell = styled("div", {
  backgroundColor: "#fff",
  height: "100px",
  padding: "4px",
});

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const startDayOfWeek = startOfMonth.day();
  const daysInMonth = endOfMonth.date();

  const handlePrev = () => {
    setCurrentDate((prev) =>
      viewMode === "month"
        ? prev.subtract(1, "month")
        : prev.subtract(1, "week")
    );
  };

  const handleNext = () => {
    setCurrentDate((prev) =>
      viewMode === "month" ? prev.add(1, "month") : prev.add(1, "week")
    );
  };

  const renderDays = () => {
    const days: JSX.Element[] = [];

    if (viewMode === "month") {
      for (let i = 0; i < startDayOfWeek; i++) {
        days.push(<DayCell key={`empty-${i}`} />);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        days.push(
          <DayCell key={day}>
            <strong>{day}</strong>
          </DayCell>
        );
      }
    } else {
      // WEEK MODE: показываем текущую неделю
      const startOfWeek = currentDate.startOf("week");
      for (let i = 0; i < 7; i++) {
        const date = startOfWeek.add(i, "day");
        days.push(
          <DayCell key={date.format("YYYY-MM-DD")}>
            <strong>{date.date()}</strong>
          </DayCell>
        );
      }
    }

    return days;
  };

  return (
    <Wrapper>
      <Header>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <NavButton onClick={handlePrev}>←</NavButton>
          <MonthLabel>{currentDate.format("MMMM YYYY")}</MonthLabel>
          <NavButton onClick={handleNext}>→</NavButton>
        </div>
        <ViewSwitch>
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
        </ViewSwitch>
      </Header>

      <CalendarGrid>
        {daysOfWeek.map((day) => (
          <DayCell
            key={day}
            style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
          >
            {day}
          </DayCell>
        ))}
        {renderDays()}
      </CalendarGrid>
    </Wrapper>
  );
};

export default Calendar;
