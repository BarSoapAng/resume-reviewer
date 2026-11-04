import { fontSize, spacing, Label } from "../../lib/style";
import styled from "styled-components";

export const ToolTitle = styled(Label).attrs({ as: "div" })`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  font-size: ${fontSize.xs};
  font-weight: 700;
`;
