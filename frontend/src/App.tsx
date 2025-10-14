import Calendar from "./components/Calendar/Calendar.tsx";
import { useState } from "react";
import { AIAssistant } from "./components/AIAssistant/AIAssistant.tsx";
import type { CalendarEvent } from "./services/aiService.ts";

function App() {
  // Your existing calendar events state
  const [events, setEvents] = useState<CalendarEvent[]>([
    // Your existing events
  ]);

  /**
   * Handle event creation from AI assistant
   */
  const handleEventCreate = (event: CalendarEvent) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`, // Generate unique ID
    };

    setEvents((prevEvents) => [...prevEvents, newEvent]);

    // Optional: Show success notification
    console.log("Event created:", newEvent);
  };

  /**
   * Handle event update from AI assistant
   */
  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event
      )
    );

    // Optional: Show success notification
    console.log("Event updated:", updatedEvent);
  };

  /**
   * Handle event deletion from AI assistant
   */
  const handleEventDelete = (eventId: string) => {
    setEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    );

    // Optional: Show success notification
    console.log("Event deleted:", eventId);
  };
  return (
    <div className="App">
      {/* calendar UI */}
      <Calendar />
      {/* AI Assistant Component */}
      <AIAssistant
        onEventCreate={handleEventCreate}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleEventDelete}
      />
    </div>
  );
}

export default App;
