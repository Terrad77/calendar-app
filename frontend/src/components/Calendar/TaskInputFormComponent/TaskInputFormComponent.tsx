import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { styled, keyframes } from '@stitches/react';
import {
  type ColorType,
  TASK_MARKER_COLORS,
  type CalendarEvent,
  TaskEvent,
} from '../../../types/calendar.types';
import { generateUniqueId } from '../../../utils/idGenerator';
import OwnerAvatar from '../../OwnerAvatar/OwnerAvatar';

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

// Shake the field on invalid save attempts (iOS-style feedback).
const shake = keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '20%, 60%': { transform: 'translateX(-6px)' },
  '40%, 80%': { transform: 'translateX(6px)' },
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

  variants: {
    invalid: {
      true: {
        borderColor: 'var(--color-status-error)',
        animation: `${shake} 0.5s`,
      },
    },
  },
});

const FieldError = styled('p', {
  margin: '4px 0 0',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--color-status-error)',
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

const RecurringToggle = styled('label', {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 14px',
  borderRadius: '14px',
  border: '1px solid var(--surface-calendar-control-border)',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  color: 'var(--surface-calendar-control-text)',
  cursor: 'pointer',
});

const RecurringCheckbox = styled('input', {
  width: '16px',
  height: '16px',
  accentColor: 'var(--color-accent)',
  margin: 0,
  flexShrink: 0,
});

const RecurringText = styled('span', {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

const RecurringTitle = styled('span', {
  fontSize: '0.9rem',
  fontWeight: 600,
  lineHeight: 1.2,
});

const RecurringHint = styled('span', {
  fontSize: '0.78rem',
  color: 'var(--surface-calendar-muted)',
  lineHeight: 1.35,
});

const TimeRow = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
});

const FieldSelect = styled('select', {
  width: '100%',
  minHeight: '44px',
  padding: '0.7rem 0.9rem',
  border: '1px solid var(--surface-calendar-control-border)',
  borderRadius: '14px',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  color: 'var(--surface-calendar-control-text)',
  fontSize: '0.92rem',
  cursor: 'pointer',
  appearance: 'auto',
  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  '&:focus': {
    outline: 'none',
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent)',
  },
});

const SmallNumberInput = styled('input', {
  width: '4rem',
  minHeight: '40px',
  textAlign: 'center',
  border: '1px solid var(--surface-calendar-control-border)',
  borderRadius: '10px',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  color: 'var(--surface-calendar-control-text)',
  fontSize: '0.9rem',
  padding: '0.4rem 0.5rem',
  '&:focus': {
    outline: 'none',
    borderColor: 'var(--color-accent)',
  },
});

const RecurringPanel = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid var(--surface-calendar-control-border)',
  backgroundColor: 'var(--surface-panel-inset)',
});

const RecurringRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '0.85rem',
  color: 'var(--surface-calendar-control-text)',
});

const DaysRow = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
});

const DayButton = styled('button', {
  width: '2.2rem',
  height: '2.2rem',
  borderRadius: '999px',
  border: '1px solid var(--surface-calendar-control-border)',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  color: 'var(--surface-calendar-muted)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
  variants: {
    active: {
      true: {
        background:
          'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
        color: 'var(--surface-button-text)',
        borderColor: 'var(--surface-button-border)',
      },
    },
  },
});

// Note: label text and button copy are produced via i18n `t()` calls in the component.

type ReminderOption =
  | 'none'
  | 'atTime'
  | '5min'
  | '10min'
  | '15min'
  | '30min'
  | '1hour'
  | '2hours'
  | '1day'
  | '1week';

type RecurringType = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

interface RecurringConfig {
  interval: number;
  daysOfWeek: number[]; // 0=Sun, 1=Mon ... 6=Sat
  endDate: string; // ISO date string or ''
}

