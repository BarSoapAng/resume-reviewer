import styled from "styled-components";

export const colors = {
  paper: { 0: "#ffffff", 100: "#fbfbf8", 200: "#f4f4ef", 300: "#dedfd7", 400: "#c8cabf", 500: "#9a9c94", 600: "#6f7269", 900: "#23251f" },
  forest: { 100: "#e5eee7", 200: "#ccded1", 600: "#345b43", 800: "#244332" },
  apricot: { 100: "#fff0df", 400: "#efb178" },
  error: { 100: "#f9e9e6", 600: "#b55249" },
  warning: { 100: "#fff0df", 400: "#f4d567", 800: "#765312" },
};

export const fontSize = {
  xxxs: "8px", xxs: "10px", xs: "12px", sm: "14px", md: "18px",
  lg: "24px", xl: "36px", xxl: "48px", xxxl: "72px",
};

// One scale for spacing and dimensions, including larger layout constraints.
export const spacing = {
  none: "0px", hairline: "1px", xxxs: "2px", xxs: "4px", xs: "8px", sm: "12px",
  md: "16px", lg: "24px", xl: "32px", xxl: "40px", xxxl: "48px",
  "4xl": "64px", "5xl": "96px", "6xl": "128px", "7xl": "192px", "8xl": "256px",
  "9xl": "320px", "10xl": "384px", "11xl": "512px", "12xl": "640px", "13xl": "768px",
};

export const radius = { none: "0px", xxs: "2px", xs: "4px", sm: "8px", md: "12px", lg: "16px", full: "50%", pill: "9999px" };
export const breakpoints = { mobile: spacing["12xl"], tablet: "980px" };
export const fonts = { heading: '"Manrope", sans-serif', body: '"DM Sans", sans-serif', mono: '"DM Mono", monospace', resume: "Georgia, serif" };

export const alpha = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
export const shadows = {
  soft: `0 ${spacing.xs} ${spacing.xl} ${alpha(colors.paper[900], 0.08)}`,
  paper: `0 ${spacing.xs} ${spacing.xl} ${alpha(colors.paper[900], 0.13)}`,
  raised: `0 ${spacing.lg} ${spacing["4xl"]} ${alpha(colors.paper[900], 0.25)}`,
};

export const Header = styled.h1`
  margin: 0;
  font-family: ${fonts.heading};
  font-size: ${fontSize.xl};
  font-weight: 700;
  line-height: 1.1;
`;
export const Header2 = styled.h2`
  margin: 0;
  font-family: ${fonts.heading};
  font-size: ${fontSize.lg};
  font-weight: 700;
  line-height: 1.2;
`;
export const Body = styled.p`
  margin: 0;
  font-family: ${fonts.body};
  font-size: ${fontSize.sm};
  line-height: 1.55;
`;
export const Text = styled.span`font: inherit;`;
export const Label = styled.span`
  font-family: ${fonts.body};
  font-size: ${fontSize.xs};
  font-weight: 600;
`;
export const Code = styled.code`
  font-family: ${fonts.mono};
  font-size: ${fontSize.sm};
  line-height: 1.6;
`;
export const Strong = styled.strong`font: inherit; font-weight: 700;`;
export const Emphasis = styled.em`font: inherit; font-style: italic;`;
export const Small = styled.small`font: inherit;`;
export const ListItem = styled.li`font: inherit;`;
