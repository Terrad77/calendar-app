import React, { useState, useCallback, useEffect } from "react";
import { styled } from "@stitches/react";
import {
  type ColorType,
  TASK_MARKER_COLORS_FOR_SELECTOR,
  type Task,
} from "./types";

const TaskInputFormWrapper = styled("div", {
  marginTop: "2px",
  padding: "2px",
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
// --- End Styled Components ---

interface TaskInputFormProps {
  initialTask?: Task | null; // Містить повний об'єкт завдання для редагування
  onSave: (task: Task) => void; // Колбек для збереження (додавання або оновлення)
  onCancel: () => void; // Колбек для скасування
  onDelete?: (taskId: string) => void; // Колбек для видалення (необов'язковий, якщо не для редагування)
  initialDate?: string; // Дата для нового завдання, якщо немає initialTask
}

export const TaskInputForm: React.FC<TaskInputFormProps> = ({
  initialTask,
  onSave,
  onCancel,
  onDelete,
  initialDate,
}) => {
  const [title, setTitle] = useState(initialTask?.title || "");
  const [selectedColors, setSelectedColors] = useState<ColorType[]>(
    initialTask?.colors && initialTask.colors.length > 0
      ? initialTask.colors
      : ["default"]
  );

  useEffect(() => {
    setTitle(initialTask?.title || "");
    setSelectedColors(
      initialTask?.colors && initialTask.colors.length > 0
        ? initialTask.colors
        : ["default"]
    );
  }, [initialTask]);

  const availableColors: ColorType[] =
    TASK_MARKER_COLORS_FOR_SELECTOR as unknown as ColorType[];

  // --- ЛОГІКА КНОПКИ "ЗБЕРЕГТИ" ---
  const handleSaveClick = useCallback(() => {
    if (title.trim() === "") {
      // Можна додати якийсь feedback користувачу
      alert("Task title cannot be empty!");
      return;
    }

    const taskId = initialTask?.id || `task-${Date.now()}`; // Генеруємо унікальний ID для нового завдання
    const taskDate = initialTask?.date || initialDate; // Беремо дату з існуючого завдання або з initialDate

    if (!taskDate) {
      console.error("Task date is missing! Cannot save task.");
      // Можна додати більш дружнє повідомлення користувачу
      return;
    }

    const taskToSave: Task = {
      id: taskId,
      title: title.trim(),
      colors: selectedColors.length > 0 ? selectedColors : ["default"], // Перевіряємо, щоб масив кольорів не був пустим
      date: taskDate,
      eventType: "task", // Завжди 'task' для завдань, створених/відредагованих тут
    };

    onSave(taskToSave); // Викликаємо батьківський onSave
  }, [title, selectedColors, initialTask, initialDate, onSave]);

  // --- ЛОГІКА КНОПКИ "ВИДАЛИТИ" ---
  const handleDeleteClick = useCallback(() => {
    if (initialTask?.id && onDelete) {
      // Перевіряємо, чи є ID завдання та чи передана функція onDelete
      onDelete(initialTask.id); // Викликаємо батьківський onDelete
    }
  }, [initialTask, onDelete]);

  // --- ЛОГІКА ДЛЯ КОЛІРНОГО СЕЛЕКТОРА ---
  const handleColorToggle = useCallback((color: ColorType) => {
    setSelectedColors((prevColors) => {
      // Якщо колір вже вибраний, видаляємо його
      if (prevColors.includes(color)) {
        const newColors = prevColors.filter((c) => c !== color);
        // Якщо всі кольори видалено, повертаємо 'default'
        return newColors.length > 0 ? newColors : ["default"];
      } else {
        // Якщо колір не вибраний, додаємо його (якщо це не "default" і ми хочемо, щоб "default" був ексклюзивним)
        // Або ж просто додаємо, якщо він не "default"
        if (color === "default") {
          return ["default"]; // Якщо вибрано "default", то це єдиний колір
        } else {
          // Видаляємо "default", якщо він був єдиним і додається інший колір
          return [...prevColors.filter((c) => c !== "default"), color];
        }
      }
    });
  }, []);

  // --- ОБРОБНИК НАТИСКАННЯ КЛАВІШ ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSaveClick(); // Викликаємо оновлену функцію збереження
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSaveClick, onCancel]
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
            isSelected={selectedColors.includes(color)} // Перевірка через includes
            onClick={() => handleColorToggle(color)}
          />
        ))}
      </ColorSelectorWrapper>
      <TaskInputButtons>
        <TaskInputButton onClick={onCancel}>Cancel</TaskInputButton>
        {/* Кнопка "Delete" показується лише в режимі редагування (коли є initialTask) */}
        {initialTask && (
          <TaskInputButton danger onClick={handleDeleteClick}>
            {" "}
            {/* Змінено на handleDeleteClick */}
            Delete
          </TaskInputButton>
        )}
        <TaskInputButton primary onClick={handleSaveClick}>
          {" "}
          {/* Змінено на handleSaveClick */}
          {initialTask ? "Save" : "Add Task"}{" "}
          {/* Змінюємо текст кнопки в залежності від режиму */}
        </TaskInputButton>
      </TaskInputButtons>
    </TaskInputFormWrapper>
  );
};
