import { type FC } from 'react';
import { styled } from '@stitches/react';
import { IconProps } from '../../types/types';

// -----  import react-icons
import { TbCalendarSad } from 'react-icons/tb';

// Font Awesome Icons(Fa)
import {
  FaChevronUp,
  FaChevronDown,
  FaQuestionCircle,
  FaSearch,
  FaEye,
  FaEyeSlash,
  FaSun,
  FaMoon,
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaClock,
} from 'react-icons/fa';

// Material Design Icons (Md)
import { MdCalendarMonth } from 'react-icons/md';

// mapping for icons
const iconComponents = {
  'chevron-up': FaChevronUp,
  'chevron-down': FaChevronDown,
  calendar: MdCalendarMonth,
  search: FaSearch,
  'question-mark': FaQuestionCircle, // icon for fallback
  'calendar-sad': TbCalendarSad, // custom icon
  eye: FaEye,
  eyeOff: FaEyeSlash,
  sun: FaSun,
  moon: FaMoon,
  'x-close': FaTimes,
  plus: FaPlus,
  edit: FaEdit,
  trash: FaTrash,
  check: FaCheck,
  clock: FaClock,
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
