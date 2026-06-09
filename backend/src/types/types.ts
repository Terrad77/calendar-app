export interface NagerPublicHolidayResponse {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

export interface BackendHoliday {
  id: string;
  date: string;
  title: string;
  countryCode: string;
  eventType: 'holiday';
}

// CalendarEvent interface for data coming from the FRONTEND to the BACKEND
export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  location?: string;
  participants?: string[];
}
// Response interface from the AI assistant
export interface AIResponse {
  action: 'create' | 'update' | 'delete' | 'query' | 'analyze';
  event?: {
    title: string;
    description?: string;
    eventType?: 'task' | 'meeting' | 'reminder';
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    participants?: string[];
    color?: string;
  };
  message: string;
  events?: CalendarEvent[];
}
// Interface for messages in the AI conversation history
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
// Interface for the schedule analysis request
export interface AnalyzeScheduleRequest {
  events: CalendarEvent[];
  timeRange?: string;
}
// Interface for the free-time search request
export interface FindTimeRequest {
  events: CalendarEvent[];
  duration: number;
  preferences?: {
    preferredDays?: string[];
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
    avoidWeekends?: boolean;
  };
}
// Interface for the chat request to the AI assistant
export interface ChatRequest {
  message: string;
  events?: CalendarEvent[];
  conversationHistory?: ConversationMessage[];
}
