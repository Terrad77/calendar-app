import { useState } from 'react';
import { IconName } from '../components/Icon';

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
    iconName: (isVisible ? 'eye' : 'eyeOff') as IconName,
    ariaLabel: isVisible ? 'Hide password' : 'Show password',
  };
};
