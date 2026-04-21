import { styled } from '@stitches/react';
import { useTranslation } from 'react-i18next';
import 'dayjs/locale/uk';
import 'dayjs/locale/en';
import { type CalendarHeaderProps } from '../../types/types';
import Icon from '../Icon';
import SearchInput from './SearchInput';
import { useMemo } from 'react';

const HeaderWrapper = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  backdropFilter: 'saturate(180%) blur(14px)',
  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
  border: '1px solid rgba(255,255,255,0.55)',
  borderRadius: '16px',
  padding: '14px 14px',
  color: '#2d2d2f',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
  '@media (max-width: 768px)': {
    padding: '10px',
    gap: '10px',
  },
});

const MonthLabel = styled('h2', {
  margin: 0,
  fontSize: '1.35rem',
  color: '#1f2937',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  textTransform: 'capitalize ',
});

const MonthAndCountryContainer = styled('div', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
});

const CountrySelect = styled('select', {
  fontSize: '0.88rem',
  backgroundColor: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(148,163,184,0.35)',
  borderRadius: '999px',
  color: '#1f2937',
  fontWeight: '600',
  padding: '8px 12px',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(148,163,184,0.5)',
  },
  '&:focus': {
    outline: 'none',
    borderColor: 'rgba(59,130,246,0.55)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.15)',
  },
});

const CurrentViewDisplayButton = styled('button', {
  fontSize: '0.88rem',
  backgroundColor: '#111827',
  border: '1px solid #111827',
  borderRadius: '999px',
  cursor: 'default',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: '700',
  padding: '8px 12px',
  boxShadow: '0 2px 8px rgba(17,24,39,0.25)',
  '&:hover': {
    borderColor: '#e0e0e0',
  },
  '&:focus': {
    outline: 'none',
  },
});

const NavButton = styled('button', {
  fontSize: '1rem',
  backgroundColor: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(148,163,184,0.35)',
  borderRadius: '12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#4b5563',
  padding: '8px 10px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  '&:focus, &:hover': {
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#111827',
    borderColor: 'rgba(148,163,184,0.55)',
  },
  '&:active': {
    transform: 'translateY(1px)',
    backgroundColor: '#f8fafc',
    color: '#111827',
    borderColor: 'rgba(148,163,184,0.5)',
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
  fontSize: '0.9rem',
  backgroundColor: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(148,163,184,0.35)',
  borderRadius: '999px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#111827',
  fontWeight: '700',
  padding: '8px 14px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  '&:focus, &:hover': {
    backgroundColor: '#ffffff',
    outline: 'none',
    borderColor: 'rgba(148,163,184,0.55)',
  },
  '&:active': { transform: 'translateY(1px)' },
});

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
          <option value="UA">{t('country_ua')}</option>
          <option value="US">{t('country_us')}</option>
          <option value="GB">{t('country_gb')}</option>
          <option value="DE">{t('country_de')}</option>
          <option value="FR">{t('country_fr')}</option>
          <option value="PL">{t('country_pl')}</option>
          <option value="IT">{t('country_it')}</option>
          <option value="ES">{t('country_es')}</option>
          <option value="CA">{t('country_ca')}</option>
          <option value="AU">{t('country_au')}</option>
          <option value="JP">{t('country_jp')}</option>
        </CountrySelect>
      </MonthAndCountryContainer>
      <ButtonContainer gapSize="large">
        <SearchInput
          placeholder={t('search_task')}
          onChange={onSearchChange}
          value={searchInputValue}
          css={{ margin: '0px', flexGrow: 1 }}
        />
        <ButtonContainer>
          <ViewButton onClick={() => onViewModeChange('week')}>{t('week')}</ViewButton>
          <ViewButton onClick={() => onViewModeChange('month')}>{t('month')}</ViewButton>
        </ButtonContainer>
      </ButtonContainer>
    </HeaderWrapper>
  );
};
