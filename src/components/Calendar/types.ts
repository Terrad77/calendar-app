export interface PublicHolidayApiResponse {
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

export const TASK_MARKER_COLORS_FOR_SELECTOR = [
  "blue",
  "green",
  "orange",
  "purple",
  "turquoise",
  "yellow",
  "default",
] as const;

export type ColorType = (typeof TASK_MARKER_COLORS_FOR_SELECTOR)[number];

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  eventType: "task" | "holiday";
  colors?: ColorType[];
}
