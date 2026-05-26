import React, { useState, useCallback, useEffect } from 'react';
import { styled } from '@stitches/react';
import {
  type ColorType,
  TASK_MARKER_COLORS,
  type CalendarEvent,
  TaskEvent,
} from '../../../types/types';
import { generateUniqueId } from '../../../utils/idGenerator';

const isPastDate = (date?: string | null) => {
  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate < today;
};

const TaskInputFormWrapper = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.72)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.96) 100%)',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.16), 0 2px 10px rgba(15, 23, 42, 0.06)',
  backdropFilter: 'blur(14px)',
  overflow: 'visible',
  width: '100%',
  maxWidth: '520px',
  margin: '0 auto',

  '@media (min-width: 1280px)': {
    maxWidth: '580px',
    padding: '28px',
    gap: '18px',
  },

  '@media (min-width: 1536px)': {
    maxWidth: '640px',
    padding: '32px',
    gap: '20px',
    borderRadius: '24px',
  },

  '&::before': {
    content: '',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
  },
});

const FormHeader = styled('div', {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  paddingTop: '6px',

  '@media (min-width: 1280px)': {
    gap: '18px',
    paddingTop: '2px',
  },

  '@media (min-width: 1536px)': {
    gap: '20px',
  },
});

const HeaderMeta = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

const FormKicker = styled('span', {
  display: 'inline-flex',
  alignSelf: 'flex-start',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  borderRadius: '999px',
  backgroundColor: 'rgba(37, 99, 235, 0.08)',
  color: '#1d4ed8',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

const FormTitle = styled('h3', {
  margin: 0,
  fontSize: '1.05rem',
  lineHeight: 1.15,
  letterSpacing: '-0.03em',
  color: '#0f172a',
  fontWeight: 700,

  '@media (min-width: 1280px)': {
    fontSize: '1.2rem',
  },

  '@media (min-width: 1536px)': {
    fontSize: '1.3rem',
  },
});

const FormDescription = styled('p', {
  margin: 0,
  fontSize: '0.86rem',
  lineHeight: 1.45,
  color: '#64748b',
  maxWidth: '30rem',

  '@media (min-width: 1280px)': {
    fontSize: '0.92rem',
    maxWidth: '34rem',
  },

  '@media (min-width: 1536px)': {
    fontSize: '0.98rem',
    maxWidth: '38rem',
  },
});

const TaskInput = styled('input', {
  width: '100%',
  minHeight: '44px',
  padding: '0.8rem 0.95rem',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  fontSize: '0.92rem',
  color: '#0f172a',
  boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03) inset',
  transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
  '&:focus': {
    outline: 'none',
    borderColor: 'rgba(37, 99, 235, 0.46)',
    boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.12)',
  },
  '&::placeholder': {
    color: '#94a3b8',
  },

  '@media (min-width: 1280px)': {
    minHeight: '48px',
    padding: '0.9rem 1rem',
    fontSize: '0.98rem',
  },

  '@media (min-width: 1536px)': {
    minHeight: '50px',
    padding: '0.95rem 1.05rem',
    fontSize: '1rem',
  },
});

const FieldGroup = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

const FieldLabel = styled('label', {
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: '#475569',

  '@media (min-width: 1280px)': {
    fontSize: '0.78rem',
  },

  '@media (min-width: 1536px)': {
    fontSize: '0.8rem',
  },
});

const HelperText = styled('p', {
  margin: 0,
  fontSize: '0.78rem',
  color: '#94a3b8',
  marginTop: '-4px',

  '@media (min-width: 1280px)': {
    fontSize: '0.82rem',
  },

  '@media (min-width: 1536px)': {
    fontSize: '0.86rem',
  },
});

const TaskInputButtons = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  paddingTop: '2px',

  '@media (min-width: 1280px)': {
    gap: '10px',
    paddingTop: '4px',
  },

  '@media (min-width: 1536px)': {
    gap: '12px',
  },
});

