import { fontSize, spacing, Label } from "../../lib/style";
import styled from "styled-components";

export const ToolTitle = styled(Label).attrs({ as: "div" })`
  display: flex;
  align-items: center;
  gap: ${spacing[8]};
  font-size: ${fontSize[12]};
  font-weight: 700;
`;
