import styled from "styled-components";
import { Label, textSize, typography } from "../../lib/style";

export const ToolTitle = styled(Label).attrs({ as: "div" })`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: ${textSize.s12};
  font-weight: 700;
`;
