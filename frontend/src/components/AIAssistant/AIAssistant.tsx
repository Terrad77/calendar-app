import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AIAssistant.module.css';
import type {
  CalendarEvent,
  // ConversationMessage,
  // AIResponse,
  AIAction,
  ChatMessage,
  AIAssistantProps,
} from '../../types/types';
import { aiService } from '../../services/aiService';

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentEvents,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  className = '',
}) => {
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
      try {
        const health = await aiService.healthCheck();
        setIsAIAvailable(health.status === 'ok');
      } catch (error) {
        console.error('AI service not available:', error);
        setIsAIAvailable(false);
      }
    };

    checkAIAvailability();
  }, []);

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
          id: '1',
          role: 'assistant',
          content: isAIAvailable
            ? 'Вітаю! Я ваш AI-помічник для керування календарем. Чим можу допомогти?'
            : 'AI сервіс тимчасово недоступний. Ви можете використовувати швидкі дії для керування подіями.',
          timestamp: new Date().toISOString(),
          actions: isAIAvailable
            ? [
                {
                  type: 'analyze_schedule',
                  label: '📊 Аналіз розкладу',
                  data: { timeRange: 'week' },
                  confidence: 0.9,
                },
                // Убрали suggest_events, так как метода нет
              ]
            : [],
        },
      ]);
    }
  }, [isOpen, messages.length, isAIAvailable]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const handleAnalyzeSchedule = useCallback(async () => {
    if (currentEvents.length === 0) {
      addMessage({
        role: 'assistant',
        content: 'У вашому календарі поки що немає подій для аналізу.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    addMessage({
      role: 'assistant',
      content: '🔍 Аналізую ваш розклад...',
      timestamp: new Date().toISOString(),
      isLoading: true,
    });

    try {
      const analysis = await aiService.analyzeSchedule(currentEvents, 'week');

      const analysisText = String(analysis);

      addMessage({
        role: 'assistant',
        content: analysisText,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: '❌ Не вдалося проаналізувати розклад. Будь ласка, спробуйте пізніше.',
        timestamp: new Date().toISOString(),
      });
    }
  }, [currentEvents, addMessage]);

  const handleAction = useCallback(
    (action: AIAction) => {
      switch (action.type) {
        case 'create_event':
          if (action.data && 'title' in action.data) {
            const newEvent = {
              id: `event-${Date.now()}`,
              date: action.data.date || new Date().toISOString().split('T')[0],
              title: action.data.title || 'Нова подія',
              description: action.data.description,
              eventType: (action.data.eventType || 'task') as
                | 'task'
                | 'holiday'
                | 'meeting'
                | 'reminder',
            } as CalendarEvent;

            onEventCreate(newEvent);
            addMessage({
              role: 'system',
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
              role: 'system',
              content: `✅ Подію "${updatedEvent.title}" оновлено`,
              timestamp: new Date().toISOString(),
            });
          }
          break;

        case 'delete_event':
          if (action.data && 'eventId' in action.data) {
            onEventDelete(action.data.eventId);
            addMessage({
              role: 'system',
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
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    try {
      // Add loading message
      addMessage({
        role: 'assistant',
        content: '🤔 Думаю...',
        timestamp: new Date().toISOString(),
        isLoading: true,
      });

      // Send to AI service
      const response = await aiService.chat(userMessage, currentEvents);

      // Remove loading message and add AI response
      setMessages((prev) =>
        prev
          .filter((msg) => !msg.isLoading)
          .concat({
            id: Date.now().toString(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
            actions: response.actions,
          })
      );
    } catch (error: any) {
      // Remove loading message and add error
      setMessages((prev) =>
        prev
          .filter((msg) => !msg.isLoading)
          .concat({
            id: Date.now().toString(),
            role: 'assistant',
            content: '❌ Вибачте, сталася помилка. Будь ласка, спробуйте ще раз.',
            timestamp: new Date().toISOString(),
          })
      );
      console.error('AI chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isAIAvailable, currentEvents, addMessage]);

  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'show_events':
          const eventsCount = currentEvents.length;
          const todayEvents = currentEvents.filter(
            (event) => event.date === new Date().toISOString().split('T')[0]
          ).length;

          addMessage({
            role: 'assistant',
            content: `📅 У вас ${eventsCount} подій у календарі, ${todayEvents} на сьогодні.`,
            timestamp: new Date().toISOString(),
            actions:
              eventsCount > 0
                ? [
                    {
                      type: 'analyze_schedule',
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
            id: `event-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: 'Нова подія',
            description: 'Швидко створена подія',
            eventType: 'task',
          };
          onEventCreate(quickEvent);
          addMessage({
            role: 'system',
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
                        <p key={index}>{line}</p>
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
                            key={index}
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
              onKeyPress={handleKeyPress}
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
