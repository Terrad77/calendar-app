import { Sparkles } from 'lucide-react';
import clsx from 'clsx';
import styles from './AIAssistant.module.css';

interface AssistantFabProps {
  onOpen?: () => void;
  onClick?: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  className?: string;
}

export const AssistantFab = ({
  onOpen,
  onClick,
  isActive = false,
  isDisabled = false,
  className,
}: AssistantFabProps) => {
  const handleClick = () => {
    if (isDisabled) return;
    (onOpen || onClick)?.();
  };

  return (
    <div className={clsx(styles.assistantContainer, className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label="Open AI assistant"
        className={clsx(styles.assistantButton, isActive && styles.assistantButtonActive)}
      >
        <Sparkles className={styles.assistantIcon} />
      </button>
    </div>
  );
};