const TaskInputButton = styled('button', {
  minHeight: '40px',
  padding: '0.65rem 0.95rem',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  backgroundColor: 'rgba(255,255,255,0.9)',
  cursor: 'pointer',
  fontSize: '0.84rem',
  fontWeight: 600,
  color: '#0f172a',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
  transition:
    'transform 0.18s ease, background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
  '&:hover': {
    backgroundColor: '#fff',
    borderColor: 'rgba(148, 163, 184, 0.4)',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.1)',
    transform: 'translateY(-1px)',
  },
  '&:focus-visible': {
    outline: '2px solid rgba(37, 99, 235, 0.24)',
    outlineOffset: '2px',
  },
  '@media (min-width: 1280px)': {
    minHeight: '44px',
    padding: '0.75rem 1.05rem',
    fontSize: '0.9rem',
    borderRadius: '14px',
  },
  '@media (min-width: 1536px)': {
    minHeight: '46px',
    padding: '0.8rem 1.1rem',
    fontSize: '0.92rem',
    borderRadius: '14px',
  },
  variants: {
    primary: {
      true: {
        background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#fff',
        borderColor: 'rgba(37, 99, 235, 0.55)',
        boxShadow: '0 10px 24px rgba(37, 99, 235, 0.24)',
        '&:hover': {
          background: 'linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%)',
          borderColor: 'rgba(37, 99, 235, 0.7)',
          boxShadow: '0 12px 28px rgba(37, 99, 235, 0.28)',
        },
      },
    },
    danger: {
      true: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        color: '#b91c1c',
        borderColor: 'rgba(248, 113, 113, 0.28)',
        boxShadow: '0 4px 12px rgba(185, 28, 28, 0.08)',
        '&:hover': {
          backgroundColor: 'rgba(254, 242, 242, 0.96)',
          borderColor: 'rgba(248, 113, 113, 0.38)',
        },
      },
    },
    subtle: {
      true: {
        backgroundColor: 'rgba(255,255,255,0.72)',
        color: '#0f172a',
        borderColor: 'rgba(148, 163, 184, 0.22)',
      },
    },
  },
});

const ColorSelectorWrapper = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
  gap: '8px',

  '@media (min-width: 1280px)': {
    gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))',
    gap: '10px',
  },

  '@media (min-width: 1536px)': {
    gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
    gap: '12px',
  },
});

const ColorOption = styled('button', {
  minHeight: '36px',
  padding: '0.45rem 0.65rem',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  backgroundColor: 'rgba(255,255,255,0.9)',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#334155',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',

  '&:hover': {
    borderColor: 'rgba(148, 163, 184, 0.42)',
    transform: 'translateY(-1px)',
  },

  '&:focus-visible': {
    outline: '2px solid rgba(37, 99, 235, 0.24)',
    outlineOffset: '2px',
  },

  variants: {
    color: {
      default: { '--swatch': '#a0a0a0', color: '#475569' },
      red: { '--swatch': '#f05050', color: '#b91c1c' },
      yellow: { '--swatch': '#f2d200', color: '#a16207' },
      green: { '--swatch': '#62c050', color: '#166534' },
    },
    isSelected: {
      true: {
        borderColor: 'rgba(37, 99, 235, 0.55)',
        boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.12)',
      },
    },
  },

  '&::before': {
    content: '',
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: 'var(--swatch)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.65) inset',
  },
});

const FooterNote = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: '#64748b',
  fontSize: '0.76rem',
});

const ActionGroup = styled('div', {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginLeft: 'auto',
});

const InputStack = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
});

const fieldLabels = {
  title: 'Title',
  description: 'Description',
  colors: 'Color',
};

const colorLabels: Record<ColorType, string> = {
  default: 'Default',
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
};

const getFormTitle = (initialTask?: CalendarEvent | null) =>
  initialTask ? 'Edit event' : 'Create event';

const getFormDescription = (initialTask?: CalendarEvent | null) =>
  initialTask
    ? 'Update the details, duplicate it, or remove it from the calendar.'
    : 'Add a new calendar item with title, notes, and a color label.';

const getColorButtonLabel = (color: ColorType, selected: boolean) =>
  `${selected ? 'Selected' : 'Choose'} ${colorLabels[color]}`;

interface TaskInputFormProps {
  initialTask?: CalendarEvent | null;
  onSave: (task: CalendarEvent) => void; // callback for saving (add or update)
  onDuplicate?: (task: CalendarEvent) => void; // callback for copying an existing task
  onCancel: () => void; // callback for canceling
  onDelete?: (taskId: string) => void; // callback for delete
  initialDate?: string; // date for new task, if no exist initialTask
}

