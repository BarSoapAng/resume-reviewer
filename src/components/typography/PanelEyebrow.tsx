import styled from "styled-components";
import { Text, colors, textSize, typography } from "../../lib/style";

export const PanelEyebrow = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  color: ${colors.forest};
  font-size: ${textSize.s10};
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;
