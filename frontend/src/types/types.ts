import { Dayjs } from 'dayjs';
import type { CSS } from '@stitches/react';

export const TASK_MARKER_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'turquoise',
  'yellow',
  'default',
] as const;

export type ColorType = (typeof TASK_MARKER_COLORS)[number];

export type EventType = 'task' | 'holiday';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  eventType: 'task' | 'holiday';
  colors?: ColorType[];
  description?: string; // only for tasks
  countryCode?: string; // only for holidays
  // for compatibility with AIAssistant
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  location?: string;
  participants?: string[];
}

export interface CalendarHeaderProps {
  currentDate: Dayjs;
  viewMode: 'month' | 'week';
  isPending: boolean;
  onPrev: () => void;
  onNext: () => void;
  onViewModeChange: (mode: 'month' | 'week') => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchInputValue: string; //props for input value, for control from CalendarHeader
  onSearchClick?: () => void;
}
// Інтерфейс Holiday для даних, які приходять з БЕКЕНДУ на ФРОНТЕНД
export interface Holiday {
  id: string;
  date: string;
  title: string;
  countryCode: string;
  eventType: 'holiday';
}

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClick?: () => void; // props for click on icon
  css?: CSS; // props for passing styles via the 'css' prop Stitches
  className?: string;
  style?: React.CSSProperties;
}

export interface DotLoaderProps {
  text: string;
}

export interface HomePageProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

export interface AIResponse {
  action: 'create' | 'update' | 'delete' | 'query' | 'analyze';
  event?: CalendarEvent;
  message: string;
  events?: CalendarEvent[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SignInFormData {
  email: string;
  password: string;
}

export interface SignUpFormData extends SignInFormData {
  repeatPassword: string;
}

export interface RegisterError {
  message: string;
  statusCode?: number;
}
