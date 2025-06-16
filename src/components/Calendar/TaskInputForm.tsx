import React, { useState, useCallback } from "react";
import { styled } from "@stitches/react";
import { type ColorType, TASK_MARKER_COLORS_FOR_SELECTOR } from "./types"; // Імпорт типів

const TaskInputFormWrapper = styled("div", {
  marginTop: "8px",
  padding: "4px",
  backgroundColor: "#f9f9f9",
  border: "1px solid #e0e0e0",
  borderRadius: "3px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  position: "absolute",
  bottom: "4px",
  left: "4px",
  right: "4px",
  zIndex: 10,
});

const TaskInput = styled("input", {
  width: "calc(100% - 8px)",
  padding: "4px",
  border: "1px solid #d0d0d0",
  borderRadius: "3px",
  fontSize: "0.85rem",
  "&:focus": {
    outline: "none",
    borderColor: "#007bff",
  },
});

const TaskInputButtons = styled("div", {
  display: "flex",
  justifyContent: "flex-end",
  gap: "4px",
});

const TaskInputButton = styled("button", {
  padding: "4px 8px",
  borderRadius: "3px",
  border: "1px solid #d0d0d0",
  backgroundColor: "#e3e5e6",
  cursor: "pointer",
  fontSize: "0.8rem",
  boxShadow: "0 1px 0 #ced0d1",
  transition: "background-color 0.2s, color 0.2s, border-color 0.2s",
  "&:hover": {
    backgroundColor: "#c7cbcf",
    borderColor: "#c7cbcf",
  },
  variants: {
    primary: {
      true: {
        backgroundColor: "#007bff",
        color: "#fff",
        borderColor: "#007bff",
        "&:hover": {
          backgroundColor: "#0056b3",
          borderColor: "#0056b3",
        },
      },
    },
    danger: {
      true: {
        backgroundColor: "#dc3545",
        color: "#fff",
        borderColor: "#dc3545",
        "&:hover": {
          backgroundColor: "#c82333",
          borderColor: "#bd2130",
        },
      },
    },
  },
});

const ColorSelectorWrapper = styled("div", {
  display: "flex",
  gap: "4px",
  marginTop: "4px",
  flexWrap: "wrap",
});

const ColorOption = styled("div", {
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  cursor: "pointer",
  border: "2px solid transparent",
  transition: "border-color 0.2s",

  "&:hover": {
    borderColor: "#ccc",
  },

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
    isSelected: {
      true: {
        borderColor: "#007bff",
        boxShadow: "0 0 0 2px rgba(0, 123, 255, 0.5)",
      },
    },
  },
});

interface TaskInputFormProps {
  day: string;
  initialTitle?: string;
  initialColors?: ColorType[];
  onAddTask: (date: string, title: string, colors: ColorType[]) => void;
  onUpdateTask?: (taskId: string, title: string, colors: ColorType[]) => void;
  onDeleteTask?: (taskId: string) => void; // Додаємо пропс для видалення
  onCancel: () => void;
  taskId?: string;
}

export const TaskInputForm: React.FC<TaskInputFormProps> = ({
  day,
  initialTitle = "",
  initialColors = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask, // Деструктуруємо
  onCancel,
  taskId,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [selectedColors, setSelectedColors] = useState<Set<ColorType>>(
    new Set(initialColors.length > 0 ? initialColors : ["default"])
  );

  const availableColors: ColorType[] =
    TASK_MARKER_COLORS_FOR_SELECTOR as unknown as ColorType[];

  const handleColorToggle = useCallback((color: ColorType) => {
    setSelectedColors((prevColors) => {
      const newColors = new Set(prevColors);
      if (newColors.has(color)) {
        newColors.delete(color);
      } else {
        newColors.add(color);
      }
      if (newColors.size === 0) {
        newColors.add("default");
      }
      return newColors;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (title.trim()) {
      const colorsToSave = Array.from(selectedColors);
      if (taskId && onUpdateTask) {
        onUpdateTask(taskId, title, colorsToSave);
      } else {
        onAddTask(day, title, colorsToSave);
      }
      onCancel();
    }
  }, [title, selectedColors, taskId, onUpdateTask, onAddTask, day, onCancel]);

  const handleDelete = useCallback(() => {
    if (taskId && onDeleteTask) {
      onDeleteTask(taskId);
      onCancel();
    }
  }, [taskId, onDeleteTask, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  return (
    <TaskInputFormWrapper onClick={(e) => e.stopPropagation()}>
      <TaskInput
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label="Task title input"
      />
      <ColorSelectorWrapper>
        {availableColors.map((color) => (
          <ColorOption
            key={color}
            color={color}
            isSelected={selectedColors.has(color)}
            onClick={() => handleColorToggle(color)}
          />
        ))}
      </ColorSelectorWrapper>
      <TaskInputButtons>
        <TaskInputButton onClick={onCancel}>Cancel</TaskInputButton>
        {taskId &&
          onDeleteTask && ( // Показуємо кнопку "Delete", якщо taskId присутній
            <TaskInputButton danger onClick={handleDelete}>
              Delete
            </TaskInputButton>
          )}
        <TaskInputButton primary onClick={handleSave}>
          {taskId ? "Save" : "Add Task"}
        </TaskInputButton>
      </TaskInputButtons>
    </TaskInputFormWrapper>
  );
};
