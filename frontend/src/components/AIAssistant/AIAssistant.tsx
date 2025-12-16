import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AIAssistant.module.css';
import type {
  CalendarEvent,
  AIAction,
  ChatMessage,
  AIAssistantProps,
  MeetingEvent,
  ColorType,
} from '../../types/types';
import { convertToCalendarColor } from '../../types/types';
import { aiService } from '../../services/aiService';
import { generateUniqueId } from '../../utils/idGenerator';
import clsx from 'clsx';

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentEvents,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  className,
  isServiceAvailable = true,
}) => {
  // check AI service for available
  if (!isServiceAvailable) {
    return (
      <div className={clsx('ai-assistant', 'ai-assistant-disabled', className)}>
        <div className="ai-assistant-disabled-message">
          <span>🤖</span>
          <p>AI асистент тимчасово недоступний</p>
        </div>
      </div>
    );
  }

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check AI service availability on component mount
  useEffect(() => {
    const checkAIAvailability = async () => {
      // Skip if we recently checked or service is marked as unavailable
      if (!isAIAvailable) return;

      try {
        const health = await aiService.healthCheck();
        setIsAIAvailable(health.status === 'ok' || health.status === 'available');
        // If service is overloaded, schedule next check in 30 seconds
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
    // Debounce health check - only run once when component mounts
    const timer = setTimeout(() => {
      checkAIAvailability();
    }, 1000);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run on mount

  // Auto-scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const toggleChat = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    if (newIsOpen && messages.length === 0) {
      // Add welcome message when opening for the first time
      setMessages([
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
                  label: '📊 Аналіз розкладу',
                  data: { timeRange: 'week' },
                  confidence: 0.9,
                },
              ]
            : [],
        },
      ]);
    }
  }, [isOpen, messages.length, isAIAvailable]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateUniqueId('msg'),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

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
      content: '🔍 Аналізую ваш розклад...',
      timestamp: new Date().toISOString(),
      isLoading: true,
    });

    try {
      const analysis = await aiService.analyzeSchedule(currentEvents, 'week');
      const analysisText = String(analysis);

      addMessage({
        role: 'assistant' as const,
        content: analysisText,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      addMessage({
        role: 'assistant' as const,
        content: '❌ Не вдалося проаналізувати розклад. Будь ласка, спробуйте пізніше.',
        timestamp: new Date().toISOString(),
      });
    }
  }, [currentEvents, addMessage]);

  // Helper function to generate actions from AI response
  const generateActionsFromAI = (action: string | undefined, eventData: any): AIAction[] => {
    if (!action || action === 'query' || action === 'analyze') {
      return [];
    }

    const actions: AIAction[] = [];

    if (action === 'create' && eventData) {
      // Convert AI color to calendar color
      const calendarColor = convertToCalendarColor(eventData.color);

      actions.push({
        type: 'create_event' as const,
        label: '✅ Підтвердити створення',
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
      });
    }

    return actions;
  };

  const handleAction = useCallback(
    (action: AIAction) => {
      switch (action.type) {
        case 'create_event':
          if (action.data && 'title' in action.data) {
            const newEvent = {
              id: generateUniqueId('event'),
              date: action.data.date || new Date().toISOString().split('T')[0],
              title: action.data.title || 'Нова подія',
              description: action.data.description,
              startTime: action.data.startTime,
              endTime: action.data.endTime,
              location: action.data.location,
              eventType: (action.data.eventType || 'meeting') as
                | 'task'
                | 'holiday'
                | 'meeting'
                | 'reminder',
            } as CalendarEvent;

            onEventCreate(newEvent);
            addMessage({
              role: 'system' as const,
              content: `✅ Подію "${newEvent.title}" створено`,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'update_event':
          if (action.data && 'id' in action.data) {
            const updatedEvent = {
              ...action.data,
              id: action.data.id,
            } as CalendarEvent;
            onEventUpdate(updatedEvent);
            addMessage({
              role: 'system' as const,
              content: `✅ Подію "${updatedEvent.title}" оновлено`,
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'delete_event':
          if (action.data && 'eventId' in action.data) {
            onEventDelete(action.data.eventId);
            addMessage({
              role: 'system' as const,
              content: '✅ Подію видалено',
              timestamp: new Date().toISOString(),
            });
          }
          break;
        case 'analyze_schedule':
          handleAnalyzeSchedule();
          break;

        default:
          console.warn('Unknown action type:', action.type);
      }
    },
    [onEventCreate, onEventDelete, onEventUpdate, addMessage, handleAnalyzeSchedule]
  );

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !isAIAvailable) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    addMessage({
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    try {
      // Add loading message
      addMessage({
        role: 'assistant' as const,
        content: '🤔 Думаю...',
        timestamp: new Date().toISOString(),
        isLoading: true,
      });

      // Send to AI service
      const aiResponse = await aiService.chat(userMessage, currentEvents);

      console.log('🔍 AI Response:', aiResponse);

      // Extract AI response data
      const messageContent = aiResponse.message || 'Відповідь AI';
      const aiAction = aiResponse.action;
      const aiEventData = aiResponse.event;

      console.log('🔍 AI action:', aiAction);
      console.log('🔍 AI event data:', aiEventData);

      // Remove loading message and add AI response
      setMessages((prev) => {
        const filteredMessages = prev.filter((msg) => !msg.isLoading);

        const newMessage: ChatMessage = {
          id: generateUniqueId('msg'),
          role: 'assistant' as const,
          content: messageContent,
          timestamp: new Date().toISOString(),
          actions: generateActionsFromAI(aiAction, aiEventData),
        };

        // if AI create event add ColorSelector
        if (aiAction === 'create' && aiEventData) {
          // add compoonent for color selection
          const colorMessage: ChatMessage = {
            id: generateUniqueId('msg'),
            role: 'assistant' as const,
            content: '🎨 Чи бажаєте змінити колір події?',
            timestamp: new Date().toISOString(),
            // buttons for set color as actions
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

      // Handle AI actions (create/update/delete events)
      if (aiAction === 'create' && aiEventData && onEventCreate) {
        // Convert AI color to calendar color
        const aiColor = (aiEventData as any).color;
        const calendarColor = convertToCalendarColor(aiColor);

        // Create event from AI data
        const newEvent: CalendarEvent = {
          id: generateUniqueId('event'),
          date: aiEventData.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          title: aiEventData.title || 'Нова подія',
          description: aiEventData.description || '',
          startTime: aiEventData.startTime || '09:00',
          endTime: aiEventData.endTime || '10:00',
          location: aiEventData.location || '',
          eventType: 'meeting',
          colors: [calendarColor],
        } as MeetingEvent;

        // Create the event
        onEventCreate(newEvent);
        console.log('✅ Event created from AI:', newEvent);

        // Add confirmation message with color info
        const colorMessage = aiEventData.color ? ` з кольором ${calendarColor}` : '';

        addMessage({
          role: 'system' as const,
          content: `✅ Подію "${newEvent.title}"${colorMessage} створено у календарі`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      // Remove loading message and add error
      setMessages((prev) => {
        const filteredMessages = prev.filter((msg) => !msg.isLoading);

        const errorMessage: ChatMessage = {
          id: generateUniqueId('msg'),
          role: 'assistant' as const,
          content: '❌ Вибачте, сталася помилка. Будь ласка, спробуйте ще раз.',
          timestamp: new Date().toISOString(),
        };

        return [...filteredMessages, errorMessage];
      });

      console.error('AI chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isAIAvailable, currentEvents, addMessage, onEventCreate]);

  // handler Quick Actions
  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'show_events':
          const eventsCount = currentEvents.length;
          const todayEvents = currentEvents.filter(
            (event) => event.date === new Date().toISOString().split('T')[0]
          ).length;

          addMessage({
            role: 'assistant' as const,
            content: `📅 У вас ${eventsCount} подій у календарі, ${todayEvents} на сьогодні.`,
            timestamp: new Date().toISOString(),
            actions:
              eventsCount > 0
                ? [
                    {
                      type: 'analyze_schedule' as const,
                      label: '📊 Проаналізувати розклад',
                      data: { timeRange: 'week' },
                      confidence: 0.9,
                    },
                  ]
                : [],
          });
          break;
        case 'create_quick_event':
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
            content: '✅ Швидку подію створено! Ви можете відредагувати її в календарі.',
            timestamp: new Date().toISOString(),
          });
          break;

        default:
          break;
      }
    },
    [currentEvents, onEventCreate, addMessage]
  );

  // handler for Enter key down in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`${styles.assistantContainer} ${className}`}>
      {/* AI Assistant Button call */}
      <button
        className={`${styles.assistantButton} ${isOpen ? styles.active : ''} ${
          !isAIAvailable ? styles.offline : ''
        }`}
        onClick={toggleChat}
        aria-label="Open AI Assistant"
        data-badge={currentEvents.length > 0 ? currentEvents.length : undefined}
      >
        <span className={styles.botIcon}>{isAIAvailable ? '🤖' : '⚠️'}</span>
        AI
        {!isAIAvailable && (
          <span className={styles.offlineIndicator} title="AI service offline"></span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <h3>AI Assistant</h3>
              <span
                className={`${styles.status} ${isAIAvailable ? styles.online : styles.offline}`}
              >
                {isAIAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
            <button onClick={toggleChat} className={styles.closeButton} aria-label="Close chat">
              ✕
            </button>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActionsContainer}>
            <button
              onClick={() => handleQuickAction('show_events')}
              className={styles.quickActionButton}
            >
              📅 Мої події
            </button>
            <button
              onClick={() => handleQuickAction('create_quick_event')}
              className={styles.quickActionButton}
            >
              ➕ Створити подію
            </button>
          </div>

          {/* Messages Area */}
          <div className={styles.messagesContainer}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.role === 'user'
                    ? styles.userMessage
                    : message.role === 'system'
                      ? styles.systemMessage
                      : styles.assistantMessage
                } ${message.isLoading ? styles.loading : ''}`}
              >
                {message.isLoading ? (
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <>
                    <div className={styles.messageContent}>
                      {message.content.split('\n').map((line, index) => (
                        <p key={`${message.id}-line-${index}`}>{line}</p>
                      ))}
                    </div>
                    <div className={styles.messageMeta}>
                      <span className={styles.timestamp}>{formatTime(message.timestamp!)}</span>
                    </div>

                    {/* Action Buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className={styles.messageActions}>
                        {message.actions.map((action, index) => (
                          <button
                            key={`${message.id}-action-${index}`}
                            onClick={() => handleAction(action)}
                            className={`${styles.actionButton} ${
                              action.confidence && action.confidence > 0.8
                                ? styles.highConfidence
                                : ''
                            }`}
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

          {/* Input Area */}
          <div className={styles.inputContainer}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAIAvailable
                  ? 'Запитайте про події, розклад...'
                  : 'AI недоступний. Використовуйте швидкі дії.'
              }
              disabled={isLoading}
              className={styles.chatInput}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={styles.sendButton}
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
