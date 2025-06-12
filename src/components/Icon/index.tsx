import React, { type FC, type ComponentType } from "react";
import { styled, type CSS } from "@stitches/react";

// Импортируем нужные иконки из react-icons
// Для стрелок вверх/вниз используем Font Awesome (Fa)
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
// Для календаря используем Material Design Icons (Md)
import { MdCalendarMonth } from "react-icons/md";
// Для заглушки используем иконку вопросительного знака из Font Awesome
import { FaQuestionCircle } from "react-icons/fa";

// Создаем маппинг, где ключ - это наше внутреннее имя иконки,
// а значение - импортированный компонент react-icons.
const iconComponents = {
  "chevron-up": FaChevronUp,
  "chevron-down": FaChevronDown,
  calendar: MdCalendarMonth,
  "question-mark": FaQuestionCircle, // Иконка-заглушка
  // Добавляйте сюда другие иконки по мере необходимости,
  // импортируя их из соответствующих пакетов react-icons (e.g., 'react-icons/ai', 'react-icons/io').
};

// Определяем TypeScript тип для доступных имен иконок.
export type IconName = keyof typeof iconComponents;

// Стилизованный компонент-обертка для иконки.
// Компоненты react-icons сами являются SVG-элементами,
// поэтому мы создаем 'span' или 'div' для их обертки и применения базовых стилей.
const StyledIcon = styled("span", {
  display: "inline-flex", // Позволяет иконке быть выровненной по вертикали и правильно масштабироваться
  alignItems: "center", // Центрирует SVG по вертикали внутри span
  justifyContent: "center", // Центрирует SVG по горизонтали внутри span
  verticalAlign: "middle", // Важно для выравнивания иконок в строке с текстом

  // Базовые стили, которые будут применяться к самой обертке.
  // Компоненты react-icons по умолчанию наследуют 'font-size' и 'color' от своего родителя,
  // поэтому мы контролируем размер и цвет через обертку.
  fontSize: "1em", // По умолчанию размер иконки будет равен font-size родительского элемента
  color: "currentColor", // По умолчанию цвет иконки наследуется от родителя
});

// Пропсы для компонента Icon
interface IconProps {
  name: IconName; // Обязательное имя иконки
  size?: CSS["fontSize"]; // Опциональный размер. CSS['fontSize'] включает строки (e.g., '1.2em')
  color?: CSS["color"]; // Опциональный цвет. CSS['color'] включает строки и токены Stitches
  className?: string; // Для передачи дополнительных классов
  style?: React.CSSProperties; // Для инлайн стилей
  // Любые другие стандартные HTML-атрибуты, которые вы хотите передать обертке (например, aria-label)
  "aria-label"?: string;
  role?: string;
}

const Icon: FC<IconProps> = ({
  name,
  size,
  color,
  className,
  style,
  ...props
}) => {
  // Получаем нужный компонент react-icons из маппинга
  const IconComponent = iconComponents[name];

  // Определяем компонент, который будет рендериться.
  // Если запрошенная иконка не найдена, используем заглушку 'question-mark'.
  const FinalIconComponent = IconComponent || iconComponents["question-mark"];

  // Опциональное предупреждение для отладки
  if (!IconComponent) {
    console.warn(
      `Icon "${name}" not found in iconComponents map. Displaying fallback 'question-mark' icon.`
    );
  }

  return (
    <StyledIcon
      className={className}
      style={style}
      // Применяем стили Stitches к обертке span
      css={{
        fontSize: size, // Это установит font-size на span, который унаследует SVG от react-icons
        color: color, // Это установит color на span, который унаследует SVG от react-icons
      }}
      // Передаем любые другие пропсы (например, aria-label) на сам StyledIcon (span)
      {...props}
    >
      {/* Рендерим импортированный компонент react-icons внутри StyledIcon.
          React-icons компоненты сами по себе являются SVG и отлично наследуют стили. */}
      <FinalIconComponent />
    </StyledIcon>
  );
};

export default Icon;
