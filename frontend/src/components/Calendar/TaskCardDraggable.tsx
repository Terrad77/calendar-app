import React, { useMemo } from "react";
import { styled } from "@stitches/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CalendarEvent, ColorType } from "../../types"; // <--- ЗМІНА

const TaskMarker = styled("span", {
  width: "34px",
  height: "6px",
  borderRadius: "6px",
  flexShrink: 0,
  variants: {
    color: {
      blue: { backgroundColor: "#0070bc" },
      green: { backgroundColor: "#62c050" },
      orange: { backgroundColor: "#fea93f" },
      purple: { backgroundColor: "#c67ae3" },
      turquoise: { backgroundColor: "#51ea9d" },
      yellow: { backgroundColor: "#f2d200" },
      default: { backgroundColor: "#a0a0a0" },
    },
  },
});

const TaskCard = styled("div", {
  backgroundColor: "#ffffff",
  borderRadius: "3px",
  padding: "4px 8px",
  fontSize: "0.7rem",
  fontWeight: "500",
  color: "#333",
  marginBottom: "4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  transition: "box-shadow 0.2s ease-in-out",

  "&:last-child": {
    marginBottom: "0",
  },

  "& .task-title": {
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "wrap",
  },
  variants: {
    eventType: {
      task: {
        "&:hover": {
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        },
        backgroundColor: "#f0f8ff",
      },
      holiday: {
        // border: "1px solid #dc3545", // Можливо, захочете повернути рамку для візуального акценту
        color: "red", // Текст свят червоний
        boxShadow: "0 2px 6px #dc3545", // Червона тінь для свят
      },
    },
    // variants for color - ці стилі, ймовірно, стосуються border.
    // Якщо ви хочете, щоб TaskCard мав основний колір залежно від colors[0],
    // то потрібно буде змінити backgroundColor тут.
    // Наразі backgroundColor задається eventType, а colors використовуються для маркерів.
    colors: {
      default: { borderColor: "#6c757d" },
      blue: { borderColor: "#007bff" },
      green: { borderColor: "#28a745" },
      orange: { borderColor: "#fd7e14" },
      red: { borderColor: "#dc3545" }, // Використовується для рамки, якщо colors="red"
      yellow: { borderColor: "#ffc107" },
    },
    isDragging: {
      true: {
        opacity: 0.5,
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      },
    },
    customCursor: {
      pointer: {
        cursor: "pointer",
      },
      default: {
        cursor: "default",
      },
      grabbing: {
        cursor: "grabbing",
      },
    },
  },

  defaultVariants: {
    eventType: "task",
    colors: "default", // Це для borderColor, якщо TaskCard отримує colors
    isDragging: false,
    customCursor: "pointer",
  },
});

interface TaskCardDraggableProps {
  event: CalendarEvent; // <--- ЗМІНА: Тепер приймає весь об'єкт CalendarEvent
  onCardClick?: (e: React.MouseEvent, event: CalendarEvent) => void; // <--- ЗМІНА
  isDragging?: boolean; // Для DragOverlay
  customCursor?: "pointer" | "default" | "grabbing";
}

export const TaskCardDraggable: React.FC<TaskCardDraggableProps> = ({
  event, // <--- ЗМІНА
  onCardClick,
  customCursor: propCustomCursor,
  isDragging: propIsDragging, // З пропсів, використовується для DragOverlay
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging,
  } = useSortable({
    id: event.id,
    data: {
      eventType: event.eventType,
      colors: event.colors,
      title: event.title,
      description: event.description, // Додано
      countryCode: event.countryCode, // Додано
    },
    disabled: event.eventType === "holiday", // Відключення перетягування для свят
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "transform 0.2s ease-out",
  };

  // Визначаємо, чи елемент зараз перетягується (або батьківський DragOverlay)
  const renderIsDragging =
    propIsDragging !== undefined ? propIsDragging : dndIsDragging;

  const finalCustomCursor = useMemo(() => {
    if (event.eventType === "holiday") {
      return "default";
    }
    if (renderIsDragging) {
      return "grabbing";
    }
    return propCustomCursor || "pointer";
  }, [event.eventType, renderIsDragging, propCustomCursor]);

  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      eventType={event.eventType} // <--- ПЕРЕДАЄМО event.eventType для стилізації
      isDragging={renderIsDragging} // <--- ПЕРЕДАЄМО renderIsDragging
      customCursor={finalCustomCursor}
      onClick={
        onCardClick !== undefined
          ? (e) => onCardClick(e, event) // <--- ПЕРЕДАЄМО ВЕСЬ ОБ'ЄКТ event
          : undefined
      }
    >
      {/* Маркери кольорів тільки для завдань */}
      {event.eventType === "task" ? (
        <div style={{ display: "flex", gap: "4px" }}>
          {/* event.colors може бути undefined для завдань, якщо вони не мають кольорів */}
          {(event.colors || ["default"]).slice(0, 3).map((color, idx) => (
            <TaskMarker key={idx} color={color} />
          ))}
        </div>
      ) : null}

      <span className="task-title">{event.title}</span>

      {/* Опис тільки для завдань */}
      {event.eventType === "task" && event.description && (
        <p style={{ fontSize: "0.65rem", color: "#666", marginTop: "2px" }}>
          {event.description}
        </p>
      )}

      {/* Код країни тільки для свят */}
      {event.eventType === "holiday" && event.countryCode && (
        <p style={{ fontSize: "0.65rem", color: "red", marginTop: "2px" }}>
          ({event.countryCode})
        </p>
      )}
    </TaskCard>
  );
};