const REMINDER_OPTIONS: ReminderOption[] = [
  'none',
  'atTime',
  '5min',
  '10min',
  '15min',
  '30min',
  '1hour',
  '2hours',
  '1day',
  '1week',
];
// Removed unused local label helpers to satisfy TypeScript no-unused-vars checks.

interface TaskInputFormProps {
  initialTask?: CalendarEvent | null;
  onSave: (task: CalendarEvent) => void; // callback for saving (add or update)
  onDuplicate?: (task: CalendarEvent) => void; // callback for copying an existing task
  onCancel: () => void; // callback for canceling
  onDelete?: (taskId: string) => void; // callback for delete
  initialDate?: string; // date for new task, if no exist initialTask
  isSubmitting?: boolean;
  // Calendars shared with the current user with write permission. When
  // non-empty and not editing an existing task, show a calendar picker so
  // the user can choose to create the event in someone else's calendar
  // instead of their own.
  writableSharedCalendars?: { ownerId: string; ownerName: string }[];
}

export const TaskInputForm: React.FC<TaskInputFormProps> = ({
  initialTask,
  onSave,
  onDuplicate,
  onCancel,
  onDelete,
  initialDate,
  isSubmitting,
  writableSharedCalendars,
}) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [isPrivate, setIsPrivate] = useState(
    Boolean(
      (initialTask as (typeof initialTask & { isPrivate?: boolean }) | null | undefined)?.isPrivate
    )
  );
  const [selectedColors, setSelectedColors] = useState<ColorType[]>(
    initialTask?.colors && initialTask.colors.length > 0 ? initialTask.colors : ['default']
  );
  const [targetCalendarOwnerId, setTargetCalendarOwnerId] = useState<string>('');

  // Restore any saved custom recurrence config from metadata (not a typed field)
  const savedPattern = (
    initialTask as
      | { metadata?: { recurringPattern?: { type?: RecurringType } & Partial<RecurringConfig> } }
      | null
      | undefined
  )?.metadata?.recurringPattern;
  const savedReminder = (initialTask as { reminderTime?: string } | null | undefined)?.reminderTime;

  // Start/end dates default to the selected day; end mirrors start.
  const [startDate, setStartDate] = useState(initialTask?.date || initialDate || '');
  const [endDate, setEndDate] = useState(initialTask?.date || initialDate || '');
  const [startTime, setStartTime] = useState(initialTask?.startTime || '');
  const [endTime, setEndTime] = useState(initialTask?.endTime || '');
  const [reminder, setReminder] = useState<ReminderOption>(
    REMINDER_OPTIONS.includes(savedReminder as ReminderOption)
      ? (savedReminder as ReminderOption)
      : 'none'
  );
  const [recurringType, setRecurringType] = useState<RecurringType>(
    savedPattern?.type ?? (initialTask?.isRecurring ? 'daily' : 'never')
  );
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({
    interval: savedPattern?.interval ?? 1,
    daysOfWeek: savedPattern?.daysOfWeek ?? [],
    endDate: savedPattern?.endDate ?? '',
  });
  const [showRecurringConfig, setShowRecurringConfig] = useState(savedPattern?.type === 'custom');

  // Inline time-field validation errors and a counter that retriggers the shake.
  const [timeErrors, setTimeErrors] = useState<{
    startTime?: string;
    endTime?: string;
    endDate?: string;
  }>({});
  const [shakeNonce, setShakeNonce] = useState(0);

  useEffect(() => {
    setTitle(initialTask?.title || '');
    setDescription(initialTask?.description || '');
    setIsPrivate(
      Boolean(
        (initialTask as (typeof initialTask & { isPrivate?: boolean }) | null | undefined)
          ?.isPrivate
      )
    );
    setSelectedColors(
      initialTask?.colors && initialTask.colors.length > 0 ? initialTask.colors : ['default']
    );

    const pattern = (
      initialTask as
        | { metadata?: { recurringPattern?: { type?: RecurringType } & Partial<RecurringConfig> } }
        | null
        | undefined
    )?.metadata?.recurringPattern;
    const rem = (initialTask as { reminderTime?: string } | null | undefined)?.reminderTime;
    setStartDate(initialTask?.date || initialDate || '');
    setEndDate(initialTask?.date || initialDate || '');
    setStartTime(initialTask?.startTime || '');
    setEndTime(initialTask?.endTime || '');
    setReminder(
      REMINDER_OPTIONS.includes(rem as ReminderOption) ? (rem as ReminderOption) : 'none'
    );
    setRecurringType(pattern?.type ?? (initialTask?.isRecurring ? 'daily' : 'never'));
    setRecurringConfig({
      interval: pattern?.interval ?? 1,
      daysOfWeek: pattern?.daysOfWeek ?? [],
      endDate: pattern?.endDate ?? '',
    });
    setShowRecurringConfig(pattern?.type === 'custom');
  }, [initialTask, initialDate]);

  const { t, i18n } = useTranslation(['calendar', 'common']);
  const dayLabels = i18n.language.startsWith('uk')
    ? ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const availableColors: ColorType[] = TASK_MARKER_COLORS as unknown as ColorType[];
  const isEditing = Boolean(initialTask);
  const isCreatingInPast = !isEditing && isPastDate(initialDate);

  // Owner monogram for events the current user does not own (shared / participant).
  const ownerName =
    initialTask && initialTask.accessRole !== 'owner' && initialTask.ownerInfo?.name
      ? initialTask.ownerInfo.name
      : null;

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
    // Start date field drives the event day; fall back to the originally passed date.
    const taskDate = startDate || initialTask?.date || initialDate;

    if (!taskDate) {
      console.error('Task date is missing! Cannot save task.');

      return;
    }

    const isRecurringNow = recurringType !== 'never';

    // Time validation. End must be after start; the start datetime cannot be in
    // the past — except today (any time allowed) and recurring events.
    const nextErrors: { startTime?: string; endTime?: string; endDate?: string } = {};
    const isToday = dayjs(taskDate).isSame(dayjs(), 'day');

    if (startTime && !isToday && !isRecurringNow) {
      const start = new Date(`${taskDate}T${startTime}`);
      if (start.getTime() < Date.now()) {
        nextErrors.startTime = t('error_past_start');
      }
    }

    if (startTime && endTime && endTime <= startTime) {
      nextErrors.endTime = t('error_end_after_start');
    }

    // End date must not precede the start date.
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = t('error_end_date_after_start');
    }

    if (nextErrors.startTime || nextErrors.endTime || nextErrors.endDate) {
      setTimeErrors(nextErrors);
      setShakeNonce((n) => n + 1);
      return;
    }
    setTimeErrors({});

    // Combine date + time into ISO strings; default to midnight when no time set.
    const startDateISO = `${taskDate}T${startTime || '00:00'}`;
    const endDateISO = `${endDate || taskDate}T${endTime || '00:00'}`;
    const taskToSave: TaskEvent & {
      isPrivate?: boolean;
      reminderTime?: string;
      metadata?: Record<string, unknown>;
      startDate?: string;
      endDate?: string;
    } = {
      id: taskId,
      // Preserve the shared-calendar context of the edited event: ownerId so the
      // sync diff routes it to PUT (not POST), accessRole/sharePermission so the
      // card stays editable after save, ownerInfo for the owner monogram. All
      // undefined for newly created events, leaving the create flow unchanged.
      ownerId: initialTask?.ownerId,
      accessRole: initialTask?.accessRole,
      sharePermission: initialTask?.sharePermission,
      ownerInfo: initialTask?.ownerInfo,
      targetCalendarOwnerId: targetCalendarOwnerId || undefined,
      title: title.trim(),
      description: description.trim(),
      date: taskDate,
      startDate: startDateISO,
      endDate: endDateISO,
      eventType: 'task',
      colors: selectedColors.length > 0 ? selectedColors : ['default'],
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      reminderTime: reminder !== 'none' ? reminder : undefined,
      isRecurring: isRecurringNow,
      // recurringPattern isn't a typed field — persist it via metadata (jsonb)
      metadata: isRecurringNow
        ? { recurringPattern: { type: recurringType, ...recurringConfig } }
        : undefined,
      isPrivate,
      completed: initialTask && 'completed' in initialTask ? initialTask.completed : false,
      priority: initialTask && 'priority' in initialTask ? initialTask.priority : 'medium',
      createdAt: initialTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(taskToSave);
  }, [
    title,
    description,
    isPrivate,
    selectedColors,
    startDate,
    endDate,
    startTime,
    endTime,
    reminder,
    recurringType,
    recurringConfig,
    initialTask,
    targetCalendarOwnerId,
    initialDate,
    onSave,
    isCreatingInPast,
    t,
  ]);

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

    const isRecurringNow = recurringType !== 'never';
    const copiedTask: TaskEvent & {
      isPrivate?: boolean;
      reminderTime?: string;
      metadata?: Record<string, unknown>;
    } = {
      id: generateUniqueId('task'),
      title: title.trim(),
      description: description.trim(),
      date: initialTask.date,
      eventType: 'task',
      colors: selectedColors.length > 0 ? selectedColors : ['default'],
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      reminderTime: reminder !== 'none' ? reminder : undefined,
      isRecurring: isRecurringNow,
      metadata: isRecurringNow
        ? { recurringPattern: { type: recurringType, ...recurringConfig } }
        : undefined,
      isPrivate,
      completed: initialTask && 'completed' in initialTask ? initialTask.completed : false,
      priority: initialTask && 'priority' in initialTask ? initialTask.priority : 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onDuplicate(copiedTask);
  }, [
    initialTask,
    onDuplicate,
    title,
    description,
    isPrivate,
    selectedColors,
    startTime,
    endTime,
    reminder,
    recurringType,
    recurringConfig,
  ]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FormKicker>{isEditing ? t('form_kicker_edit') : t('form_kicker_new')}</FormKicker>
            {ownerName && <OwnerAvatar name={ownerName} size="sm" />}
          </div>
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

        <TimeRow>
          <FieldGroup>
            <FieldLabel htmlFor="task-start-date">{t('date_start')}</FieldLabel>
            <TaskInput
              id="task-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="task-end-date">{t('date_end')}</FieldLabel>
            <TaskInput
              key={`end-date-${shakeNonce}`}
              id="task-end-date"
              type="date"
              value={endDate}
              invalid={Boolean(timeErrors.endDate)}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {timeErrors.endDate && <FieldError>{timeErrors.endDate}</FieldError>}
          </FieldGroup>
        </TimeRow>

        <TimeRow>
          <FieldGroup>
            <FieldLabel htmlFor="task-start-time">{t('start_time')}</FieldLabel>
            <TaskInput
              key={`start-${shakeNonce}`}
              id="task-start-time"
              type="time"
              value={startTime}
              invalid={Boolean(timeErrors.startTime)}
              onChange={(e) => setStartTime(e.target.value)}
            />
            {timeErrors.startTime && <FieldError>{timeErrors.startTime}</FieldError>}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="task-end-time">{t('end_time')}</FieldLabel>
            <TaskInput
              key={`end-${shakeNonce}`}
              id="task-end-time"
              type="time"
              value={endTime}
              invalid={Boolean(timeErrors.endTime)}
              onChange={(e) => setEndTime(e.target.value)}
            />
            {timeErrors.endTime && <FieldError>{timeErrors.endTime}</FieldError>}
          </FieldGroup>
        </TimeRow>

        <FieldGroup>
          <FieldLabel htmlFor="task-reminder">{t('reminder')}</FieldLabel>
          <FieldSelect
            id="task-reminder"
            value={reminder}
            onChange={(e) => setReminder(e.target.value as ReminderOption)}
          >
            <option value="none">{t('reminder_none')}</option>
            <option value="atTime">{t('reminder_at_time')}</option>
            <option value="5min">{t('reminder_5min')}</option>
            <option value="10min">{t('reminder_10min')}</option>
            <option value="15min">{t('reminder_15min')}</option>
            <option value="30min">{t('reminder_30min')}</option>
            <option value="1hour">{t('reminder_1hour')}</option>
            <option value="2hours">{t('reminder_2hours')}</option>
            <option value="1day">{t('reminder_1day')}</option>
            <option value="1week">{t('reminder_1week')}</option>
          </FieldSelect>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="task-recurring">{t('recurring_event')}</FieldLabel>
          <FieldSelect
            id="task-recurring"
            value={recurringType}
            onChange={(e) => {
              const val = e.target.value as RecurringType;
              setRecurringType(val);
              setShowRecurringConfig(val === 'custom');
            }}
          >
            <option value="never">{t('recurring_never')}</option>
            <option value="daily">{t('recurring_daily')}</option>
            <option value="weekly">{t('recurring_weekly')}</option>
            <option value="biweekly">{t('recurring_biweekly')}</option>
            <option value="monthly">{t('recurring_monthly')}</option>
            <option value="yearly">{t('recurring_yearly')}</option>
            <option value="custom">{t('recurring_custom')}</option>
          </FieldSelect>
        </FieldGroup>

        {showRecurringConfig && (
          <RecurringPanel>
            <RecurringRow>
              <span>{t('recurring_every')}</span>
              <SmallNumberInput
                type="number"
                min={1}
                max={99}
                value={recurringConfig.interval}
                onChange={(e) =>
                  setRecurringConfig((prev) => ({ ...prev, interval: Number(e.target.value) }))
                }
              />
              <span>{t('recurring_days')}</span>
            </RecurringRow>

            <DaysRow>
              {dayLabels.map((day, i) => (
                <DayButton
                  key={i}
                  type="button"
                  active={recurringConfig.daysOfWeek.includes(i)}
                  onClick={() =>
                    setRecurringConfig((prev) => ({
                      ...prev,
                      daysOfWeek: prev.daysOfWeek.includes(i)
                        ? prev.daysOfWeek.filter((d) => d !== i)
                        : [...prev.daysOfWeek, i],
                    }))
                  }
                >
                  {day}
                </DayButton>
              ))}
            </DaysRow>

            <FieldGroup>
              <FieldLabel htmlFor="task-recurring-end">{t('recurring_end_date')}</FieldLabel>
              <TaskInput
                id="task-recurring-end"
                type="date"
                value={recurringConfig.endDate}
                onChange={(e) =>
                  setRecurringConfig((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </FieldGroup>
          </RecurringPanel>
        )}

        <RecurringToggle htmlFor="task-private">
          <RecurringCheckbox
            id="task-private"
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <RecurringText>
            <RecurringTitle>{t('private_event')}</RecurringTitle>
            <RecurringHint>{t('private_event_hint')}</RecurringHint>
          </RecurringText>
        </RecurringToggle>

        {!isEditing && writableSharedCalendars && writableSharedCalendars.length > 0 && (
          <FieldGroup>
            <FieldLabel htmlFor="target-calendar-select">
              {t('form_label_calendar', { defaultValue: 'Календар' })}
            </FieldLabel>
            <FieldSelect
              id="target-calendar-select"
              value={targetCalendarOwnerId}
              onChange={(e) => setTargetCalendarOwnerId(e.target.value)}
            >
              <option value="">{t('form_calendar_own', { defaultValue: 'Мій календар' })}</option>
              {writableSharedCalendars.map((cal) => (
                <option key={cal.ownerId} value={cal.ownerId}>
                  {cal.ownerName}
                </option>
              ))}
            </FieldSelect>
          </FieldGroup>
        )}
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
        <TaskInputButton type="button" primary onClick={handleSaveClick} disabled={isSubmitting}>
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
