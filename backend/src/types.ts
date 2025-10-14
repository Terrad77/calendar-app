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
  eventType: "holiday";
}

// Інтерфейс CalendarEvent для даних, які приходять з ФРОНТЕНДУ на БЕКЕНД
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
// Інтерфейс відповіді від AI асистента
export interface AIResponse {
  action: "create" | "update" | "delete" | "query" | "analyze";
  event?: CalendarEvent;
  message: string;
  events?: CalendarEvent[];
}
// Інтерфейс для повідомлень в історії розмови з AI
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
// Інтерфейс для запиту на аналіз розкладу
export interface AnalyzeScheduleRequest {
  events: CalendarEvent[];
  timeRange?: string;
}
// Інтерфейс для запиту на пошук вільного часу
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
//  Інтерфейс для запиту на чат з AI асистентом
export interface ChatRequest {
  message: string;
  events?: CalendarEvent[];
  conversationHistory?: ConversationMessage[];
}
