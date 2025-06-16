import React, { type FC } from "react";
import { styled, type CSS } from "@stitches/react";

// import react-icons
// Font Awesome Icons(Fa)
import { FaChevronUp, FaChevronDown, FaQuestionCircle } from "react-icons/fa";
// Material Design Icons (Md)
import { MdCalendarMonth } from "react-icons/md";

// mapping key-value for icons
const iconComponents = {
  "chevron-up": FaChevronUp,
  "chevron-down": FaChevronDown,
  calendar: MdCalendarMonth,
  "question-mark": FaQuestionCircle, // icon for fallback
};

// define TypeScript for available icon names
export type IconName = keyof typeof iconComponents;

// styled component for the icon wrapper
const StyledIcon = styled("span", {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  verticalAlign: "middle",
  fontSize: "1em",
  color: "currentColor",
});

interface IconProps {
  name: IconName;
  size?: CSS["fontSize"];
  color?: CSS["color"];
  className?: string;
  style?: React.CSSProperties; // Inline styles for the icon
  "aria-label"?: string; //  Accessibility label for the icon
  role?: string; // Role attribute for the icon
}

const Icon: FC<IconProps> = ({
  name,
  size,
  color,
  className,
  style,
  ...props
}) => {
  const IconComponent = iconComponents[name];
  const FinalIconComponent = IconComponent || iconComponents["question-mark"];

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
