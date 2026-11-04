import { colors, fontSize, spacing, fonts } from "./lib/style";
import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
:root {
  font-size: ${fontSize[14]};
  line-height: 1.55;
  font-family: ${fonts.body};
  color: ${colors.paper[900]};
  background: ${colors.paper[200]};
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
  min-width: ${spacing[320]};
  min-height: 100%;
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: ${spacing[2]} solid ${colors.forest[600]};
  outline-offset: ${spacing[2]};
}
`;
