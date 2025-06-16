import React, { useMemo } from "react";
import { styled } from "@stitches/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, ColorType } from "./types"; // Імпорт типу

// TaskMarker також слід експортувати, якщо він використовується в інших місцях, або перенести його сюди
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
  // cursor: "grab",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  transition: "box-shadow 0.2s ease-in-out",
  // display: "flex",
  // flexDirection: "column",
  // gap: "2px",

  "&:last-child": {
    marginBottom: "0",
  },

  "&:hover": {
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },

  "& .task-title": {
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "wrap",
  },
  variants: {
    // Варианты для типов событий
    eventType: {
      task: {
        backgroundColor: "#f0f8ff",
        border: "1px solid #d0d0d0",
      },
      holiday: {
        border: "1px solid #dc3545",
        color: "red",
      },
    },
    // Варианты для цветов
    colors: {
      default: { borderColor: "#6c757d" },
      blue: { borderColor: "#007bff" },
      green: { borderColor: "#28a745" },
      orange: { borderColor: "#fd7e14" },
      red: { borderColor: "#dc3545" },
      yellow: { borderColor: "#ffc107" },
    },
    isDragging: {
      true: {
        opacity: 0.5,
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      },
      false: {
        // cursor: "pointer", // Удалено, т.к. теперь управляем через customCursor
      },
    },
    // !!!  CUSTOM CURSOR !!!
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
    colors: "default",
    isDragging: false,
    customCursor: "pointer !important",
  },
});

interface TaskCardDraggableProps {
  id: string;
  eventType: "task" | "holiday";
  colors?: ColorType[];
  title: string;
  onCardClick?: (e: React.MouseEvent, event: Task) => void;
  isDragging?: boolean;
  customCursor?: "pointer" | "default" | "grabbing";
  date?: string;
}

export const TaskCardDraggable: React.FC<TaskCardDraggableProps> = ({
  id,
  eventType,
  colors,
  title,
  onCardClick,
  customCursor: propCustomCursor, // Перейменовуємо, щоб не конфліктувати з локальним customCursor
  date,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: id,
      data: { eventType: eventType, colors: colors, title: title },
      disabled: eventType === "holiday", //off disable dragging for holidays
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "transform 0.2s ease-out",
  };

  // Визначаємо остаточний курсор:
  // Якщо це свято, курсор завжди 'default'
  // Якщо це таск і перетягується, курсор 'grabbing'
  // Інакше, використовуємо переданий пропс або дефолтний
  const finalCustomCursor = useMemo(() => {
    if (eventType === "holiday") {
      return "default";
    }
    if (isDragging) {
      return "grabbing";
    }
    return propCustomCursor || "pointer"; // Використовуємо пропс, якщо він є, інакше "pointer"
  }, [eventType, isDragging, propCustomCursor]);
  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      eventType={eventType}
      isDragging={isDragging}
      customCursor={finalCustomCursor}
      // draggable={eventType === "task"}
      onClick={
        onCardClick !== undefined
          ? (e) =>
              onCardClick(e, {
                id,
                eventType,
                colors: colors || [],
                title,
                date: date || "",
              })
          : undefined
      }
    >
      {eventType === "task" ? (
        <div style={{ display: "flex", gap: "4px" }}>
          {(colors || ["default"]).slice(0, 3).map((color, idx) => (
            <TaskMarker key={idx} color={color} />
          ))}
        </div>
      ) : null}
      <span className="task-title">{title}</span>
    </TaskCard>
  );
};
