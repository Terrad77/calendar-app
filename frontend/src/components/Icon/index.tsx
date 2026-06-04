import { type FC } from 'react';
import { styled } from '@stitches/react';
import type { IconProps } from '../../types/calendar.types';
// Use lucide-react icons (ESM, tree-shakeable)
import {
  ChevronUp,
  ChevronDown,
  Search,
  Eye,
  EyeOff,
  Sun,
  Moon,
  X,
  Plus,
  Edit,
  Trash,
  Check,
  Clock,
  Calendar as MdCalendarMonth,
  CircleQuestionMark,
} from 'lucide-react';

// mapping for icons
const iconComponents = {
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  calendar: MdCalendarMonth,
  search: Search,
  'question-mark': CircleQuestionMark, // icon for fallback
  'calendar-sad': MdCalendarMonth, // use lucide calendar as fallback for calendar-sad
  eye: Eye,
  eyeOff: EyeOff,
  sun: Sun,
  moon: Moon,
  'x-close': X,
  plus: Plus,
  edit: Edit,
  trash: Trash,
  check: Check,
  clock: Clock,
};

// styled component for the icon wrapper
const StyledIcon = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  verticalAlign: 'middle',
  fontSize: '1em',
  color: 'currentColor',
});

const Icon: FC<IconProps> = ({ name, size, color, className, style, ...props }) => {
  const IconComponent = iconComponents[name];
  const FinalIconComponent = IconComponent || iconComponents['question-mark'];

  // warning if icon not found
  if (!IconComponent) {
    console.warn(
      `Icon "${name}" not found in iconComponents map. Displaying fallback 'question-mark' icon.`
    );
  }

  return (
    <StyledIcon
      className={className}
      style={style}
      // style Stitches for span
      css={{
        fontSize: size,
        color: color,
      }}
      {...props}
    >
      <FinalIconComponent />
    </StyledIcon>
  );
};

export default Icon;
