import { useState, useRef, useEffect, useCallback } from "react";
import type {
  aiService,
  AIResponse,
  CalendarEvent,
} from "../../services/aiService.ts";
import * as S from "./AIAssistant.styles.ts";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: AIResponse;
  timestamp: Date;
}

interface AIAssistantProps {
  currentEvents: CalendarEvent[];
  onEventCreate?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Що сьогодні?", value: "Що у мене заплановано на сьогодні?" },
  { label: "Знайти час", value: "Знайди мені вільний час для зустрічі" },
  { label: "Аналіз тижня", value: "Проаналізуй мій тиждень" },
  { label: "Створити подію", value: "Створи нову подію" },
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Привіт! Я ваш AI-асистент календаря. Можу допомогти створити події, знайти вільний час, проаналізувати розклад та багато іншого. Чим можу допомогти?",
  timestamp: new Date(),
};

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentEvents,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const textToSend = messageText || input.trim();

      if (!textToSend || isLoading) return;

      setInput("");
      setError(null);

      const userMessage: Message = {
        role: "user",
        content: textToSend,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await aiService.chat(textToSend, currentEvents);

        const assistantMessage: Message = {
          role: "assistant",
          content: response.message,
          action: response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError("Вибачте, сталася помилка. Спробуйте ще раз.");

        const errorMessage: Message = {
          role: "assistant",
          content:
            "Вибачте, сталася помилка при обробці вашого запиту. Будь ласка, спробуйте ще раз.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, currentEvents]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAction = useCallback(
    (action: AIResponse) => {
      try {
        if (action.action === "create" && action.event && onEventCreate) {
          onEventCreate(action.event);

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "✓ Подію створено успішно!",
              timestamp: new Date(),
            },
          ]);
        } else if (
          action.action === "update" &&
          action.event &&
          onEventUpdate
        ) {
          onEventUpdate(action.event);

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "✓ Подію оновлено!",
              timestamp: new Date(),
            },
          ]);
        } else if (
          action.action === "delete" &&
          action.event?.id &&
          onEventDelete
        ) {
          onEventDelete(action.event.id);

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "✓ Подію видалено!",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        setError("Помилка при виконанні дії");
      }
    },
    [onEventCreate, onEventUpdate, onEventDelete]
  );

  const handleQuickAction = useCallback(
    (actionValue: string) => {
      handleSend(actionValue);
    },
    [handleSend]
  );

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const getActionButtonText = (action: string): string => {
    switch (action) {
      case "create":
        return "✓ Створити подію";
      case "update":
        return "✓ Оновити подію";
      case "delete":
        return "✓ Видалити подію";
      default:
        return "✓ Виконати";
    }
  };

  return (
    <S.AssistantContainer>
      {isOpen && (
        <S.ChatWindow>
          <S.ChatHeader>
            <h3>🤖 AI Асистент</h3>
            <S.CloseButton onClick={toggleChat} aria-label="Close chat">
              ×
            </S.CloseButton>
          </S.ChatHeader>

          <S.QuickActions>
            {QUICK_ACTIONS.map((action) => (
              <S.QuickActionChip
                key={action.label}
                onClick={() => handleQuickAction(action.value)}
                disabled={isLoading}
              >
                {action.label}
              </S.QuickActionChip>
            ))}
          </S.QuickActions>

          <S.MessagesContainer>
            {messages.map((message, index) => (
              <S.MessageWrapper key={index}>
                <S.Message role={message.role}>{message.content}</S.Message>

                {message.action &&
                  message.action.action !== "query" &&
                  message.action.action !== "analyze" && (
                    <S.ActionButtons>
                      <S.ActionButton
                        onClick={() => handleAction(message.action!)}
                      >
                        {getActionButtonText(message.action.action)}
                      </S.ActionButton>
                    </S.ActionButtons>
                  )}
              </S.MessageWrapper>
            ))}

            {isLoading && (
              <S.LoadingMessage role="assistant">Думаю</S.LoadingMessage>
            )}

            {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

            <div ref={messagesEndRef} />
          </S.MessagesContainer>

          <S.InputContainer>
            <S.Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишіть повідомлення..."
              disabled={isLoading}
              aria-label="Message input"
            />
            <S.SendButton
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              Надіслати
            </S.SendButton>
          </S.InputContainer>
        </S.ChatWindow>
      )}

      <S.AssistantButton
        onClick={toggleChat}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
      >
        {isOpen ? "×" : "🤖"}
      </S.AssistantButton>
    </S.AssistantContainer>
  );
};
