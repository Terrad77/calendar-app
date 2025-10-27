// import type { RootState } from '../store';
import type { RootState } from '../types/storeTypes';

// Select active day
export const selectActiveDay = (state: RootState) => state.task.activeDay;

// Select loading status
export const selectIsLoading = (state: RootState) => state.task.loading;

// Select tasks grouped by day
export const selectDayTasks = (state: RootState) => state.task.dayTasks;

// Select tasks for the current day
export const selectCurrentDay = (state: RootState) => state.task.currentDay;

// Select tasks for the current month
export const selectMonthTasks = (state: RootState) => state.task.monthTasks;

export default {
  selectActiveDay,
  selectIsLoading,
  selectDayTasks,
  selectCurrentDay,
  selectMonthTasks,
};
