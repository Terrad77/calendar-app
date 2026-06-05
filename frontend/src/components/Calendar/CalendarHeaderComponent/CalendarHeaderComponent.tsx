import { styled } from '@stitches/react';
import { useTranslation } from 'react-i18next';
import 'dayjs/locale/uk';
import 'dayjs/locale/en';
import type { CalendarHeaderProps } from '../../../types/calendar.types';
import Icon from '../../Icon';
import SearchInput from '../SearchInputComponent/SearchInputComponent';
import { useMemo } from 'react';

const HeaderWrapper = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  backgroundColor: 'var(--surface-calendar-shell)',
  backdropFilter: 'saturate(180%) blur(14px)',
  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
  border: '1px solid var(--surface-calendar-shell-border)',
  borderRadius: '16px',
  padding: '14px 14px',
  color: 'var(--surface-calendar-text)',
  boxShadow: '0 10px 28px var(--surface-calendar-shell-shadow)',
  '@media (max-width: 768px)': {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '10px',
    gap: '10px',
  },
});

const MonthLabel = styled('h2', {
  margin: 0,
  fontSize: '1.35rem',
  color: 'var(--surface-calendar-title)',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  textTransform: 'capitalize ',
});

const MonthAndCountryContainer = styled('div', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  '@media (max-width: 768px)': {
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

const CountrySelect = styled('select', {
  fontSize: '0.88rem',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  border: '1px solid var(--surface-calendar-control-border)',
  borderRadius: '999px',
  color: 'var(--surface-calendar-control-text)',
  fontWeight: '600',
  padding: '8px 12px',
  boxShadow:
    'inset 0 0 0 1px color-mix(in srgb, var(--surface-calendar-control-border) 35%, transparent)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'var(--surface-calendar-control-hover-bg)',
    borderColor: 'var(--surface-calendar-control-hover-border)',
  },
  '&:focus': {
    outline: 'none',
    borderColor: 'var(--surface-calendar-today-border)',
    boxShadow:
      '0 0 0 3px color-mix(in srgb, var(--surface-calendar-today-border) 22%, transparent)',
  },
});

const CurrentViewDisplayButton = styled('button', {
  fontSize: '0.88rem',
  backgroundColor: 'var(--surface-button-start)',
  border: '1px solid var(--surface-button-border)',
  borderRadius: '999px',
  cursor: 'default',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--surface-button-text)',
  fontWeight: '700',
  padding: '8px 12px',
  boxShadow: '0 2px 8px var(--surface-button-shadow)',
  '&:hover': {
    borderColor: 'var(--surface-button-border)',
  },
  '&:focus': {
    outline: 'none',
  },
});

const NavButton = styled('button', {
  fontSize: '1rem',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  border: '1px solid var(--surface-calendar-control-border)',
  borderRadius: '12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--surface-calendar-muted)',
  padding: '8px 10px',
  boxShadow: '0 1px 4px var(--surface-calendar-shell-shadow)',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  '&:focus, &:hover': {
    outline: 'none',
    backgroundColor: 'var(--surface-calendar-control-hover-bg)',
    color: 'var(--surface-calendar-control-text)',
    borderColor: 'var(--surface-calendar-control-hover-border)',
  },
  '&:active': {
    transform: 'translateY(1px)',
    backgroundColor:
      'color-mix(in srgb, var(--surface-calendar-control-hover-bg) 85%, transparent)',
    color: 'var(--surface-calendar-control-text)',
    borderColor:
      'color-mix(in srgb, var(--surface-calendar-control-hover-border) 85%, transparent)',
    outline: 'none',
  },
  '&:disabled': {
    backgroundColor: 'var(--surface-calendar-control-disabled-bg)',
    color: 'var(--surface-calendar-control-disabled-text)',
    cursor: 'not-allowed',
    borderColor: 'var(--surface-calendar-control-disabled-border)',
  },
});

const ButtonContainer = styled('div', {
  display: 'flex',
  flexWrap: 'wrap',
  '@media (max-width: 768px)': {
    width: '100%',
  },
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
  fontSize: '0.9rem',
  backgroundColor: 'var(--surface-calendar-control-bg)',
  border: '1px solid var(--surface-calendar-control-border)',
  borderRadius: '999px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--surface-calendar-control-text)',
  fontWeight: '700',
  padding: '8px 14px',
  boxShadow: '0 1px 4px var(--surface-calendar-shell-shadow)',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  '&:focus, &:hover': {
    backgroundColor: 'var(--surface-calendar-control-hover-bg)',
    outline: 'none',
    borderColor: 'var(--surface-calendar-control-hover-border)',
  },
  '&:active': { transform: 'translateY(1px)' },
  '@media (max-width: 768px)': {
    flex: '1 1 0',
    minWidth: '0',
  },
});

// Must stay in sync with COUNTRIES_TO_FETCH in backend/src/constants.ts
const SUPPORTED_COUNTRY_CODES = [
  'UA',
  'US',
  'GB',
  'DE',
  'FR',
  'CA',
  'AU',
  'JP',
  'IN',
  'BR',
  'MX',
  'AR',
  'ZA',
  'PL',
  'IT',
  'ES',
  'NL',
  'BE',
  'SE',
  'NO',
  'DK',
  'FI',
  'CH',
  'AT',
  'IE',
  'PT',
  'GR',
  'KR',
  'SG',
  'MY',
  'TH',
  'NZ',
  'TR',
  'VN',
  'PH',
] as const;

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  isPending,
  selectedCountry,
  onPrev,
  onNext,
  onCountryChange,
  onViewModeChange,
  onSearchChange,
  searchInputValue,
}) => {
  const { t, i18n } = useTranslation('calendar');
  // useMemo, щоб monthTitle перераховувався тільки при зміні дати або мови i18n
  const monthTitle = useMemo(() => {
    const lang = i18n.language.startsWith('uk') ? 'uk' : 'en';
    return currentDate.locale(lang).format('MMMM');
  }, [currentDate, i18n.language]);

  return (
    <HeaderWrapper>
      <ButtonContainer gapSize="large">
        <CurrentViewDisplayButton tabIndex={-1}>
          {viewMode === 'month' ? t('monthly') : t('weekly')}
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

      <MonthAndCountryContainer css={{ gap: '16px' }}>
        <MonthLabel>
          {monthTitle}
          &nbsp;
          {currentDate.year()}
        </MonthLabel>
        <CountrySelect
          value={selectedCountry}
          onChange={(event) => onCountryChange(event.target.value)}
          disabled={isPending}
          aria-label={t('select_country')}
        >
          <option value="ALL">{t('all_countries')}</option>
          {SUPPORTED_COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`country_${code.toLowerCase()}`)}
            </option>
          ))}
        </CountrySelect>
      </MonthAndCountryContainer>
      <ButtonContainer gapSize="large">
        <SearchInput
          placeholder={t('search_task')}
          onChange={onSearchChange}
          value={searchInputValue}
          css={{ margin: '0px', flexGrow: 1, width: '100%' }}
        />
        <ButtonContainer>
          <ViewButton onClick={() => onViewModeChange('week')}>{t('week')}</ViewButton>
          <ViewButton onClick={() => onViewModeChange('month')}>{t('month')}</ViewButton>
        </ButtonContainer>
      </ButtonContainer>
    </HeaderWrapper>
  );
};
