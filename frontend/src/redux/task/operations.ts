import { createAsyncThunk } from "@reduxjs/toolkit";
import instance from "../../API/axiosInstance";
import toastMaker from "../../utils/toastMaker/toastMaker";
import { type ThunkConfig } from "../store";
import type { Task } from "./types";

// Константа для минимальной допустимой даты (начало 2025 года)
export const MIN_DATE = new Date("2025-01-01T00:00:00.000Z").getTime();

// Проверка, что дата не в прошлом (с учётом MIN_DATE)
const isDateValid = (timestamp: number) => {
  const now = Date.now();
  return timestamp >= MIN_DATE && timestamp <= now;
};

// // type for task
// export interface Task {
//   id: string;
//   date: number;
//   [key: string]: unknown;
// }

export const getDayTask = createAsyncThunk<
  Task[], // что возвращаем
  string, // что принимаем (date)
  ThunkConfig<string> // конфиг с типом ошибки
>("task/DayTask", async (date, thunkAPI) => {
  try {
    const timestamp = new Date(date).getTime();
    // Если дата больше текущей (будущая) - возвращаем пустой массив
    if (timestamp > Date.now()) {
      return [];
    }
    // Если дата раньше MIN_DATE - возвращаем пустой массив
    if (timestamp < MIN_DATE) {
      return [];
    }
    const response = await instance.get(`api/task/day/${date}`);
    return response.data.TaskData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

export type NewNote = {
  date: number;
  [key: string]: unknown;
};

export const addTask = createAsyncThunk<Task, NewNote, ThunkConfig<string>>(
  "task/addTask",
  async (newNote, { rejectWithValue }) => {
    if (!isDateValid(newNote.date)) {
      toastMaker("You can't add task in the past", "error");
      return rejectWithValue("Invalid date");
    }

    try {
      const { data } = await instance.post("api/task", newNote);
      console.log("addTask API response:", data);
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteTask = createAsyncThunk<
  { success: boolean; id: string }, // возвращаем
  string, // аргумент (id)
  ThunkConfig<string>
>("task/deleteTask", async (id, { rejectWithValue }) => {
  try {
    const { data } = await instance.delete<{ success: boolean; id: string }>(
      `api/task/${id}`
    );
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return rejectWithValue(errorMessage);
  }
});

type EditTaskPayload = {
  id: string;
  newNote: Record<string, unknown>;
};

export const editTask = createAsyncThunk<
  Task, // возвращаем
  EditTaskPayload, // аргумент
  ThunkConfig<string>
>("task/editTask", async ({ id, newNote }, { rejectWithValue }) => {
  try {
    const { data } = await instance.put(`api/task/${id}`, newNote);
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return rejectWithValue(errorMessage);
  }
});

export const getMonthInfo = createAsyncThunk<
  Record<string, unknown>, // возвращаем
  string, // аргумент (date)
  ThunkConfig<string>
>("task/getMonthInfo", async (date, { rejectWithValue }) => {
  try {
    const { data } = await instance.get<Record<string, unknown>>(
      `api/task/month/${date}`
    );
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return rejectWithValue(errorMessage);
  }
});

export default { deleteTask, getDayTask, addTask, editTask, getMonthInfo };
