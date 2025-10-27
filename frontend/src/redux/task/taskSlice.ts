import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import taskOps from './operations';
import { logout } from '../user/operations';
import type { Task, TaskState } from './types';

const initialState: TaskState = {
  activeDay: '',
  dayTasks: { date: '', tasks: [] },
  monthTasks: [],
  currentDay: [],
  loading: false,
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setActiveDay: (state, action: PayloadAction<string>) => {
      state.activeDay = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder
      // Add Task
      .addCase(taskOps.addTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(taskOps.addTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading = false;

        const date = new Date(action.payload.date);
        date.setUTCHours(0, 0, 0, 0);
        const requestDate = date.toISOString();

        if (state.activeDay === requestDate) state.dayTasks.tasks.push(action.payload);

        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const currentDayISO = currentDate.toISOString();

        if (currentDayISO === requestDate) state.currentDay.push(action.payload);
      })
      .addCase(taskOps.addTask.rejected, (state) => {
        state.loading = false;
      })

      // Delete Task
      .addCase(taskOps.deleteTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        taskOps.deleteTask.fulfilled,
        (state, action: PayloadAction<{ success: boolean; id: string }>) => {
          state.loading = false;
          state.dayTasks.tasks = state.dayTasks.tasks.filter(
            (item) => item._id !== action.payload.id
          );
          state.currentDay = state.currentDay.filter((item) => item._id !== action.payload.id);
        }
      )
      .addCase(taskOps.deleteTask.rejected, (state) => {
        state.loading = false;
      })

      // Edit Task
      .addCase(taskOps.editTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(taskOps.editTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading = false;
        state.dayTasks.tasks = state.dayTasks.tasks.map((item) =>
          item._id === action.payload._id ? action.payload : item
        );
        state.currentDay = state.currentDay.map((item) =>
          item._id === action.payload._id ? action.payload : item
        );
      })
      .addCase(taskOps.editTask.rejected, (state) => {
        state.loading = false;
      })

      // Get Day Tasks
      .addCase(taskOps.getDayTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(taskOps.getDayTask.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
        state.dayTasks.tasks = action.payload;

        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const currentDayISO = currentDate.toISOString();

        if (action.payload.length > 0) {
          const taskDate = new Date(action.payload[0].date);
          taskDate.setUTCHours(0, 0, 0, 0);
          const requestDate = taskDate.toISOString();

          if (currentDayISO === requestDate) state.currentDay = action.payload;
        }
      })
      .addCase(taskOps.getDayTask.rejected, (state) => {
        state.loading = false;
        state.dayTasks.tasks = [];
      })

      // Get Month Info
      .addCase(taskOps.getMonthInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(taskOps.getMonthInfo.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
        state.monthTasks = action.payload;
      })
      .addCase(taskOps.getMonthInfo.rejected, (state) => {
        state.loading = false;
      })

      // Logout — clearing tasks
      .addCase(logout.fulfilled, (state) => {
        state.dayTasks.tasks = [];
        state.currentDay = [];
        state.monthTasks = [];
      }),
});

export const { setActiveDay } = taskSlice.actions;
export default taskSlice.reducer;
