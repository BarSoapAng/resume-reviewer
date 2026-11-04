import { colors, fontSize, spacing, radius } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const PrimaryButton = styled(Button)`
  display: inline-flex;
  height: ${spacing.xl};
  align-items: center;
  gap: ${spacing.xs};
  padding: 0 ${spacing.sm};
  border: 0;
  border-radius: ${radius.sm};
  color: ${colors.paper[0]};
  background: ${colors.forest[600]};
  font-size: ${fontSize.xs};
  font-weight: 700;

  &:hover:not(:disabled) { background: ${colors.forest[800]}; }
  &:disabled { cursor: not-allowed; opacity: 0.45; }
`;
