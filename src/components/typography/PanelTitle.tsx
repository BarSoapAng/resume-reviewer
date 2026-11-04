import { fontSize, fonts, Header } from "../../lib/style";
import styled from "styled-components";

export const PanelTitle = styled(Header).attrs({ as: "h1" })`
  margin: 0;
  font-family: ${fonts.heading};
  font-size: ${fontSize.md};
  line-height: 1.2;
  letter-spacing: -0.025em;
`;
