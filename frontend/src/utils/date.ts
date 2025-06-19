import dayjs from "dayjs";

export function generateCalendarMatrix(
  currentDate: dayjs.Dayjs
): dayjs.Dayjs[][] {
  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");

  const startDate = startOfMonth.startOf("week");
  const endDate = endOfMonth.endOf("week");

  const matrix: dayjs.Dayjs[][] = [];
  let current = startDate;

  while (current.isBefore(endDate, "day")) {
    const week: dayjs.Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = current.add(1, "day");
    }
    matrix.push(week);
  }

  return matrix;
}
