import React, { useMemo } from 'react';
import { styled } from '@stitches/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalendarEvent } from '../../types/types';

const TaskMarker = styled('span', {
  width: '24px',
  height: '5px',
  borderRadius: '6px',
  flexShrink: 0,
  variants: {
    color: {
      default: { backgroundColor: '#a0a0a0' },
      red: { backgroundColor: '#f05050' },
      yellow: { backgroundColor: '#f2d200' },
      green: { backgroundColor: '#62c050' },
    },
  },
});

const TaskCard = styled('div', {
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: '10px',
  padding: '8px 10px',
  fontSize: '0.74rem',
  fontWeight: '500',
  color: '#1f2937',
  marginBottom: '6px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  border: '1px solid rgba(148,163,184,0.22)',
  boxShadow: '0 3px 10px rgba(15,23,42,0.06)',
  transition: 'all 0.2s ease-in-out',

  '&:last-child': {
    marginBottom: '0',
  },

  '& .task-title': {
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'wrap',
  },
  variants: {
    eventType: {
      task: {
        '&:hover': {
          boxShadow: '0 8px 16px rgba(15,23,42,0.12)',
        },
        backgroundColor: 'rgba(239,246,255,0.9)',
      },
      holiday: {
        color: '#be123c',
        backgroundColor: 'rgba(255,241,242,0.92)',
        borderColor: 'rgba(251,113,133,0.35)',
        boxShadow: '0 3px 12px rgba(225,29,72,0.14)',
      },
    },

    colors: {
      default: { borderColor: '#a0a0a0' },
      red: { borderColor: '#f05050' },
      yellow: { borderColor: '#f2d200' },
      green: { borderColor: '#62c050' },
    },
    isDragging: {
      true: {
        opacity: 0.7,
        boxShadow: '0 10px 22px rgba(15,23,42,0.2)',
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
}

export const TaskCardDraggable: React.FC<TaskCardDraggableProps> = ({
  event,
  onCardClick,
  customCursor: propCustomCursor,
  isDragging: propIsDragging,
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

      {/* description only for tasks */}
      {event.eventType === 'task' && event.description && (
        <p style={{ fontSize: '0.66rem', color: '#6b7280', marginTop: '4px' }}>
          {event.description}
        </p>
      )}

      {/*country code only for holidays */}
      {event.eventType === 'holiday' && event.countryCode && (
        <p style={{ fontSize: '0.66rem', color: '#e11d48', marginTop: '4px' }}>
          ({event.countryCode})
        </p>
      )}
    </TaskCard>
  );
};
