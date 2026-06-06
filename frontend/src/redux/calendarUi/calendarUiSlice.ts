import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface CalendarUiState {
  hiddenOwners: string[];
}

const initialState: CalendarUiState = {
  hiddenOwners: [],
};

const calendarUiSlice = createSlice({
  name: 'calendarUi',
  initialState,
  reducers: {
    toggleOwner(state, action: PayloadAction<string>) {
      const idx = state.hiddenOwners.indexOf(action.payload);
      if (idx >= 0) {
        state.hiddenOwners.splice(idx, 1);
      } else {
        state.hiddenOwners.push(action.payload);
      }
    },
  },
});

export const { toggleOwner } = calendarUiSlice.actions;

export const selectHiddenOwners = (state: { calendarUi: CalendarUiState }) =>
  state.calendarUi.hiddenOwners;

export default calendarUiSlice.reducer;
