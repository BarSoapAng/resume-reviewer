import { LuArrowRight, LuArrowUp, LuCheck, LuChevronDown, LuChevronRight, LuCode, LuDownload, LuExpand, LuEye, LuFlag, LuHistory, LuMessageSquare, LuEllipsis, LuPencil, LuPlay, LuPlus, LuSparkles, LuUpload, LuX } from "react-icons/lu";
import { spacing } from "../../lib/style";

const icons = {
  arrow: LuArrowRight,
  "arrow-up": LuArrowUp,
  check: LuCheck,
  chevron: LuChevronRight,
  "chevron-down": LuChevronDown,
  code: LuCode,
  close: LuX,
  pencil: LuPencil,
  collapse: LuExpand,
  download: LuDownload,
  flag: LuFlag,
  preview: LuEye,
  history: LuHistory,
  message: LuMessageSquare,
  more: LuEllipsis,
  play: LuPlay,
  plus: LuPlus,
  sparkles: LuSparkles,
  upload: LuUpload,
};

export function Icon({ name, size = spacing.md }: { name: keyof typeof icons; size?: string | number }) {
  const Component = icons[name];
  return <Component aria-hidden="true" focusable="false" size={size} />;
}
