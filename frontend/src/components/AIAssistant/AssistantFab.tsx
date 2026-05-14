import { Sparkles } from 'lucide-react';
import clsx from 'clsx';
import styles from './AIAssistant.module.css';

interface AssistantFabProps {
  onOpen?: () => void;
  onClick?: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  badgeCount?: number;
  className?: string;
}

export const AssistantFab = ({
  onOpen,
  onClick,
  isActive = false,
  isDisabled = false,
  badgeCount,
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
        {typeof badgeCount === 'number' && badgeCount > 0 && (
          <span className={styles.assistantBadge}>{badgeCount > 99 ? '99+' : badgeCount}</span>
        )}
      </button>
    </div>
  );
};
