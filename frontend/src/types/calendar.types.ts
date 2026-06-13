import type { Dayjs } from 'dayjs';
import type { CSS } from '@stitches/react';
import { generateUniqueId } from '../utils/idGenerator';

export const TASK_MARKER_COLORS = ['default', 'red', 'yellow', 'green'] as const;

export type ColorType = (typeof TASK_MARKER_COLORS)[number];
export type EventType = 'task' | 'holiday' | 'meeting' | 'reminder';

export interface CalendarEventPayload {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  countryCode?: string;
  reminderTime?: string;
  isRecurring?: boolean;
  isPublic?: boolean;
  isPrivate?: boolean;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  color?: ColorType;
  colors?: ColorType[];
  participants?: string[];
  metadata?: Record<string, unknown>;
  eventType?: EventType;
}

export interface BaseCalendarEvent {
  id: string;
  date: string;
  title: string;
  ownerId?: string;
  accessRole?: 'owner' | 'participant' | 'shared';
  participantStatus?: 'pending' | 'accepted' | 'declined' | null;
  ownerInfo?: { id: string; name: string } | null;
  eventType: EventType;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  colors?: ColorType[];
  countryCode?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  isRecurring?: boolean;
  isPrivate?: boolean;
  // Multi-day range (ISO strings); `date` stays the start day for grid placement.
  startDate?: string;
  endDate?: string;
  // Set on the expanded copies of a multi-day event for days after its start.
  isContinuation?: boolean;
}

export interface TaskEvent extends BaseCalendarEvent {
  eventType: 'task';
  colors: ColorType[];
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface HolidayEvent extends BaseCalendarEvent {
  eventType: 'holiday';
  countryCode?: string;
  isPublic?: boolean;
}

export interface MeetingEvent extends BaseCalendarEvent {
  eventType: 'meeting';
  startTime: string;
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

export const isTaskEvent = (event: CalendarEvent): event is TaskEvent => event.eventType === 'task';

export const isHolidayEvent = (event: CalendarEvent): event is HolidayEvent =>
  event.eventType === 'holiday';

export const isMeetingEvent = (event: CalendarEvent): event is MeetingEvent =>
  event.eventType === 'meeting';

export const isReminderEvent = (event: CalendarEvent): event is ReminderEvent =>
  event.eventType === 'reminder';

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

export interface Holiday {
  id: string;
  date: string;
  title: string;
  countryCode?: string;
  eventType: 'holiday';
}

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

export interface AIResponse {
  action: 'create' | 'update' | 'delete' | 'query' | 'analyze';
  event?: {
    title: string;
    description?: string;
    eventType?: 'task' | 'meeting' | 'reminder';
    startDate: string;
    endDate: string;
    startTime: string;
    endTime?: string;
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

export interface ChatMessage extends ConversationMessage {
  id: string;
  isLoading?: boolean;
  actions?: AIAction[];
}

export interface AIAssistantProps {
  currentEvents: CalendarEvent[];
  onEventCreate: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  className?: string;
  isServiceAvailable?: boolean;
}

export interface AIPreferences {
  workingHours: { start: string; end: string };
  preferredMeetingDuration: number;
  avoidEarlyMeetings: boolean;
  preferredBreakBetweenMeetings: number;
  timeZone?: string;
  workingDays?: number[];
  maxMeetingsPerDay?: number;
}

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

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

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

export const isCalendarEvent = (obj: unknown): obj is CalendarEvent => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.eventType === 'string'
  );
};

export const isAIResponse = (obj: unknown): obj is AIResponse => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  return typeof candidate.message === 'string' && typeof candidate.action === 'string';
};

type AIEventInput = Partial<NonNullable<AIResponse['event']>> & {
  eventType?: string;
};

export const convertAIEventToCalendarEvent = (aiEvent: AIEventInput): CalendarEvent => {
  const date = aiEvent.startDate
    ? aiEvent.startDate.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const eventType: EventType = determineEventTypeFromAI(aiEvent);
  const calendarColor = convertToCalendarColor(aiEvent.color);

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

const determineEventTypeFromAI = (aiEvent: AIEventInput): EventType => {
  const title = (aiEvent.title || '').toLowerCase();

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

  if (aiEvent.eventType && ['meeting', 'task', 'reminder', 'holiday'].includes(aiEvent.eventType)) {
    return aiEvent.eventType as EventType;
  }

  return 'meeting';
};

export const convertToCalendarColor = (color: string | undefined): ColorType => {
  if (!color) return 'default';

  const colorLower = color.toLowerCase().trim();

  if (TASK_MARKER_COLORS.includes(colorLower as ColorType)) {
    return colorLower as ColorType;
  }

  const colorMap: Record<string, ColorType> = {
    '#3b82f6': 'default',
    '#2563eb': 'default',
    '#1d4ed8': 'default',
    '#ef4444': 'red',
    '#dc2626': 'red',
    '#b91c1c': 'red',
    '#f59e0b': 'yellow',
    '#d97706': 'yellow',
    '#b45309': 'yellow',
    '#10b981': 'green',
    '#059669': 'green',
    '#047857': 'green',
    '#8b5cf6': 'default',
    '#7c3aed': 'default',
    '#6d28d9': 'default',
    blue: 'default',
    red: 'red',
    yellow: 'yellow',
    green: 'green',
    orange: 'yellow',
    purple: 'default',
    pink: 'default',
    cyan: 'default',
    gray: 'default',
  };

  return colorMap[colorLower] || 'default';
};

export const getAvailableColors = (): ColorType[] => {
  return [...TASK_MARKER_COLORS];
};
