import { useState } from 'react';
import styles from './AIAssistant.module.css';
import type { CalendarEvent } from '../../services/aiService';

interface AIAssistantProps {
  currentEvents: CalendarEvent[];
  onEventCreate: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  currentEvents,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen((prev) => !prev);

  return (
    <div className={styles.assistantContainer}>
      <button className={styles.assistantButton} onClick={toggleChat}>
        AI
      </button>

      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <h3>AI Assistant</h3>
            <button
              onClick={toggleChat}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {/* Тут можна рендерити історію чатів, інтерактивні кнопки, підключення AI */}
            <p>Welcome! Ask me about your calendar events.</p>
          </div>
        </div>
      )}
    </div>
  );
};
