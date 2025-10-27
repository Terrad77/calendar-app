export interface Task {
  _id: string;
  date: string;
  title: string;
  description?: string;
  eventType: 'task' | 'holiday';
  colors?: string[];
  countryCode?: string;
}

export interface TaskState {
  activeDay: string;
  dayTasks: {
    date: string;
    tasks: Task[];
  };
  monthTasks: Task[];
  currentDay: Task[];
  loading: boolean;
  error: string | null;
}
