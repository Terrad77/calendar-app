import { QueryClient } from '@tanstack/react-query';

// Single shared QueryClient instance. It lives in its own module so non-React
// code (redux store / listener middleware) can import the very same instance
// the app renders with, without a circular dependency through main.tsx.
export const queryClient = new QueryClient();
