import { styled } from "@stitches/react";
import { Dayjs } from "dayjs";
import Icon from "../Icon"; // Путь к компоненту Icon

const HeaderWrapper = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
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
  backgroundColor: "#e3e5e6",
  border: "1px solid #e0e0e0",
  borderRadius: "3px",
  cursor: "default",
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
    backgroundColor: "#c7cbcf",
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

const countryOptions = [
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "USA" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "PL", name: "Poland" },
  { code: "CA", name: "Canada" },
];

interface CalendarHeaderProps {
  currentDate: Dayjs;
  viewMode: "month" | "week";
  isPending: boolean;
  countryCode: string;
  onPrev: () => void;
  onNext: () => void;
  onCountryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onViewModeChange: (mode: "month" | "week") => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  isPending,
  countryCode,
  onPrev,
  onNext,
  onCountryChange,
  onViewModeChange,
}) => {
  return (
    <HeaderWrapper>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <CurrentViewDisplayButton tabIndex={-1}>
          {viewMode === "month" ? "Monthly" : "Weekly"}
        </CurrentViewDisplayButton>
        <ButtonContainer>
          <NavButton onClick={onPrev} disabled={isPending}>
            <Icon name="chevron-up" />
          </NavButton>
          <NavButton onClick={onNext} disabled={isPending}>
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
          onChange={onCountryChange}
          disabled={isPending}
        >
          {countryOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </CountrySelect>
        <ViewButton onClick={() => onViewModeChange("week")}>Week</ViewButton>
        <ViewButton onClick={() => onViewModeChange("month")}>Month</ViewButton>
      </ButtonContainer>
    </HeaderWrapper>
  );
};
