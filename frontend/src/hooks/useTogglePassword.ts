import { useState } from 'react';
import type { IconName } from '../types/types';

export const useTogglePassword = (initialState = false) => {
  const [isVisible, setIsVisible] = useState(initialState);

  const toggle = () => setIsVisible((prev) => !prev);
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return {
    isVisible,
    toggle,
    show,
    hide,
    inputType: isVisible ? 'text' : 'password',
    iconName: (isVisible ? 'eyeOff' : 'eye') as IconName,
    ariaLabel: isVisible ? 'Hide password' : 'Show password',
  };
};
