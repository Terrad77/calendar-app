import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, CalendarDays, Send, X } from 'lucide-react';
import clsx from 'clsx';
import type {
  AIAction,
  AIAssistantProps,
  AIResponse,
  CalendarEvent,
  ChatMessage,
  ColorType,
  MeetingEvent,
} from '../../types/types';
import { convertToCalendarColor } from '../../types/types';
import { aiService } from '../../services/aiService';
import { generateUniqueId } from '../../utils/idGenerator';
import Logo from '../Logo/Logo';
import { AssistantFab } from './AssistantFab';
import css from './AIAssistant.module.css';

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
    setIsOpen((previous) => {
      const nextValue = !previous;
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
    (action: string | undefined, eventData?: AIResponse['event']): AIAction[] => {
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
    } catch (_e) {
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
        case 'create_event': {
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
        }
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
    [
      addMessage,
      handleAnalyzeSchedule,
      onEventCreate,
      onEventDelete,
      onEventUpdate,
      currentEvents,
      lastCreatedEventId,
      setLastCreatedEventId,
    ]
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
      icon: Send,
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
      <AssistantFab onOpen={toggleAssistant} isActive={isOpen} className={className} />

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close AI assistant overlay"
              className={css.overlay}
              onClick={() => setIsOpen(false)}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            />

            <motion.aside
              className={css.drawer}
              style={{
                borderTopLeftRadius: isDesktop ? undefined : '1rem',
                borderTopRightRadius: isDesktop ? undefined : '1rem',
              }}
              variants={drawerVariants}
              initial={isDesktop ? 'hidden_desktop' : 'hidden_mobile'}
              animate={isDesktop ? 'visible_desktop' : 'visible_mobile'}
              exit={isDesktop ? 'exit_desktop' : 'exit_mobile'}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <header className={css.header}>
                <div className={css.headerBrand}>
                  <div className={css.headerLogo}>
                    <Logo />
                  </div>
                  <div className={css.headerText}>
                    <p className={css.headerKicker}>AI Assistant</p>
                    <h2 className={css.headerTitle}>Smart planner</h2>
                    <p className={css.headerSubtitle}>
                      {isServiceAvailable && isAIAvailable
                        ? 'Minimal, fast, and event-aware'
                        : 'AI currently unavailable, but the panel is still accessible'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={css.closeButton}
                  aria-label="Close assistant"
                >
                  <X className={css.closeIcon} />
                </button>
              </header>

              <div className={css.body}>
                <div className={css.heroCard}>
                  <p className={css.heroTitle}>Вітаю</p>
                  <p className={css.heroText}>
                    Я можу проаналізувати розклад, створити подію або допомогти з календарем.
                  </p>
                </div>

                <div className={css.quickActions}>
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        className={css.quickActionButton}
                      >
                        <ActionIcon className={css.quickActionIcon} />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={css.messages}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={clsx(
                        css.message,
                        message.role === 'user'
                          ? css.messageUser
                          : message.role === 'system'
                            ? css.messageSystem
                            : css.messageAssistant,
                        message.isLoading && css.messageLoading
                      )}
                    >
                      {message.isLoading ? (
                        <div className={css.loadingDots}>
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : (
                        <>
                          <div className={css.messageText}>
                            {message.content.split('\n').map((line, index) => (
                              <p key={`${message.id}-line-${index}`}>{line}</p>
                            ))}
                          </div>
                          <div className={css.messageMeta}>
                            <span>{message.role}</span>
                            <span>{formatTime(message.timestamp ?? new Date().toISOString())}</span>
                          </div>

                          {message.actions && message.actions.length > 0 && (
                            <div className={css.messageActions}>
                              {message.actions.map((action, index) => (
                                <button
                                  key={`${message.id}-action-${index}`}
                                  type="button"
                                  onClick={() => handleAction(action)}
                                  className={css.messageActionButton}
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

              <footer className={css.footer}>
                <form onSubmit={handleSubmit} className={css.inputForm}>
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
                    className={css.inputField}
                  />
                  <button
                    type="submit"
                    disabled={
                      !inputValue.trim() || isLoading || !(isServiceAvailable && isAIAvailable)
                    }
                    className={css.sendButton}
                  >
                    <Send className={css.sendIcon} />
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
