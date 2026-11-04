import styled from "styled-components";

export const colors = {
  paper: { 0: "#ffffff", 100: "#fbfbf8", 200: "#f4f4ef", 300: "#dedfd7", 400: "#c8cabf", 500: "#9a9c94", 600: "#6f7269", 900: "#23251f" },
  forest: { 100: "#e5eee7", 200: "#ccded1", 600: "#345b43", 800: "#244332" },
  apricot: { 100: "#fff0df", 400: "#efb178" },
  error: { 100: "#f9e9e6", 600: "#b55249" },
  warning: { 100: "#fff0df", 400: "#f4d567", 800: "#765312" },
};

export const fontSize = {
  8: "8px", 10: "10px", 12: "12px", 14: "14px", 18: "18px",
  24: "24px", 36: "36px", 48: "48px", 72: "72px",
};

// One scale for spacing and dimensions, including larger layout constraints.
export const spacing = {
  0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px", 12: "12px",
  16: "16px", 24: "24px", 32: "32px", 40: "40px", 48: "48px",
  64: "64px", 96: "96px", 128: "128px", 192: "192px", 256: "256px",
  320: "320px", 384: "384px", 512: "512px", 640: "640px", 768: "768px",
};

export const radius = { 0: "0px", 2: "2px", 4: "4px", 8: "8px", 12: "12px", 16: "16px", full: "50%", pill: "9999px" };
export const breakpoints = { mobile: spacing[640], tablet: "980px" };
export const fonts = { heading: '"Manrope", sans-serif', body: '"DM Sans", sans-serif', mono: '"DM Mono", monospace', resume: "Georgia, serif" };

export const alpha = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
export const shadows = {
  soft: `0 ${spacing[8]} ${spacing[32]} ${alpha(colors.paper[900], 0.08)}`,
  paper: `0 ${spacing[8]} ${spacing[32]} ${alpha(colors.paper[900], 0.13)}`,
  raised: `0 ${spacing[24]} ${spacing[64]} ${alpha(colors.paper[900], 0.25)}`,
};

export const Header = styled.h1`
  margin: 0;
  font-family: ${fonts.heading};
  font-size: ${fontSize[36]};
  font-weight: 700;
  line-height: 1.1;
`;
export const Header2 = styled.h2`
  margin: 0;
  font-family: ${fonts.heading};
  font-size: ${fontSize[24]};
  font-weight: 700;
  line-height: 1.2;
`;
export const Body = styled.p`
  margin: 0;
  font-family: ${fonts.body};
  font-size: ${fontSize[14]};
  line-height: 1.55;
`;
export const Text = styled.span`font: inherit;`;
export const Label = styled.span`
  font-family: ${fonts.body};
  font-size: ${fontSize[12]};
  font-weight: 600;
`;
export const Code = styled.code`
  font-family: ${fonts.mono};
  font-size: ${fontSize[14]};
  line-height: 1.6;
`;
export const Strong = styled.strong`font: inherit; font-weight: 700;`;
export const Emphasis = styled.em`font: inherit; font-style: italic;`;
export const Small = styled.small`font: inherit;`;
export const ListItem = styled.li`font: inherit;`;
