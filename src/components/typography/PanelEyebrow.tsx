import { colors, fontSize, Text } from "../../lib/style";
import styled from "styled-components";

export const PanelEyebrow = styled(Text).attrs({ as: "span" })`
  color: ${colors.forest[600]};
  font-size: ${fontSize.xxs};
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;
