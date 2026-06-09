import React from 'react';
import { styled } from '@stitches/react';
import Icon from '../../Icon';
import type { SearchInputProps } from '../../../types/calendar.types';

const InputWrapper = styled('div', {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid var(--surface-calendar-search-border)',
  borderRadius: '8px',
  backgroundColor: 'var(--surface-calendar-search-bg)',
  padding: '4px 8px',
  margin: '12px',
  maxWidth: '400px',
  width: '100%',
  boxSizing: 'border-box',

  '&:focus-within': {
    // when any element inside the Wrapper is focused
    borderColor: 'var(--surface-calendar-today-border)',
    boxShadow:
      '0 0 0 2px color-mix(in srgb, var(--surface-calendar-today-border) 22%, transparent)',
  },
});

const StyledInput = styled('input', {
  flexGrow: 1,
  border: 'none',
  outline: 'none',
  padding: '8px 0',
  fontSize: '1rem',
  color: 'var(--surface-calendar-search-text)',
  backgroundColor: 'transparent',
  boxSizing: 'border-box',

  '&::placeholder': {
    color: 'var(--surface-calendar-search-placeholder)',
  },
});

// 3. Styled button for the icon
const SearchIconButton = styled('button', {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--surface-calendar-muted)',
  fontSize: '1.1rem',

  '&:hover': {
    color: 'var(--surface-calendar-control-text)',
  },
  '&:active': {
    color: 'var(--surface-calendar-today-border)',
    outline: 'none',
  },
});

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  value,
  onChange,
  onSearchClick,
  css,
  className,
  style,
  ...rest
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null); // Ref for the input

  const handleIconClick = () => {
    if (onSearchClick) {
      onSearchClick(); // Call the external handler
    }
    // Focus the input when the icon is clicked
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // prevent standart behavior Enter (submit form)
      if (onSearchClick) {
        onSearchClick();
      }
    }
  };

  return (
    // This is now the root element that accepts external styles
    <InputWrapper css={css} className={className} style={style}>
      <StyledInput
        ref={inputRef} // Bind the ref
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        {...rest} // Pass the rest of the props to the input (e.g. `id`, `name`, `disabled`, etc.)
      />
      <SearchIconButton type="button" onClick={handleIconClick} aria-label="Search">
        <Icon name="search" size="1.1rem" /> {/* Use your Icon component */}
      </SearchIconButton>
    </InputWrapper>
  );
};

export default SearchInput;
