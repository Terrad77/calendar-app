import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, CalendarDays, Sparkles, Send, X } from 'lucide-react';
import clsx from 'clsx';
import type {
  AIAction,
  AIAssistantProps,
  CalendarEvent,
  ChatMessage,
  ColorType,
  MeetingEvent,
} from '../../types/types';
import { convertToCalendarColor } from '../../types/types';
import { aiService } from '../../services/aiService';
import { generateUniqueId } from '../../utils/idGenerator';
import { AssistantFab } from './AssistantFab';

interface AIAssistantDrawerProps extends AIAssistantProps {
  className?: string;
}

const drawerVariants = {
  // Mobile: slide from bottom
  hidden_mobile: { y: '100%', opacity: 0 },
  visible_mobile: { y: 0, opacity: 1 },
  exit_mobile: { y: '100%', opacity: 0 },
  // Tablet/Desktop: slide from right
  hidden_desktop: { x: '100%', opacity: 0 },
  visible_desktop: { x: 0, opacity: 1 },
  exit_desktop: { x: '100%', opacity: 0 },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const AIAssistantDrawer = ({
  currentEvents,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  className,
  isServiceAvailable = true,
}: AIAssistantDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(true);
  const [lastCreatedEventId, setLastCreatedEventId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 640 : false;

  useEffect(() => {
    const checkAIAvailability = async () => {
      if (!isAIAvailable) return;

      try {
        const health = await aiService.healthCheck();
        setIsAIAvailable(health.status === 'ok' || health.status === 'available');
        if (health.status === 'overloaded') {
          setTimeout(() => {
            checkAIAvailability();
          }, 30000);
        }
      } catch (error) {
        console.error('AI service not available:', error);
        setIsAIAvailable(false);
      }
    };

    const timer = setTimeout(() => {
      checkAIAvailability();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAIAvailable]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const ensureWelcomeMessage = useCallback(() => {
    setMessages((previousMessages) => {
      if (previousMessages.length > 0) {
        return previousMessages;
      }

      return [
        {
          id: generateUniqueId('msg'),
          role: 'assistant' as const,
          content: isAIAvailable
            ? 'Вітаю! Я ваш AI-помічник для керування календарем. Чим можу допомогти?'
            : 'AI сервіс тимчасово недоступний. Ви можете використовувати швидкі дії для керування подіями.',
          timestamp: new Date().toISOString(),
          actions: isAIAvailable
            ? [
                {
                  type: 'analyze_schedule' as const,
                  label: 'Проаналізувати розклад',
                  data: { timeRange: 'week' },
                  confidence: 0.9,
                },
              ]
            : [],
        },
      ];
    });
  }, [isAIAvailable]);

  const toggleAssistant = useCallback(() => {
    console.log('toggleAssistant invoked');
    setIsOpen((previous) => {
      const nextValue = !previous;
      console.log('toggleAssistant next state', nextValue);
      if (nextValue) {
        ensureWelcomeMessage();
      }
      return nextValue;
    });
  }, [ensureWelcomeMessage]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateUniqueId('msg'),
    };
    setMessages((previousMessages) => [...previousMessages, newMessage]);
  }, []);

  const generateActionsFromAI = useCallback(
    (action: string | undefined, eventData: any): AIAction[] => {
      if (!action || action === 'query' || action === 'analyze') {
        return [];
      }

      if (action === 'create' && eventData) {
        const calendarColor = convertToCalendarColor(eventData.color);

        return [
          {
            type: 'create_event' as const,
            label: 'Підтвердити створення',
            data: {
              title: eventData.title,
              date: eventData.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
              description: eventData.description,
              startTime: eventData.startTime,
              endTime: eventData.endTime,
              location: eventData.location,
              eventType: 'meeting' as const,
              colors: [calendarColor],
            },
            confidence: 0.9,
          },
        ];
      }

      return [];
    },
    []
  );

  const handleAnalyzeSchedule = useCallback(async () => {
    if (currentEvents.length === 0) {
      addMessage({
        role: 'assistant' as const,
        content: 'У вашому календарі поки що немає подій для аналізу.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    addMessage({
      role: 'assistant' as const,
      content: 'Аналізую ваш розклад...',
      timestamp: new Date().toISOString(),
      isLoading: true,
    });

    try {
      const analysis = await aiService.analyzeSchedule(currentEvents, 'week');
      addMessage({
        role: 'assistant' as const,
        content: String(analysis),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      addMessage({
        role: 'assistant' as const,
        content: 'Не вдалося проаналізувати розклад. Будь ласка, спробуйте пізніше.',
        timestamp: new Date().toISOString(),
      });
    }
  }, [currentEvents, addMessage]);

  const handleAction = useCallback(
    (action: AIAction) => {
      switch (action.type) {
        case 'create_event':
          if (action.data && 'title' in action.data) {
            const actionData = action.data as { color?: string; colors?: ColorType[] };
            const calendarColor = convertToCalendarColor(actionData.color);
            const newEvent = {
              id: generateUniqueId('event'),
              date: action.data.date || new Date().toISOString().split('T')[0],
              title: action.data.title || 'Нова подія',
              description: action.data.description,
              startTime: action.data.startTime,
              endTime: action.data.endTime,
              location: action.data.location,
              eventType: (action.data.eventType || 'meeting') as CalendarEvent['eventType'],
              colors: actionData.colors?.length ? actionData.colors : [calendarColor],
            } as CalendarEvent;

            onEventCreate(newEvent);
            setLastCreatedEventId(newEvent.id);
            addMessage({
              role: 'system' as const,
              content: `Подію "${newEvent.title}" створено`,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'update_event':
          if (action.data) {
            const actionData = action.data as {
              id?: string;
              eventId?: string;
              title?: string;
              description?: string;
              startTime?: string;
              endTime?: string;
              location?: string;
              color?: string;
              colors?: ColorType[];
            };

            const targetEventId = actionData.id || actionData.eventId || lastCreatedEventId;
            const targetEvent = targetEventId
              ? currentEvents.find((event) => event.id === targetEventId)
              : currentEvents.find((event) => event.title === actionData.title);

            if (!targetEvent) {
              break;
            }

            const updatedEvent: CalendarEvent = {
              ...targetEvent,
              title: actionData.title || targetEvent.title,
              description: actionData.description ?? targetEvent.description,
              startTime: actionData.startTime || targetEvent.startTime,
              endTime: actionData.endTime || targetEvent.endTime,
              location: actionData.location ?? targetEvent.location,
              colors: actionData.colors?.length
                ? actionData.colors
                : actionData.color
                  ? [convertToCalendarColor(actionData.color)]
                  : targetEvent.colors,
            } as CalendarEvent;

            onEventUpdate(updatedEvent);
            setLastCreatedEventId(updatedEvent.id);
            addMessage({
              role: 'system' as const,
              content: `Подію "${updatedEvent.title}" оновлено`,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'delete_event':
          if (action.data && 'eventId' in action.data) {
            onEventDelete(action.data.eventId);
            addMessage({
              role: 'system' as const,
              content: 'Подію видалено',
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'analyze_schedule':
          void handleAnalyzeSchedule();
          break;
        default:
          console.warn('Unknown action type:', action.type);
      }
    },
    [addMessage, handleAnalyzeSchedule, onEventCreate, onEventDelete, onEventUpdate]
  );

  const handleQuickAction = useCallback(
    (action: 'show_events' | 'create_quick_event' | 'analyze_week') => {
      switch (action) {
        case 'show_events': {
          const eventsCount = currentEvents.length;
          const today = new Date().toISOString().split('T')[0];
          const todayEvents = currentEvents.filter((event) => event.date === today).length;

          addMessage({
            role: 'assistant' as const,
            content: `У вас ${eventsCount} подій у календарі, ${todayEvents} на сьогодні.`,
            timestamp: new Date().toISOString(),
            actions:
              eventsCount > 0
                ? [
                    {
                      type: 'analyze_schedule' as const,
                      label: 'Проаналізувати розклад',
                      data: { timeRange: 'week' },
                      confidence: 0.9,
                    },
                  ]
                : [],
          });
          break;
        }
        case 'create_quick_event': {
          const quickEvent: CalendarEvent = {
            id: generateUniqueId('event'),
            date: new Date().toISOString().split('T')[0],
            title: 'Нова подія',
            description: 'Швидко створена подія',
            eventType: 'task',
            colors: ['default'],
          };
          onEventCreate(quickEvent);
          addMessage({
            role: 'system' as const,
            content: 'Швидку подію створено. Ви можете відредагувати її в календарі.',
            timestamp: new Date().toISOString(),
          });
          break;
        }
        case 'analyze_week':
          void handleAnalyzeSchedule();
          break;
        default:
          break;
      }
    },
    [addMessage, currentEvents, handleAnalyzeSchedule, onEventCreate]
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !isAIAvailable) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    addMessage({
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    try {
      addMessage({
        role: 'assistant' as const,
        content: 'Думаю...',
        timestamp: new Date().toISOString(),
        isLoading: true,
      });

      const aiResponse = await aiService.chat(userMessage, currentEvents);
      const messageContent = aiResponse.message || 'Відповідь AI';
      const aiAction = aiResponse.action;
      const aiEventData = aiResponse.event;

      setMessages((previousMessages) => {
        const filteredMessages = previousMessages.filter((message) => !message.isLoading);

        const newMessage: ChatMessage = {
          id: generateUniqueId('msg'),
          role: 'assistant' as const,
          content: messageContent,
          timestamp: new Date().toISOString(),
          actions: generateActionsFromAI(aiAction, aiEventData),
        };

        if (aiAction === 'create' && aiEventData) {
          const colorMessage: ChatMessage = {
            id: generateUniqueId('msg'),
            role: 'assistant' as const,
            content: 'Чи бажаєте змінити колір події?',
            timestamp: new Date().toISOString(),
            actions: ['default', 'red', 'yellow', 'green'].map((color) => ({
              type: 'update_event' as const,
              label: `Колір: ${color}`,
              data: {
                colors: [color as ColorType],
              },
              confidence: 0.8,
            })),
          };

          return [...filteredMessages, newMessage, colorMessage];
        }

        return [...filteredMessages, newMessage];
      });

      if (aiAction === 'create' && aiEventData) {
        const aiColor = (aiEventData as { color?: string }).color;
        const calendarColor = convertToCalendarColor(aiColor);

        const newEvent: MeetingEvent = {
          id: generateUniqueId('event'),
          date: aiEventData.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          title: aiEventData.title || 'Нова подія',
          description: aiEventData.description || '',
          startTime: aiEventData.startTime || '09:00',
          endTime: aiEventData.endTime || '10:00',
          location: aiEventData.location || '',
          eventType: 'meeting',
          colors: [calendarColor],
        };

        onEventCreate(newEvent);
        setLastCreatedEventId(newEvent.id);

        addMessage({
          role: 'system' as const,
          content: `Подію "${newEvent.title}"${aiColor ? ` з кольором ${calendarColor}` : ''} створено у календарі`,
          timestamp: new Date().toISOString(),
        });
      } else if (aiAction === 'update' && aiEventData) {
        const targetEvent =
          (lastCreatedEventId && currentEvents.find((event) => event.id === lastCreatedEventId)) ||
          currentEvents.find(
            (event) =>
              event.title === aiEventData.title &&
              event.date === aiEventData.startDate?.split('T')[0]
          );

        if (targetEvent) {
          const updatedEvent: CalendarEvent = {
            ...targetEvent,
            title: aiEventData.title || targetEvent.title,
            description: aiEventData.description ?? targetEvent.description,
            startTime: aiEventData.startTime || targetEvent.startTime,
            endTime: aiEventData.endTime || targetEvent.endTime,
            location: aiEventData.location ?? targetEvent.location,
            colors: aiEventData.color
              ? [convertToCalendarColor(aiEventData.color)]
              : targetEvent.colors,
          } as CalendarEvent;

          onEventUpdate(updatedEvent);
          addMessage({
            role: 'system' as const,
            content: `Подію "${updatedEvent.title}" оновлено`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      setMessages((previousMessages) => previousMessages.filter((message) => !message.isLoading));
      addMessage({
        role: 'assistant' as const,
        content: 'Вибачте, сталася помилка. Будь ласка, спробуйте ще раз.',
        timestamp: new Date().toISOString(),
      });
      console.error('AI chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    addMessage,
    currentEvents,
    generateActionsFromAI,
    inputValue,
    isAIAvailable,
    isLoading,
    onEventCreate,
    onEventUpdate,
    lastCreatedEventId,
  ]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSendMessage();
    },
    [handleSendMessage]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const quickActions = [
    {
      label: 'Мої події',
      icon: CalendarDays,
      onClick: () => handleQuickAction('show_events'),
    },
    {
      label: 'Нова подія',
      icon: Sparkles,
      onClick: () => handleQuickAction('create_quick_event'),
    },
    {
      label: 'Аналіз тижня',
      icon: BarChart3,
      onClick: () => handleQuickAction('analyze_week'),
    },
  ] as const;

  return (
    <>
      <AssistantFab
        onOpen={toggleAssistant}
        isActive={isOpen}
        badgeCount={currentEvents.length}
        className={className}
      />

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close AI assistant overlay"
              className="fixed inset-0 z-[1100] cursor-default bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            />

            <motion.aside
              className="fixed z-[1110] flex w-full max-w-[400px] flex-col border-l border-neutral-200 bg-white text-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:w-[400px]"
              style={{
                top: 0,
                right: 0,
                bottom: 0,
                left: 'auto',
                height: '100%',
                borderTopLeftRadius: isDesktop ? undefined : '1rem',
                borderTopRightRadius: isDesktop ? undefined : '1rem',
              }}
              variants={drawerVariants}
              initial={isDesktop ? 'hidden_desktop' : 'hidden_mobile'}
              animate={isDesktop ? 'visible_desktop' : 'visible_mobile'}
              exit={isDesktop ? 'exit_desktop' : 'exit_mobile'}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">
                      AI Assistant
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-neutral-950">Smart planner</h2>
                    <p className="text-sm text-neutral-500">
                      {isServiceAvailable && isAIAvailable
                        ? 'Minimal, fast, and event-aware'
                        : 'AI currently unavailable, but the panel is still accessible'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                  aria-label="Close assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-950">Вітаю</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    Я можу проаналізувати розклад, створити подію або допомогти з календарем.
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
                      >
                        <ActionIcon className="h-4 w-4 text-neutral-500" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={clsx(
                        'rounded-2xl border px-4 py-3',
                        message.role === 'user'
                          ? 'ml-auto max-w-[88%] border-neutral-900 bg-neutral-900 text-white'
                          : message.role === 'system'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                            : 'border-neutral-200 bg-white text-neutral-900',
                        message.isLoading && 'opacity-75'
                      )}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2 py-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:120ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:240ms]" />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1 text-sm leading-6">
                            {message.content.split('\n').map((line, index) => (
                              <p key={`${message.id}-line-${index}`}>{line}</p>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                            <span>{message.role}</span>
                            <span>{formatTime(message.timestamp ?? new Date().toISOString())}</span>
                          </div>

                          {message.actions && message.actions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.actions.map((action, index) => (
                                <button
                                  key={`${message.id}-action-${index}`}
                                  type="button"
                                  onClick={() => handleAction(action)}
                                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-white hover:text-neutral-950"
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <footer className="border-t border-neutral-200 bg-neutral-50 p-4">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isServiceAvailable && isAIAvailable
                        ? 'Запитайте про події, розклад...'
                        : 'AI недоступний. Використовуйте швидкі дії.'
                    }
                    disabled={isLoading || !(isServiceAvailable && isAIAvailable)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={
                      !inputValue.trim() || isLoading || !(isServiceAvailable && isAIAvailable)
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
