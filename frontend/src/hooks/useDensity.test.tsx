import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { useDensity } from './useDensity';

// Minimal store matching the shape selectUser reads (state.user.user).
const makeStore = (compactDensity: boolean | undefined) =>
  configureStore({
    reducer: {
      user: (state = { user: compactDensity === undefined ? {} : { compactDensity } }) => state,
    },
  });

const wrapperWith =
  (compactDensity: boolean | undefined) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={makeStore(compactDensity)}>{children}</Provider>
  );

describe('useDensity', () => {
  afterEach(() => {
    delete document.documentElement.dataset.density;
  });

  it('sets data-density="compact" when the user prefers compact density', () => {
    renderHook(() => useDensity(), { wrapper: wrapperWith(true) });
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('sets data-density="comfortable" when compact density is disabled', () => {
    renderHook(() => useDensity(), { wrapper: wrapperWith(false) });
    expect(document.documentElement.dataset.density).toBe('comfortable');
  });

  it('defaults to comfortable when the preference is absent', () => {
    renderHook(() => useDensity(), { wrapper: wrapperWith(undefined) });
    expect(document.documentElement.dataset.density).toBe('comfortable');
  });
});
