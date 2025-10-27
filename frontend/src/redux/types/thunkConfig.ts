import type { AsyncThunkConfig } from '@reduxjs/toolkit';

export interface ThunkConfig<RejectValue = unknown> extends AsyncThunkConfig {
  state: any;
  dispatch: any;
  rejectValue: RejectValue;
}
