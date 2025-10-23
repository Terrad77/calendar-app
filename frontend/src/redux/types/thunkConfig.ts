import type { AsyncThunkConfig } from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "../store";
// Generic ThunkConfig to use in all async thunks
export interface ThunkConfig<RejectValue = unknown> extends AsyncThunkConfig {
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: RejectValue;
}
