import React, { useState, useCallback, useEffect } from "react";
import { styled } from "@stitches/react";
import {
  type ColorType,
  TASK_MARKER_COLORS,
  type CalendarEvent,
} from "../../types/types";

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

interface TaskInputFormProps {
  initialTask?: CalendarEvent | null;
  onSave: (task: CalendarEvent) => void; // callback for saving (add or update)
  onCancel: () => void; // Колбек для скасування
  onDelete?: (taskId: string) => void; // callback for delete
  initialDate?: string; // date for new task, if no exist initialTask
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
    TASK_MARKER_COLORS as unknown as ColorType[];

  // --- logic for button "Save" ---
  const handleSaveClick = useCallback(() => {
    if (title.trim() === "") {
      // or add feedback to user
      alert("Task title cannot be empty!");
      return;
    }

    const taskId = initialTask?.id || `task-${Date.now()}`; // generate ID for new task
    const taskDate = initialTask?.date || initialDate; // get date from exist task or initialDate

    if (!taskDate) {
      console.error("Task date is missing! Cannot save task.");

      return;
    }

    const taskToSave: CalendarEvent = {
      id: taskId,
      title: title.trim(),
      colors: selectedColors.length > 0 ? selectedColors : ["default"], // Check color array is not empty
      date: taskDate,
      eventType: "task",
    };

    onSave(taskToSave);
  }, [title, selectedColors, initialTask, initialDate, onSave]);

  // --- logic for btn "Delete"---
  const handleDeleteClick = useCallback(() => {
    if (initialTask?.id && onDelete) {
      onDelete(initialTask.id);
    }
  }, [initialTask, onDelete]);

  // --- logic for color selector ---
  const handleColorToggle = useCallback((color: ColorType) => {
    setSelectedColors((prevColors) => {
      if (prevColors.includes(color)) {
        const newColors = prevColors.filter((c) => c !== color);

        return newColors.length > 0 ? newColors : ["default"];
      } else {
        if (color === "default") {
          return ["default"];
        } else {
          // delete "default", if been once & add another color
          return [...prevColors.filter((c) => c !== "default"), color];
        }
      }
    });
  }, []);

  // --- handle KeyDown ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSaveClick();
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
            isSelected={selectedColors.includes(color)}
            onClick={() => handleColorToggle(color)}
          />
        ))}
      </ColorSelectorWrapper>
      <TaskInputButtons>
        <TaskInputButton onClick={onCancel}>Cancel</TaskInputButton>

        {initialTask && (
          <TaskInputButton danger onClick={handleDeleteClick}>
            {" "}
            Delete
          </TaskInputButton>
        )}
        <TaskInputButton primary onClick={handleSaveClick}>
          {" "}
          {initialTask ? "Save" : "Add Task"}{" "}
        </TaskInputButton>
      </TaskInputButtons>
    </TaskInputFormWrapper>
  );
};
