import { createGlobalStyle } from "styled-components";
import { colors, fonts, typography } from "./lib/style";

export const GlobalStyle = createGlobalStyle`
:root {
  ${typography.body}
  font-family: ${fonts.body};
  color: ${colors.ink};
  background: ${colors.canvas};
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid ${colors.forest};
  outline-offset: 2px;
}
`;
