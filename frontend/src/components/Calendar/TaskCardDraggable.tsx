import React, { useMemo } from 'react';
import { styled } from '@stitches/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CalendarEvent } from '../../types/types';

const TaskMarker = styled('span', {
  width: '34px',
  height: '6px',
  borderRadius: '6px',
  flexShrink: 0,
  variants: {
    color: {
      blue: { backgroundColor: '#0070bc' },
      green: { backgroundColor: '#62c050' },
      orange: { backgroundColor: '#fea93f' },
      purple: { backgroundColor: '#c67ae3' },
      turquoise: { backgroundColor: '#51ea9d' },
      yellow: { backgroundColor: '#f2d200' },
      default: { backgroundColor: '#a0a0a0' },
    },
  },
});

const TaskCard = styled('div', {
  backgroundColor: '#ffffff',
  borderRadius: '3px',
  padding: '4px 8px',
  fontSize: '0.7rem',
  fontWeight: '500',
  color: '#333',
  marginBottom: '4px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  transition: 'box-shadow 0.2s ease-in-out',

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
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        },
        backgroundColor: '#f0f8ff',
      },
      holiday: {
        color: 'red',
        boxShadow: '0 2px 6px #dc3545',
      },
    },

    colors: {
      default: { borderColor: '#6c757d' },
      blue: { borderColor: '#007bff' },
      green: { borderColor: '#28a745' },
      orange: { borderColor: '#fd7e14' },
      red: { borderColor: '#dc3545' }, // Використовується для рамки, якщо colors="red"
      yellow: { borderColor: '#ffc107' },
    },
    isDragging: {
      true: {
        opacity: 0.5,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
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
        <p style={{ fontSize: '0.65rem', color: '#666', marginTop: '2px' }}>{event.description}</p>
      )}

      {/*country code only for holidays */}
      {event.eventType === 'holiday' && event.countryCode && (
        <p style={{ fontSize: '0.65rem', color: 'red', marginTop: '2px' }}>({event.countryCode})</p>
      )}
    </TaskCard>
  );
};
