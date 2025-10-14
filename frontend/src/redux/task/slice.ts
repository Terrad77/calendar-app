import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import taskOps from "./operations";
import { logout } from "../user/operations";
import type { Task, TaskState } from "./types";

const initialState: TaskState = {
  activeDay: "",
  dayTasks: { date: "", tasks: [] },
  monthTasks: [],
  currentDay: [],
  loading: false,
};

const slice = createSlice({
  name: "task",
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
      .addCase(
        taskOps.addTask.fulfilled,
        (state, action: PayloadAction<Task>) => {
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
        }
      )
      .addCase(taskOps.addTask.rejected, (state) => {
        state.loading = false;
      })

      // Get Day Tasks
      .addCase(taskOps.getDayTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        taskOps.getDayTask.fulfilled,
        (state, action: PayloadAction<Task[][]>) => {
          state.loading = false;
          const flatTasks = action.payload.flat();
          state.dayTasks.tasks = flatTasks;

          if (flatTasks.length > 0) {
            const date = new Date(flatTasks[0].date);
            date.setUTCHours(0, 0, 0, 0);
            const requestDate = date.toISOString();

            const currentDate = new Date();
            currentDate.setUTCHours(0, 0, 0, 0);
            const currentDayISO = currentDate.toISOString();

            if (currentDayISO === requestDate) {
              state.currentDay = flatTasks;
            }
          }
        }
      )
      .addCase(taskOps.getDayTask.rejected, (state) => {
        state.loading = false;
        state.dayTasks.tasks = [];
      })

      // Delete Task
      .addCase(taskOps.deleteTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        taskOps.deleteTask.fulfilled,
        (state, action: PayloadAction<Task>) => {
          state.loading = false;
          state.dayTasks.tasks = state.dayTasks.tasks.filter(
            (item) => item._id !== action.payload._id
          );
          state.currentDay = state.currentDay.filter(
            (item) => item._id !== action.payload._id
          );
        }
      )
      .addCase(taskOps.deleteTask.rejected, (state) => {
        state.loading = false;
      })

      // Edit Task
      .addCase(taskOps.editTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        taskOps.editTask.fulfilled,
        (state, action: PayloadAction<Task>) => {
          state.loading = false;
          state.dayTasks.tasks = state.dayTasks.tasks.map((item) =>
            item._id === action.payload._id ? action.payload : item
          );
          state.currentDay = state.currentDay.map((item) =>
            item._id === action.payload._id ? action.payload : item
          );
        }
      )
      .addCase(taskOps.editTask.rejected, (state) => {
        state.loading = false;
      })

      // Logout — clearing tasks
      .addCase(logout.fulfilled, (state) => {
        state.dayTasks.tasks = [];
        state.currentDay = [];
      })

      // Get Month Info
      .addCase(taskOps.getMonthInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        taskOps.getMonthInfo.fulfilled,
        (state, action: PayloadAction<Task[]>) => {
          state.loading = false;
          state.monthTasks = action.payload;
        }
      )
      .addCase(taskOps.getMonthInfo.rejected, (state) => {
        state.loading = false;
      }),
});

export default slice.reducer;
export const { setActiveDay } = slice.actions;
