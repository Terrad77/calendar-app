import { createAsyncThunk } from '@reduxjs/toolkit';
import instance from '../../API/axiosInstance';
import toastMaker from '../../utils/toastMaker/toastMaker';
import type { ThunkConfig } from '../types/thunkConfig';
import type { Task } from './types';

// MIN_DATE (beginning of 2025)
export const MIN_DATE = new Date('2025-01-01T00:00:00.000Z').getTime();

// check for date validity for use except past dates
const isDateValid = (timestamp: number) => {
  const now = Date.now();
  return timestamp >= MIN_DATE && timestamp <= now;
};

// Get tasks for a day
export const getDayTask = createAsyncThunk<Task[], string, ThunkConfig<string>>(
  'task/DayTask',
  async (date, thunkAPI) => {
    try {
      const timestamp = new Date(date).getTime();
      // if date is in the future - return empty array
      if (timestamp > Date.now()) {
        return [];
      }
      // if date is before MIN_DATE - return empty array
      if (timestamp < MIN_DATE) {
        return [];
      }
      const response = await instance.get(`api/task/day/${date}`);
      return response.data.TaskData;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

export type NewNote = {
  date: number;
  [key: string]: unknown;
};

// Add a new task
export const addTask = createAsyncThunk<Task, NewNote, ThunkConfig<string>>(
  'task/addTask',
  async (newNote, { rejectWithValue }) => {
    if (!isDateValid(newNote.date)) {
      toastMaker("You can't add task in the past", 'error');
      return rejectWithValue('Invalid date');
    }

    try {
      const { data } = await instance.post('api/task', newNote);
      console.log('addTask API response:', data);
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return rejectWithValue(errorMessage);
    }
  }
);

// Delete a task
export const deleteTask = createAsyncThunk<
  { success: boolean; id: string }, // що реально повертає бекенд
  string, // аргумент — ID завдання
  ThunkConfig<string>
>('task/deleteTask', async (taskId, { rejectWithValue }) => {
  try {
    const { data } = await instance.delete(`api/task/${taskId}`);
    return data; // { success, id }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return rejectWithValue(errorMessage);
  }
});

type EditTaskPayload = {
  id: string;
  newNote: Record<string, unknown>;
};

// Edit a task
export const editTask = createAsyncThunk<
  Task, // возвращаем
  EditTaskPayload, // аргумент
  ThunkConfig<string>
>('task/editTask', async ({ id, newNote }, { rejectWithValue }) => {
  try {
    const { data } = await instance.put(`api/task/${id}`, newNote);
    return data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return rejectWithValue(errorMessage);
  }
});

// Get month info
export const getMonthInfo = createAsyncThunk<Task[], string, ThunkConfig<string>>(
  'task/getMonthInfo',
  async (date, { rejectWithValue }) => {
    try {
      const { data } = await instance.get<Task[]>(`api/task/month/${date}`);
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export default { deleteTask, getDayTask, addTask, editTask, getMonthInfo };
