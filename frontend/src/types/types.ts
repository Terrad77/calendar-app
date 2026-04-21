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

export const TASK_MARKER_COLORS = ['default', 'red', 'yellow', 'green'] as const;

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
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string;
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
  startTime: string; // Обов'язкове для зустрічей
  endTime?: string;
  location?: string;
  participants?: string[];
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
  selectedCountry: string;
  onPrev: () => void;
  onNext: () => void;
  onCountryChange: (countryCode: string) => void;
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
  isServiceAvailable?: boolean;
}

export interface ChatMessage extends ConversationMessage {
  id: string;
  isLoading?: boolean;
  actions?: AIAction[];
}

export interface AIResponse {
  action: 'create' | 'update' | 'delete' | 'query' | 'analyze';
  event?: {
    title: string;
    description?: string;
    startDate: string; // ISO date
    endDate: string; // ISO date
    startTime: string; // HH:MM
    endTime?: string; // HH:MM
    location?: string;
    participants?: string[];
    color?: string;
  };
  message: string;
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
  return obj && typeof obj.message === 'string' && typeof obj.action === 'string';
};

// Function to convert AI event data to CalendarEvent
export const convertAIEventToCalendarEvent = (aiEvent: any): CalendarEvent => {
  // Extract date from startDate (convert AI returns date type ISO to YYYY-MM-DD)
  const date = aiEvent.startDate
    ? aiEvent.startDate.split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Determine event type based on AI data
  const eventType: EventType = determineEventTypeFromAI(aiEvent);

  // Convert AI color to calendar color
  const calendarColor = convertToCalendarColor(aiEvent.color);

  // Create base event
  const baseEvent: BaseCalendarEvent = {
    id: generateUniqueId('event'),
    date,
    title: aiEvent.title || 'Нова подія',
    eventType,
    description: aiEvent.description || '',
    startTime: aiEvent.startTime || '09:00',
    endTime: aiEvent.endTime || '10:00',
    location: aiEvent.location || '',
    colors: [convertToCalendarColor(aiEvent.color)],
  };

  // Return appropriate event type
  switch (eventType) {
    case 'meeting':
      return {
        ...baseEvent,
        eventType: 'meeting',
        startTime: aiEvent.startTime || '09:00',
        endTime: aiEvent.endTime || '10:00',
        participants: aiEvent.participants || [],
        colors: [calendarColor],
      } as MeetingEvent;

    case 'task':
      return {
        ...baseEvent,
        eventType: 'task',
        colors: [calendarColor],
      } as TaskEvent;

    case 'reminder':
      return {
        ...baseEvent,
        eventType: 'reminder',
        reminderTime: aiEvent.startTime || '09:00',
        colors: [calendarColor],
      } as ReminderEvent;

    default:
      return {
        ...baseEvent,
        eventType: 'meeting',
        startTime: aiEvent.startTime || '09:00',
        endTime: aiEvent.endTime || '10:00',
        colors: [calendarColor],
      } as MeetingEvent;
  }
};

// Helper function to determine event type from AI data
const determineEventTypeFromAI = (aiEvent: any): EventType => {
  const title = (aiEvent.title || '').toLowerCase();

  // Check for keywords in title
  if (
    title.includes('зустріч') ||
    title.includes('meeting') ||
    title.includes('конференція') ||
    title.includes('конференция')
  ) {
    return 'meeting';
  }

  if (
    title.includes('задача') ||
    title.includes('task') ||
    title.includes('справ') ||
    title.includes('дело')
  ) {
    return 'task';
  }

  if (
    title.includes('нагадування') ||
    title.includes('reminder') ||
    title.includes('напоминание')
  ) {
    return 'reminder';
  }

  // If AI provides event type
  if (aiEvent.eventType && ['meeting', 'task', 'reminder', 'holiday'].includes(aiEvent.eventType)) {
    return aiEvent.eventType as EventType;
  }

  // Default to meeting for AI-created events (most common)
  return 'meeting';
};

// Helper function for generating unique IDs
export const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Function to convert any color to available ColorType
export const convertToCalendarColor = (color: string | undefined): ColorType => {
  if (!color) return 'default';

  const colorLower = color.toLowerCase().trim();

  // Якщо колір вже є в TASK_MARKER_COLORS
  if (TASK_MARKER_COLORS.includes(colorLower as ColorType)) {
    return colorLower as ColorType;
  }

  // Конвертація hex або назв кольорів в доступні кольори
  const colorMap: Record<string, ColorType> = {
    // HEX кольори → наші кольори
    '#3b82f6': 'default', // синій → default
    '#2563eb': 'default',
    '#1d4ed8': 'default',
    '#ef4444': 'red', // червоний → red
    '#dc2626': 'red',
    '#b91c1c': 'red',
    '#f59e0b': 'yellow', // жовтий → yellow
    '#d97706': 'yellow',
    '#b45309': 'yellow',
    '#10b981': 'green', // зелений → green
    '#059669': 'green',
    '#047857': 'green',
    '#8b5cf6': 'default', // фіолетовий → default
    '#7c3aed': 'default',
    '#6d28d9': 'default',

    // Назви кольорів → кольори календаря
    blue: 'default',
    red: 'red',
    yellow: 'yellow',
    green: 'green',
    orange: 'yellow', // оранжевий → yellow
    purple: 'default', // фіолетовий → default
    pink: 'default', // рожевий → default
    cyan: 'default', // блакитний → default
    gray: 'default', // сірий → default
  };

  return colorMap[colorLower] || 'default';
};

// Function to get all available colors for UI
export const getAvailableColors = (): ColorType[] => {
  return [...TASK_MARKER_COLORS];
};
