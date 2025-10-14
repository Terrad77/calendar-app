import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import userReducer, { type UserState } from "./user/slice";
import taskReducer from "./task/slice";
import type { TaskState } from "./task/types";

type PersistPartialCustom = {
  _persist: {
    version: number;
    rehydrated: boolean;
  };
};

const userPersistConfig = {
  key: "user",
  storage,
  whitelist: ["refreshToken"], // зберегти тільки токен
};
const persistedUserReducer = persistReducer(userPersistConfig, userReducer);

export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    task: taskReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Тип RootState для типізації getState
export type RootState = {
  user: UserState & PersistPartialCustom;
  task: TaskState;
};

export type AppDispatch = typeof store.dispatch;

export type ThunkConfig<RejectValue = unknown> = {
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: RejectValue;
};
