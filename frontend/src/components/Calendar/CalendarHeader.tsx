import { styled } from '@stitches/react';
import { type CalendarHeaderProps } from '../../types/types';
import Icon from '../Icon';
import SearchInput from './SearchInput';

const HeaderWrapper = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  backgroundColor: '#edeff1',
  padding: '20px 8px 20px 8px',
  color: '#555',
  boxShadow: '0 1px 0 #ced0d1',
});

const MonthLabel = styled('h2', {
  margin: 0,
  fontSize: '1.5rem',
  color: '#36343a',
});

const CurrentViewDisplayButton = styled('button', {
  fontSize: '1rem',
  backgroundColor: '#e3e5e6',
  border: '1px solid #e0e0e0',
  borderRadius: '3px',
  cursor: 'default',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#555',
  fontWeight: '700',
  padding: '6px 12px',
  boxShadow: '0 1px 0 #ced0d1',
  '&:hover': {
    borderColor: '#e0e0e0',
  },
  '&:focus': {
    outline: 'none',
  },
});

const NavButton = styled('button', {
  fontSize: '1rem',
  backgroundColor: '#e3e5e6',
  border: '1px solid #e0e0e0',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#97999a',
  padding: '8px 10px',
  boxShadow: '0 1px 0 #ced0d1',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  '&:focus, &:hover': {
    outline: 'none',
    backgroundColor: '#c7cbcf',
    color: '#333',
    borderColor: '#d0d0d0',
  },
  '&:active': {
    backgroundColor: '#c7cbcf',
    color: '#222',
    borderColor: '#c0c0c0',
    outline: 'none',
  },
  '&:disabled': {
    backgroundColor: '#e0e0e0',
    color: '#a0a0a0',
    cursor: 'not-allowed',
    borderColor: '#d0d0d0',
  },
});

const ButtonContainer = styled('div', {
  display: 'flex',
  variants: {
    gapSize: {
      small: { gap: '4px' },
      medium: { gap: '8px' },
      large: { gap: '16px' },
    },
    direction: {
      row: { flexDirection: 'row' },
      column: { flexDirection: 'column' },
    },
  },
  defaultVariants: {
    gapSize: 'medium',
    direction: 'row',
  },
});

const ViewButton = styled('button', {
  fontSize: '1rem',
  backgroundColor: '#e3e5e6',
  border: '1px solid #e0e0e0',
  borderRadius: '3px',
  cursor: 'pointer',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#36343a',
  fontWeight: '700',
  padding: '6px 12px',
  boxShadow: '0 1px 0 #ced0d1',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  '&:focus, &:hover': {
    backgroundColor: '#c7cbcf',
    outline: 'none',
    borderColor: '#d0d0d0',
  },
  '&:active': { backgroundColor: '#c7cbcf' },
});

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  isPending,
  onPrev,
  onNext,
  onViewModeChange,
  onSearchChange,
  searchInputValue,
}) => {
  return (
    <HeaderWrapper>
      <ButtonContainer gapSize="large">
        <CurrentViewDisplayButton tabIndex={-1}>
          {viewMode === 'month' ? 'Monthly' : 'Weekly'}
        </CurrentViewDisplayButton>
        <ButtonContainer>
          <NavButton onClick={onPrev} disabled={isPending}>
            <Icon name="chevron-up" />
          </NavButton>
          <NavButton onClick={onNext} disabled={isPending}>
            <Icon name="chevron-down" />
          </NavButton>
        </ButtonContainer>
      </ButtonContainer>

      <MonthLabel>
        {currentDate.format('MMMM')}
        &nbsp;
        {currentDate.year()}
      </MonthLabel>
      <ButtonContainer gapSize="large">
        <SearchInput
          placeholder="Search task..."
          onChange={onSearchChange}
          value={searchInputValue}
          css={{ margin: '0px', flexGrow: 1 }}
        />
        <ButtonContainer>
          <ViewButton onClick={() => onViewModeChange('week')}>Week</ViewButton>
          <ViewButton onClick={() => onViewModeChange('month')}>Month</ViewButton>
        </ButtonContainer>
      </ButtonContainer>
    </HeaderWrapper>
  );
};
