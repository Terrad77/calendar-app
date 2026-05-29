import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  border: '1px solid var(--surface-panel-border)',
  background:
    'linear-gradient(180deg, var(--surface-panel-start) 0%, var(--surface-panel-end) 100%)',
  boxShadow: '0 20px 50px var(--surface-panel-shadow), 0 2px 10px var(--surface-panel-inset)',
  backdropFilter: 'blur(14px)',
  overflow: 'visible',
  width: '100%',
  maxWidth: '520px',
  margin: '0 auto',
  color: 'var(--surface-calendar-text)',

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
    background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
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
  backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  color: 'var(--color-accent)',
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
  color: 'var(--surface-calendar-title)',
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
  color: 'var(--surface-calendar-subtle)',
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
  border: '1px solid var(--surface-calendar-control-border)',
  borderRadius: '14px',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  fontSize: '0.92rem',
  color: 'var(--surface-calendar-control-text)',
  boxShadow: '0 1px 0 var(--surface-panel-inset) inset',
  transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
  '&:focus': {
    outline: 'none',
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent)',
  },
  '&::placeholder': {
    color: 'var(--surface-calendar-search-placeholder)',
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
  color: 'var(--surface-calendar-subtle)',

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
  color: 'var(--surface-calendar-muted)',
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
  border: '1px solid var(--surface-calendar-control-border)',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  cursor: 'pointer',
  fontSize: '0.84rem',
  fontWeight: 600,
  color: 'var(--surface-calendar-control-text)',
  boxShadow: '0 4px 12px var(--surface-calendar-search-shadow)',
  transition:
    'transform 0.18s ease, background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
  '&:hover': {
    backgroundColor: 'var(--surface-calendar-control-hover-bg)',
    borderColor: 'var(--surface-calendar-control-hover-border)',
    boxShadow: '0 8px 20px var(--surface-calendar-search-shadow)',
    transform: 'translateY(-1px)',
  },
  '&:focus-visible': {
    outline: '2px solid color-mix(in srgb, var(--color-accent) 24%, transparent)',
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
        background:
          'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
        color: 'var(--surface-button-text)',
        borderColor: 'var(--surface-button-border)',
        boxShadow: '0 10px 24px var(--surface-button-shadow)',
        '&:hover': {
          background:
            'linear-gradient(180deg, var(--color-accent-hover) 0%, var(--color-accent) 100%)',
          borderColor: 'var(--surface-button-border)',
          boxShadow: '0 12px 28px var(--surface-button-shadow)',
        },
      },
    },
    danger: {
      true: {
        backgroundColor: 'color-mix(in srgb, var(--color-status-error) 16%, transparent)',
        color: 'color-mix(in srgb, var(--color-status-error) 28%, var(--surface-calendar-text))',
        borderColor: 'color-mix(in srgb, var(--color-status-error) 28%, transparent)',
        boxShadow: '0 4px 12px color-mix(in srgb, var(--color-status-error) 14%, transparent)',
        '&:hover': {
          backgroundColor: 'color-mix(in srgb, var(--color-status-error) 24%, transparent)',
          borderColor: 'color-mix(in srgb, var(--color-status-error) 38%, transparent)',
        },
      },
    },
    subtle: {
      true: {
        backgroundColor: 'var(--surface-calendar-control-bg)',
        color: 'var(--surface-calendar-control-text)',
        borderColor: 'var(--surface-calendar-control-border)',
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
  border: '1px solid var(--surface-calendar-control-border)',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--surface-calendar-control-text)',
  boxShadow: '0 4px 12px var(--surface-calendar-search-shadow)',

  '&:hover': {
    borderColor: 'var(--surface-calendar-control-hover-border)',
    transform: 'translateY(-1px)',
  },

  '&:focus-visible': {
    outline: '2px solid color-mix(in srgb, var(--color-accent) 24%, transparent)',
    outlineOffset: '2px',
  },

  variants: {
    color: {
      default: { '--swatch': '#94a3b8', color: 'var(--surface-calendar-control-text)' },
      red: { '--swatch': '#f05050', color: 'var(--surface-calendar-control-text)' },
      yellow: { '--swatch': '#f2d200', color: 'var(--surface-calendar-control-text)' },
      green: { '--swatch': '#62c050', color: 'var(--surface-calendar-control-text)' },
    },
    isSelected: {
      true: {
        borderColor: 'var(--surface-calendar-today-border)',
        boxShadow:
          '0 0 0 4px color-mix(in srgb, var(--surface-calendar-today-border) 24%, transparent)',
      },
    },
  },

  '&::before': {
    content: '',
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: 'var(--swatch)',
    boxShadow: '0 0 0 1px var(--surface-panel-inset) inset',
  },
});

const FooterNote = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  color: 'var(--surface-calendar-muted)',
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

// Note: label text and button copy are produced via i18n `t()` calls in the component.
// Removed unused local label helpers to satisfy TypeScript no-unused-vars checks.

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

  const { t } = useTranslation(['calendar', 'common']);

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
          <FormKicker>{isEditing ? t('form_kicker_edit') : t('form_kicker_new')}</FormKicker>
          <FormTitle>{isEditing ? t('form_title_edit') : t('form_title_create')}</FormTitle>
          <FormDescription>
            {isEditing ? t('form_description_edit') : t('form_description_create')}
          </FormDescription>
        </HeaderMeta>
      </FormHeader>

      {isCreatingInPast && <HelperText>{t('past_events_only_edit_delete')}</HelperText>}

      <HelperText>{t('enter_to_save')}</HelperText>

      <InputStack>
        <FieldGroup>
          <FieldLabel htmlFor="task-title">{t('label_title')}</FieldLabel>
          <TaskInput
            id="task-title"
            type="text"
            placeholder={t('placeholder_title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Task title input"
          />
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="task-description">{t('label_description')}</FieldLabel>
          <TaskInput
            id="task-description"
            type="text"
            placeholder={t('placeholder_description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Task description input"
          />
        </FieldGroup>
      </InputStack>

      <FieldGroup>
        <FieldLabel>{t('label_color')}</FieldLabel>
        <ColorSelectorWrapper>
          {availableColors.map((color) => {
            const selected = selectedColors.includes(color);

            const colorLabel = t(`color_${color}`);
            const ariaLabel = `${selected ? t('selected') : t('choose')} ${colorLabel}`;

            return (
              <ColorOption
                key={color}
                color={color}
                isSelected={selected}
                onClick={() => handleColorToggle(color)}
                type="button"
                aria-pressed={selected}
                aria-label={ariaLabel}
              >
                {colorLabel}
              </ColorOption>
            );
          })}
        </ColorSelectorWrapper>
      </FieldGroup>

      <FooterNote>
        <ActionGroup>
          {initialTask && onDuplicate && (
            <TaskInputButton
              type="button"
              onClick={handleDuplicateClick}
              subtle
              disabled={isPastDate(initialTask.date)}
            >
              {t('copy')}
            </TaskInputButton>
          )}
          {initialTask && onDelete && (
            <TaskInputButton type="button" onClick={handleDeleteClick} danger>
              {t('delete')}
            </TaskInputButton>
          )}
        </ActionGroup>
      </FooterNote>

      <TaskInputButtons>
        <TaskInputButton type="button" onClick={onCancel}>
          {t('common:cancel')}
        </TaskInputButton>
        <TaskInputButton type="button" primary onClick={handleSaveClick}>
          {initialTask
            ? t('save_changes')
            : isCreatingInPast
              ? t('cannot_add_here')
              : t('add_event_button')}
        </TaskInputButton>
      </TaskInputButtons>
    </TaskInputFormWrapper>
  );
};
