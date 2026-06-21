import { useEffect } from 'react';
import { useAppSelector } from '../redux/hooks';
import { selectUser } from '../redux/user/selectors';

// Reflect the persisted compactDensity preference onto <html> as a data-*
// attribute, mirroring the data-theme pattern in ThemeContext. CSS consumes
// [data-density="compact"] (desktop-only) to tighten the calendar grid.
// The preference lives in the Redux user, so it is read from the store here.
export const useDensity = (): void => {
  const user = useAppSelector(selectUser);
  const isCompact = user?.compactDensity ?? false;

  useEffect(() => {
    document.documentElement.dataset.density = isCompact ? 'compact' : 'comfortable';
  }, [isCompact]);
};
