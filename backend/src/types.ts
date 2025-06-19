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
