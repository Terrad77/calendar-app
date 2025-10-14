export interface Task {
  _id: string;
  date: string;
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
}
