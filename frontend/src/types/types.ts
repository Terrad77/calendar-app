import { Dayjs } from 'dayjs';
import type { CSS } from '@stitches/react';
import { ReactNode } from 'react';

// Icon types
export type IconName =
  | 'chevron-up'
  | 'chevron-down'
  | 'calendar'
  | 'search'
  | 'question-mark'
  | 'calendar-sad'
  | 'eye'
  | 'eyeOff'
  | 'sun'
  | 'moon'
  | 'x-close'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'clock';

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
export type EventType = 'task' | 'holiday' | 'meeting' | 'reminder';

// Calendar Event types
export interface BaseCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  eventType: EventType;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  colors?: ColorType[];
  countryCode?: string;
}

export interface TaskEvent extends BaseCalendarEvent {
  eventType: 'task';
  colors: ColorType[];
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface HolidayEvent extends BaseCalendarEvent {
  eventType: 'holiday';
  countryCode: string;
  isPublic?: boolean;
}

export interface MeetingEvent extends BaseCalendarEvent {
  eventType: 'meeting';
  startTime: string;
  endTime: string;
  location?: string;
  participants?: string[];
  color?: string;
  colors?: ColorType[];
}

export interface ReminderEvent extends BaseCalendarEvent {
  eventType: 'reminder';
  reminderTime?: string;
  isRecurring?: boolean;
  colors?: ColorType[];
}

export type CalendarEvent = TaskEvent | HolidayEvent | MeetingEvent | ReminderEvent;

// Type guards for CalendarEvent
export const isTaskEvent = (event: CalendarEvent): event is TaskEvent => event.eventType === 'task';

export const isHolidayEvent = (event: CalendarEvent): event is HolidayEvent =>
  event.eventType === 'holiday';

export const isMeetingEvent = (event: CalendarEvent): event is MeetingEvent =>
  event.eventType === 'meeting';

export const isReminderEvent = (event: CalendarEvent): event is ReminderEvent =>
  event.eventType === 'reminder';

// Component Props types
export interface CalendarHeaderProps {
  currentDate: Dayjs;
  viewMode: 'month' | 'week';
  isPending: boolean;
  onPrev: () => void;
  onNext: () => void;
  onViewModeChange: (mode: 'month' | 'week') => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchInputValue: string;
  onSearchClick?: () => void;
  className?: string;
}

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClick?: () => void;
  onClearClick?: () => void;
  css?: CSS;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export interface DotLoaderProps {
  text: string;
  size?: 'small' | 'medium' | 'large';
  color?: CSS['color'];
}

export interface HomePageProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  isLoading?: boolean;
  error?: string | null;
}

// API Response types
export interface Holiday {
  id: string;
  date: string;
  title: string;
  countryCode: string;
  eventType: 'holiday';
}

// Auth types
export interface SignInFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpFormData {
  email: string;
  password: string;
  repeatPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  token: string;
  expiresIn: number;
}

export interface RegisterError {
  message: string;
  statusCode?: number;
  field?: 'email' | 'password' | 'repeatPassword' | 'general';
}

// Modal types
export interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  btnClassName?: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
  overlayClassName?: string;
  closeOnOverlayClick?: boolean;
}

// Icon types
export interface IconProps {
  name: IconName;
  size?: CSS['fontSize'];
  color?: CSS['color'];
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
  role?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

// AI Service Types

export interface AIAssistantProps {
  currentEvents: CalendarEvent[];
  onEventCreate: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  className?: string;
}

export interface ChatMessage extends ConversationMessage {
  id: string;
  isLoading?: boolean;
  actions?: AIAction[];
}

export interface AIResponse {
  message: string;
  actions?: AIAction[];
  events?: CalendarEvent[];
  confidence?: number;
  type: 'message' | 'event_suggestion' | 'analysis' | 'error' | 'confirmation';
  metadata?: {
    processedEvents?: number;
    suggestedTimes?: string[];
    conflictsDetected?: boolean;
  };
}

export interface AIAction {
  type:
    | 'create_event'
    | 'update_event'
    | 'delete_event'
    | 'analyze_schedule'
    | 'find_time'
    | 'suggest_events'
    | 'system';
  label: string;
  data?: Partial<CalendarEvent> | { eventId: string } | { timeRange: string } | { action: string };
  confidence?: number;
  requiresConfirmation?: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: {
    eventCreated?: boolean;
    actionPerformed?: string;
    error?: string;
  };
}

export interface AIPreferences {
  workingHours: { start: string; end: string };
  preferredMeetingDuration: number;
  avoidEarlyMeetings: boolean;
  preferredBreakBetweenMeetings: number;
  timeZone?: string;
  workingDays?: number[]; // 0-6, where 0 is Sunday
  maxMeetingsPerDay?: number;
}

// Calendar types
export interface CalendarViewProps {
  events: CalendarEvent[];
  onEventCreate: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  currentDate: Dayjs;
  onDateChange: (date: Dayjs) => void;
  viewMode: 'month' | 'week';
  onViewModeChange: (mode: 'month' | 'week') => void;
}

export interface EventFormData {
  title: string;
  date: string;
  description?: string;
  eventType: EventType;
  startTime?: string;
  endTime?: string;
  location?: string;
  participants?: string[];
  color?: string;
  colors?: ColorType[];
  priority?: 'low' | 'medium' | 'high';
}

// API types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    error: string;
    warning: string;
    success: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Export common type guards
export const isCalendarEvent = (obj: any): obj is CalendarEvent => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.eventType === 'string'
  );
};

export const isAIResponse = (obj: any): obj is AIResponse => {
  return obj && typeof obj.message === 'string' && typeof obj.type === 'string';
};