export const TaskInputForm: React.FC<TaskInputFormProps> = ({
  initialTask,
  onSave,
  onDuplicate,
  onCancel,
  onDelete,
  initialDate,
}) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [selectedColors, setSelectedColors] = useState<ColorType[]>(
    initialTask?.colors && initialTask.colors.length > 0 ? initialTask.colors : ['default']
  );

  useEffect(() => {
    setTitle(initialTask?.title || '');
    setDescription(initialTask?.description || '');
    setSelectedColors(
      initialTask?.colors && initialTask.colors.length > 0 ? initialTask.colors : ['default']
    );
  }, [initialTask]);

  const availableColors: ColorType[] = TASK_MARKER_COLORS as unknown as ColorType[];
  const isEditing = Boolean(initialTask);
  const isCreatingInPast = !isEditing && isPastDate(initialDate);

  // --- handler for button "Save" ---

  const handleSaveClick = useCallback(() => {
    if (title.trim() === '') {
      alert('Task title cannot be empty!');
      return;
    }

    if (isCreatingInPast) {
      alert('Cannot create events in the past.');
      return;
    }

    const taskId = initialTask?.id || generateUniqueId('task'); // generate ID for new task
    const taskDate = initialTask?.date || initialDate; // get date from exist task or initialDate

    if (!taskDate) {
      console.error('Task date is missing! Cannot save task.');

      return;
    }

    const taskToSave: TaskEvent = {
      id: taskId,
      title: title.trim(),
      description: description.trim(),
      date: taskDate,
      eventType: 'task',
      colors: selectedColors.length > 0 ? selectedColors : ['default'],
      completed: initialTask && 'completed' in initialTask ? initialTask.completed : false,
      priority: initialTask && 'priority' in initialTask ? initialTask.priority : 'medium',
      createdAt: initialTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(taskToSave);
  }, [title, description, selectedColors, initialTask, initialDate, onSave, isCreatingInPast]);

  // --- logic for btn "Delete"---
  const handleDeleteClick = useCallback(() => {
    if (initialTask?.id && onDelete) {
      onDelete(initialTask.id);
    }
  }, [initialTask, onDelete]);

  const handleDuplicateClick = useCallback(() => {
    if (!initialTask || !onDuplicate) {
      return;
    }

    if (isPastDate(initialTask.date)) {
      alert('Cannot duplicate events in the past.');
      return;
    }

    const copiedTask: TaskEvent = {
      id: generateUniqueId('task'),
      title: title.trim(),
      description: description.trim(),
      date: initialTask.date,
      eventType: 'task',
      colors: selectedColors.length > 0 ? selectedColors : ['default'],
      completed: initialTask && 'completed' in initialTask ? initialTask.completed : false,
      priority: initialTask && 'priority' in initialTask ? initialTask.priority : 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onDuplicate(copiedTask);
  }, [initialTask, onDuplicate, title, description, selectedColors]);

  // --- logic for color selector ---
  const handleColorToggle = useCallback((color: ColorType) => {
    setSelectedColors((prevColors) => {
      if (prevColors.includes(color)) {
        const newColors = prevColors.filter((c) => c !== color);

        return newColors.length > 0 ? newColors : ['default'];
      } else {
        if (color === 'default') {
          return ['default'];
        } else {
          // delete "default", if been once & add another color
          return [...prevColors.filter((c) => c !== 'default'), color];
        }
      }
    });
  }, []);

  // --- handle KeyDown ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSaveClick();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSaveClick, onCancel]
  );

  return (
    <TaskInputFormWrapper onClick={(e) => e.stopPropagation()}>
      <FormHeader>
        <HeaderMeta>
          <FormKicker>{isEditing ? 'Calendar event' : 'New event'}</FormKicker>
          <FormTitle>{getFormTitle(initialTask)}</FormTitle>
          <FormDescription>{getFormDescription(initialTask)}</FormDescription>
        </HeaderMeta>
      </FormHeader>

      {isCreatingInPast && (
        <HelperText>Events in the past can only be dragged, edited, or deleted.</HelperText>
      )}

      <HelperText>Tip: use Enter to save, Esc to close.</HelperText>

      <InputStack>
        <FieldGroup>
          <FieldLabel htmlFor="task-title">{fieldLabels.title}</FieldLabel>
          <TaskInput
            id="task-title"
            type="text"
            placeholder="Add a clear title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Task title input"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="task-description">{fieldLabels.description}</FieldLabel>
          <TaskInput
            id="task-description"
            type="text"
            placeholder="Add details, context, or notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Task description input"
          />
        </FieldGroup>
      </InputStack>

      <FieldGroup>
        <FieldLabel>{fieldLabels.colors}</FieldLabel>
        <ColorSelectorWrapper>
          {availableColors.map((color) => {
            const selected = selectedColors.includes(color);

            return (
              <ColorOption
                key={color}
                color={color}
                isSelected={selected}
                onClick={() => handleColorToggle(color)}
                type="button"
                aria-pressed={selected}
                aria-label={getColorButtonLabel(color, selected)}
              >
                {colorLabels[color]}
              </ColorOption>
            );
          })}
        </ColorSelectorWrapper>
      </FieldGroup>

      <FooterNote>
        <span>Enter to save, Esc to close</span>
        <ActionGroup>
          {initialTask && onDuplicate && (
            <TaskInputButton
              type="button"
              onClick={handleDuplicateClick}
              subtle
              disabled={isPastDate(initialTask.date)}
            >
              Copy
            </TaskInputButton>
          )}
          {initialTask && onDelete && (
            <TaskInputButton type="button" onClick={handleDeleteClick} danger>
              Delete
            </TaskInputButton>
          )}
        </ActionGroup>
      </FooterNote>

      <TaskInputButtons>
        <TaskInputButton type="button" onClick={onCancel}>
          Cancel
        </TaskInputButton>
        <TaskInputButton type="button" primary onClick={handleSaveClick}>
          {initialTask ? 'Save changes' : isCreatingInPast ? 'Cannot add here' : 'Add event'}
        </TaskInputButton>
      </TaskInputButtons>
    </TaskInputFormWrapper>
  );
};
