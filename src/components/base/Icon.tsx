import { spacing } from "../../lib/style";
type IconName =
  | "arrow"
  | "check"
  | "chevron"
  | "code"
  | "collapse"
  | "download"
  | "history"
  | "message"
  | "more"
  | "play"
  | "plus"
  | "sparkles"
  | "upload";

type IconProps = {
  name: IconName;
  size?: string | number;
};

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m5 12 14 0m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  code: <path d="m8 9-3 3 3 3m8-6 3 3-3 3m-5 3 2-12" />,
  collapse: <path d="M9 18 3 12l6-6m6 12 6-6-6-6" />,
  download: <path d="M12 3v12m-4-4 4 4 4-4M5 21h14" />,
  history: <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2" />,
  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  play: <path d="m9 7 8 5-8 5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  sparkles: <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 14l1 2.8 2.8 1L7 18.8 6 22l-1-3.2-3-1 3-1L6 14Z" />,
  upload: <path d="M12 16V4m-4 4 4-4 4 4M5 20h14" />,
};

export function Icon({ name, size = spacing[16] }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}
