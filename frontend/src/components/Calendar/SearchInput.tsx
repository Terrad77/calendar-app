import React from "react";
import { styled } from "@stitches/react";
import Icon from "../Icon";
import { type SearchInputProps } from "../../types";

const InputWrapper = styled("div", {
  display: "flex",
  alignItems: "center",
  border: "1px solid #ccc",
  borderRadius: "8px",
  backgroundColor: "#fff",
  padding: "4px 8px",
  margin: "12px",
  maxWidth: "400px",
  width: "100%",
  boxSizing: "border-box",

  "&:focus-within": {
    // при фокусі будь-якого елемента всередині Wrapper
    borderColor: "#007bff",
    boxShadow: "0 0 0 2px rgba(0,123,255,.25)",
  },
});

const StyledInput = styled("input", {
  flexGrow: 1,
  border: "none",
  outline: "none",
  padding: "8px 0",
  fontSize: "1rem",
  color: "#333",
  backgroundColor: "transparent",
  boxSizing: "border-box",

  "&::placeholder": {
    color: "#aaa",
  },
});

// 3. Стилізована кнопка для іконки
const SearchIconButton = styled("button", {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#555",
  fontSize: "1.1rem",

  "&:hover": {
    color: "#007bff",
  },
  "&:active": {
    color: "#0056b3",
    outline: "none",
  },
});

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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent standart behavior Enter (submit form)
      if (onSearchClick) {
        onSearchClick();
      }
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
        onKeyDown={handleKeyDown}
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
