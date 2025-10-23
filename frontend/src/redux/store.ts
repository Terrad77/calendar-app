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
import userReducer from "./user/slice";
import taskReducer from "./task/slice";
import type { UserState } from "./user/types";
import type { TaskState } from "./task/types";

type PersistPartialCustom = {
  _persist: {
    version: number;
    rehydrated: boolean;
  };
};

// persist config for user slice
const userPersistConfig = {
  key: "user",
  storage,
  whitelist: ["refreshToken"], // save only refreshToken
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

export type RootState = {
  user: UserState & PersistPartialCustom;
  task: TaskState;
};

// infer types directly from store (Automatic types)
export type AppDispatch = typeof store.dispatch;
