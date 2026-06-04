import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, CalendarDays, Send, X } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type {
  AIAction,
  AIAssistantProps,
  AIResponse,
  CalendarEvent,
  ChatMessage,
  ColorType,
  MeetingEvent,
} from '../../types/calendar.types';
import { convertToCalendarColor } from '../../types/calendar.types';
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
  const { t, i18n } = useTranslation('common');
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
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
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
            ? t('assistant_welcome_message')
            : t('assistant_unavailable_message'),
          timestamp: new Date().toISOString(),
          actions: isAIAvailable
            ? [
                {
                  type: 'analyze_schedule' as const,
                  label: t('assistant_action_analyze_schedule'),
                  data: { timeRange: 'week' },
                  confidence: 0.9,
                },
              ]
            : [],
        },
      ];
    });
  }, [isAIAvailable, t]);

  const toggleAssistant = useCallback(() => {
    setIsOpen((previous) => {
      const nextValue = !previous;
      if (nextValue) {
        ensureWelcomeMessage();
      }
      return nextValue;
    });
  }, [ensureWelcomeMessage]);

  // When the UI language changes, update the initial welcome message
  // so the greeting and quick action labels are translated immediately.
  useEffect(() => {
    setMessages((previousMessages) => {
      if (previousMessages.length === 0) return previousMessages;

      const first = previousMessages[0];
      if (first.role !== 'assistant') return previousMessages;

      const updatedFirst: typeof first = {
        ...first,
        content: isAIAvailable
          ? t('assistant_welcome_message')
          : t('assistant_unavailable_message'),
        actions: isAIAvailable
          ? [
              {
                type: 'analyze_schedule' as const,
                label: t('assistant_action_analyze_schedule'),
                data: { timeRange: 'week' },
                confidence: 0.9,
              },
            ]
          : [],
      };

      return [updatedFirst, ...previousMessages.slice(1)];
    });
  }, [i18n.language, t, isAIAvailable]);

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
            label: t('assistant_action_confirm_create'),
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
    [t]
  );

  const handleAnalyzeSchedule = useCallback(async () => {
    if (currentEvents.length === 0) {
      addMessage({
        role: 'assistant' as const,
        content: t('assistant_no_events_to_analyze'),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    addMessage({
      role: 'assistant' as const,
      content: t('assistant_analyzing_schedule'),
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
        content: t('assistant_analyze_error'),
        timestamp: new Date().toISOString(),
      });
    }
  }, [currentEvents, addMessage, t]);

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
              title: action.data.title || t('assistant_new_event_title'),
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
              content: t('assistant_event_created_named', { title: newEvent.title }),
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
              content: t('assistant_event_updated_named', { title: updatedEvent.title }),
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'delete_event':
          if (action.data && 'eventId' in action.data) {
            onEventDelete(action.data.eventId);
            addMessage({
              role: 'system' as const,
              content: t('assistant_event_deleted'),
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
      t,
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
            content: t('assistant_events_summary', { total: eventsCount, today: todayEvents }),
            timestamp: new Date().toISOString(),
            actions:
              eventsCount > 0
                ? [
                    {
                      type: 'analyze_schedule' as const,
                      label: t('assistant_action_analyze_schedule'),
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
            title: t('assistant_new_event_title'),
            description: t('assistant_quick_event_description'),
            eventType: 'task',
            colors: ['default'],
          };
          onEventCreate(quickEvent);
          addMessage({
            role: 'system' as const,
            content: t('assistant_quick_event_created'),
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
    [addMessage, currentEvents, handleAnalyzeSchedule, onEventCreate, t]
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
        content: t('assistant_thinking'),
        timestamp: new Date().toISOString(),
        isLoading: true,
      });

      const aiResponse = await aiService.chat(userMessage, currentEvents);
      const messageContent = aiResponse.message || t('assistant_default_ai_response');
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
            content: t('assistant_change_event_color_question'),
            timestamp: new Date().toISOString(),
            actions: ['default', 'red', 'yellow', 'green'].map((color) => ({
              type: 'update_event' as const,
              label: t('assistant_color_label', { color }),
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
          title: aiEventData.title || t('assistant_new_event_title'),
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
          content: aiColor
            ? t('assistant_event_created_in_calendar_with_color', {
                title: newEvent.title,
                color: calendarColor,
              })
            : t('assistant_event_created_in_calendar', { title: newEvent.title }),
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
            content: t('assistant_event_updated_named', { title: updatedEvent.title }),
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      setMessages((previousMessages) => previousMessages.filter((message) => !message.isLoading));
      addMessage({
        role: 'assistant' as const,
        content: t('assistant_chat_error'),
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
    t,
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
    const locale = i18n.language?.startsWith('uk') ? 'uk-UA' : 'en-US';
    return new Date(timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const quickActions = [
    {
      label: t('assistant_quick_my_events'),
      icon: CalendarDays,
      onClick: () => handleQuickAction('show_events'),
    },
    {
      label: t('assistant_quick_new_event'),
      icon: Send,
      onClick: () => handleQuickAction('create_quick_event'),
    },
    {
      label: t('assistant_quick_analyze_week'),
      icon: BarChart3,
      onClick: () => handleQuickAction('analyze_week'),
    },
  ] as const;

  const roleLabelMap: Record<'assistant' | 'user' | 'system', string> = {
    assistant: t('assistant_role_assistant'),
    user: t('assistant_role_user'),
    system: t('assistant_role_system'),
  };

  return (
    <>
      <AssistantFab onOpen={toggleAssistant} isActive={isOpen} className={className} />

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label={t('assistant_close_overlay')}
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
                    <p className={css.headerKicker}>{t('ai_assistant')}</p>
                    <h2 className={css.headerTitle}>{t('assistant_smart_planner')}</h2>
                    <p className={css.headerSubtitle}>
                      {isServiceAvailable && isAIAvailable
                        ? t('assistant_subtitle_ready')
                        : t('assistant_subtitle_unavailable')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={css.closeButton}
                  aria-label={t('assistant_close')}
                >
                  <X className={css.closeIcon} />
                </button>
              </header>

              <div className={css.body}>
                <div className={css.heroCard}>
                  <p className={css.heroTitle}>{t('assistant_hero_title')}</p>
                  <p className={css.heroText}>{t('assistant_hero_text')}</p>
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
                            <span>{roleLabelMap[message.role]}</span>
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
                        ? t('assistant_input_placeholder')
                        : t('assistant_input_placeholder_unavailable')
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
