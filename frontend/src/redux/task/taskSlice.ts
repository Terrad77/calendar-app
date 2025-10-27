import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Task, TaskState } from './types';
import { addTask, deleteTask, editTask, getDayTask, getMonthInfo } from './operations';

const initialState: TaskState = {
  activeDay: '',
  dayTasks: {
    date: '',
    tasks: [],
  },
  monthTasks: [],
  currentDay: [],
  loading: false,
  error: null,
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setActiveDay: (state, action: PayloadAction<string>) => {
      state.activeDay = action.payload;
    },
    clearTasks: (state) => {
      state.dayTasks.tasks = [];
      state.currentDay = [];
      state.monthTasks = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Add Task
      .addCase(addTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading = false;

        const date = new Date(action.payload.date);
        date.setUTCHours(0, 0, 0, 0);
        const requestDate = date.toISOString();

        if (state.activeDay === requestDate) {
          state.dayTasks.tasks.push(action.payload);
        }

        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const currentDayISO = currentDate.toISOString();

        if (currentDayISO === requestDate) {
          state.currentDay.push(action.payload);
        }
      })
      .addCase(addTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete Task
      .addCase(deleteTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteTask.fulfilled,
        (state, action: PayloadAction<{ success: boolean; id: string }>) => {
          state.loading = false;
          state.dayTasks.tasks = state.dayTasks.tasks.filter(
            (item) => item._id !== action.payload.id
          );
          state.currentDay = state.currentDay.filter((item) => item._id !== action.payload.id);
        }
      )
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Edit Task
      .addCase(editTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading = false;
        state.dayTasks.tasks = state.dayTasks.tasks.map((item) =>
          item._id === action.payload._id ? action.payload : item
        );
        state.currentDay = state.currentDay.map((item) =>
          item._id === action.payload._id ? action.payload : item
        );
      })
      .addCase(editTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get Day Tasks
      .addCase(getDayTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDayTask.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
        state.dayTasks.tasks = action.payload;
        state.dayTasks.date = state.activeDay;

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
      .addCase(getDayTask.rejected, (state, action) => {
        state.loading = false;
        state.dayTasks.tasks = [];
        state.error = action.payload as string;
      })

      // Get Month Info
      .addCase(getMonthInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMonthInfo.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
        state.monthTasks = action.payload;
      })
      .addCase(getMonthInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setActiveDay, clearTasks } = taskSlice.actions;
export default taskSlice.reducer;
