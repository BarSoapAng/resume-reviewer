import styled from "styled-components";
import { Header, fonts, textSize, typography } from "../lib/style";

export { PanelTitle };
const PanelTitle = styled(Header).attrs({ as: "h1" })`
  ${typography.body}
  margin: 0;
  font-family: ${fonts.heading};
  font-size: ${textSize.s20};
  line-height: 1.2;
  letter-spacing: -0.6px;
`;
