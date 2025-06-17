import React from "react";
import { styled } from "@stitches/react";
import type { CSS } from "@stitches/react";
import Icon from "../Icon";

// 1. Створюємо контейнер для поля вводу та іконки
const InputWrapper = styled("div", {
  display: "flex", // Використовуємо flexbox для розміщення елементів в рядок
  alignItems: "center", // Вирівнюємо елементи по вертикалі по центру
  border: "1px solid #ccc",
  borderRadius: "8px", // Застосовуємо border-radius до контейнера
  backgroundColor: "#fff",
  padding: "4px 8px", // Внутрішній відступ контейнера

  // Стилі, які раніше були на StyledSearchInput, але логічніше для обгортки
  margin: "12px", // Зовнішній відступ від інших елементів
  maxWidth: "400px", // Максимальна ширина контейнера
  width: "100%", // Дозволяє контейнеру займати всю доступну ширину в межах maxWidth
  boxSizing: "border-box", // Враховуємо padding та border у загальній ширині

  "&:focus-within": {
    // Стиль при фокусі будь-якого елемента всередині Wrapper
    borderColor: "#007bff",
    boxShadow: "0 0 0 2px rgba(0,123,255,.25)",
  },
});

// 2. Стилізований інпут - тепер він буде "розтягуватися" всередині InputWrapper
const StyledInput = styled("input", {
  flexGrow: 1, // Дозволяє полю вводу займати весь доступний простір
  border: "none", // Прибираємо рамку, оскільки її надає InputWrapper
  outline: "none", // Прибираємо outline при фокусі (StyledInput отримує стилі фокусу від батька)
  padding: "8px 0", // Внутрішній відступ для самого інпуту (горизонтальний 0, вертикальний 8px)
  fontSize: "1rem",
  color: "#333",
  backgroundColor: "transparent", // Прозорий фон, щоб видно було фон InputWrapper
  boxSizing: "border-box", // Важливо для консистентності розмірів

  "&::placeholder": {
    color: "#aaa",
  },
});

// 3. Стилізована кнопка для іконки
const SearchIconButton = styled("button", {
  background: "none", // Без фону
  border: "none", // Без рамки
  cursor: "pointer", // Курсор-вказівник при наведенні
  padding: "0 8px", // Відступи навколо іконки
  display: "flex", // Для вирівнювання вмісту (самої іконки)
  alignItems: "center",
  justifyContent: "center",
  color: "#555", // Дефолтний колір іконки
  fontSize: "1.1rem", // Дефолтний розмір іконки (можна перекрити через Icon пропси)

  "&:hover": {
    color: "#007bff", // Колір при наведенні
  },
  "&:active": {
    color: "#0056b3", // Колір при натисканні
  },
});

// const StyledSearchInput = styled("input", {
//   padding: "8px 12px",
//   borderRadius: "4px",
//   border: "1px solid #ccc",
//   fontSize: "1rem",
//   width: "100%",
//   maxWidth: "200px",
//   boxSizing: "border-box",
//   margin: "2px 2px",
//   "&:focus": {
//     outline: "none",
//     borderColor: "#007bff",
//     boxShadow: "0 0 0 2px rgba(0, 123, 255, 0.25)",
//   },
// });

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClick?: () => void; // props for click on icon
  css?: CSS; // props for passing styles via the 'css' prop Stitches
  className?: string;
  style?: React.CSSProperties;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  value,
  onChange,
  onSearchClick,
  css,
  className,
  style,
  ...rest
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null); // Ref для інпута

  const handleIconClick = () => {
    if (onSearchClick) {
      onSearchClick(); // Викликаємо зовнішній обробник
    }
    // Фокусуємо інпут при кліку на іконку
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  return (
    // Тепер це головний елемент, який приймає зовнішні стилі
    <InputWrapper css={css} className={className} style={style}>
      <StyledInput
        ref={inputRef} // Прив'язуємо ref
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...rest} // Передаємо решту пропсів до інпуту (наприклад, `id`, `name`, `disabled` тощо)
      />
      <SearchIconButton
        type="button"
        onClick={handleIconClick}
        aria-label="Search"
      >
        <Icon name="search" size="1.1rem" />{" "}
        {/* Використовуємо ваш компонент Icon */}
      </SearchIconButton>
    </InputWrapper>
  );
};

export default SearchInput;
