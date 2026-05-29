import React, { useMemo } from 'react';
import { styled } from '@stitches/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalendarEvent } from '../../../types/types';

const TaskMarker = styled('span', {
  width: '12px',
  height: '3px',
  borderRadius: '4px',
  flexShrink: 0,
  variants: {
    color: {
      default: { backgroundColor: '#94a3b8' },
      red: { backgroundColor: '#f05050' },
      yellow: { backgroundColor: '#f2d200' },
      green: { backgroundColor: '#62c050' },
    },
  },
});

const TaskCard = styled('div', {
  backgroundColor: 'var(--surface-calendar-cell)',
  borderRadius: '8px',
  padding: '6px 8px',
  fontSize: '0.7rem',
  fontWeight: '500',
  color: 'var(--surface-calendar-title)',
  marginBottom: '4px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  border: '1px solid var(--surface-calendar-cell-border)',
  boxShadow: '0 3px 10px var(--surface-calendar-cell-shadow)',
  transition: 'all 0.2s ease-in-out',

  '&:last-child': {
    marginBottom: '0',
  },

  '& .task-title': {
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  variants: {
    eventType: {
      task: {
        '&:hover': {
          boxShadow: '0 8px 16px var(--surface-calendar-cell-hover-shadow)',
        },
        backgroundColor: 'var(--surface-calendar-cell-hover)',
      },
      holiday: {
        color: 'var(--surface-calendar-holiday-text)',
        backgroundColor: 'var(--surface-calendar-holiday-bg)',
        borderColor: 'var(--surface-calendar-holiday-border)',
        boxShadow: '0 3px 12px var(--surface-calendar-cell-shadow)',
      },
    },

    colors: {
      default: { borderColor: '#94a3b8' },
      red: { borderColor: '#f05050' },
      yellow: { borderColor: '#f2d200' },
      green: { borderColor: '#62c050' },
    },
    isDragging: {
      true: {
        opacity: 0.7,
        boxShadow: '0 10px 22px var(--surface-calendar-cell-hover-shadow)',
      },
    },
    customCursor: {
      pointer: {
        cursor: 'pointer',
      },
      default: {
        cursor: 'default',
      },
      grabbing: {
        cursor: 'grabbing',
      },
    },
  },

  defaultVariants: {
    eventType: 'task',
    colors: 'default',
    isDragging: false,
    customCursor: 'pointer',
  },
});

interface TaskCardDraggableProps {
  event: CalendarEvent;
  onCardClick?: (e: React.MouseEvent, event: CalendarEvent) => void;
  isDragging?: boolean;
  customCursor?: 'pointer' | 'default' | 'grabbing';
  compact?: boolean;
}

export const TaskCardDraggable: React.FC<TaskCardDraggableProps> = ({
  event,
  onCardClick,
  customCursor: propCustomCursor,
  isDragging: propIsDragging,
  compact,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging,
  } = useSortable({
    id: event.id,
    data: {
      eventType: event.eventType,
      colors: event.colors,
      title: event.title,
      description: event.description,
      countryCode: event.countryCode,
    },
    disabled: event.eventType === 'holiday', // off D&D for Holidays
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'transform 0.2s ease-out',
  };

  const renderIsDragging = propIsDragging !== undefined ? propIsDragging : dndIsDragging;

  const finalCustomCursor = useMemo(() => {
    if (event.eventType === 'holiday') {
      return 'default';
    }
    if (renderIsDragging) {
      return 'grabbing';
    }
    return propCustomCursor || 'pointer';
  }, [event.eventType, renderIsDragging, propCustomCursor]);

  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      eventType={
        event.eventType === 'meeting' || event.eventType === 'reminder' ? 'task' : event.eventType
      }
      isDragging={renderIsDragging}
      customCursor={finalCustomCursor}
      onClick={onCardClick !== undefined ? (e) => onCardClick(e, event) : undefined}
      data-compact={compact ? 'true' : 'false'}
    >
      {event.eventType === 'task' ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* event.colors undefined for tasks, if has no color */}
          {(event.colors || ['default']).slice(0, 3).map((color, idx) => (
            <TaskMarker key={idx} color={color} />
          ))}
        </div>
      ) : null}

      <span className="task-title">{event.title}</span>

      {/* description preview (single line) only for tasks when not in compact mode */}
      {event.eventType === 'task' && !compact && event.description && (
        <p
          style={{
            fontSize: '0.66rem',
            color: 'var(--surface-calendar-subtle)',
            marginTop: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 0,
          }}
        >
          {String(event.description).split('\n')[0]}
        </p>
      )}

      {/*country code only for holidays */}
      {event.eventType === 'holiday' && event.countryCode && (
        <p
          style={{
            fontSize: '0.66rem',
            color: 'var(--surface-calendar-holiday-text)',
            marginTop: '4px',
          }}
        >
          ({event.countryCode})
        </p>
      )}
    </TaskCard>
  );
};
