import styled, { css } from "styled-components";

export const colors = {
  modalShadow: "rgba(20, 24, 20, 0.25)",
  overlay: "rgba(24, 29, 24, 0.48)",
  resumeRule: "#222",
  resumeInk: "#10110f",
  previewSurface: "rgba(251, 251, 248, 0.92)",
  previewDot: "#cacbc3",
  previewCanvas: "#e5e5de",
  selection: "#ccded1",
  canvas: "#f4f4ef",
  gutterText: "#a2a59b",
  editorToolbar: "#f7f7f3",
  disabledSurface: "#f5f5f1",
  placeholder: "#9a9c94",
  issueShadow: "rgba(35, 37, 31, 0.06)",
  editorSurface: "#fafaf7",
  navSurface: "rgba(251, 251, 248, 0.85)",
  transparent: "transparent",
  white: "#ffffff",
  ink: "#23251f",
  inkMuted: "#6f7269",
  surface: "#fbfbf8",
  surfaceStrong: "#ffffff",
  border: "#dedfd7",
  borderStrong: "#c8cabf",
  forest: "#345b43",
  forestDark: "#244332",
  forestPale: "#e5eee7",
  apricot: "#efb178",
  apricotPale: "#fff0df",
  yellow: "#f4d567",
  red: "#b55249",
  redPale: "#f9e9e6",
  code: "#1f231f",
  codeMuted: "#7f887e",
  codeGreen: "#a9d8b3",
};

export const shadows = {
  soft: "0 10px 30px rgba(44, 48, 38, 0.08)",
  paper: "0 8px 28px rgba(35, 37, 31, 0.13)",
};

export const breakpoints = {
  tablet: "980px",
  mobile: "640px",
};

export const fonts = { heading: '"Manrope", sans-serif', body: '"DM Sans", sans-serif', mono: '"DM Mono", monospace', resume: "Georgia, serif" };
export const textSize = {
  s8: "8px",
  s8_5: "8.5px",
  s7: "7px",
  s7_5: "7.5px",
  s9: "9px",
  s10: "10px",
  s11: "11px",
  s12: "12px",
  s13: "13px",
  s14: "14px",
  s16: "16px",
  s19: "19px",
  s20: "20px",
  s21: "21px",
  hero: "clamp(36px, 6vw, 58px)",
};

export const typography = {
  resume: css`font-family: ${fonts.resume}; line-height: 1.55;`,
  body: css`font-family: ${fonts.body}; font-size: 14px; line-height: 1.55;`,
  header: css`font-family: ${fonts.heading}; font-size: 36px; font-weight: 700; line-height: 1.1;`,
  header2: css`font-family: ${fonts.heading}; font-size: 20px; font-weight: 700; line-height: 1.2;`,
  label: css`font-family: ${fonts.body}; font-size: 12px; font-weight: 600;`,
  code: css`font-family: ${fonts.mono}; font-size: 13px; line-height: 1.6;`,
};
export const Header = styled.h1`${typography.header} margin: 0;`;
export const Header2 = styled.h2`${typography.header2} margin: 0;`;
export const Body = styled.p`${typography.body} margin: 0;`;
export const Text = styled.span`font: inherit;`;
export const Label = styled.span`${typography.label}`;
export const Code = styled.code`${typography.code}`;
export const Strong = styled.strong`font: inherit; font-weight: 700;`;
export const Emphasis = styled.em`font: inherit; font-style: italic;`;
export const Small = styled.small`font: inherit;`;
export const ListItem = styled.li`font: inherit;`;
