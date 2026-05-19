import type { AsyncThunkConfig } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './storeTypes';

export interface ThunkConfig<RejectValue = unknown> extends AsyncThunkConfig {
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: RejectValue;
}
