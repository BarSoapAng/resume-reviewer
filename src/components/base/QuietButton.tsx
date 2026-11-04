import { colors, fontSize, spacing, radius, alpha } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const QuietButton = styled(Button)`
  display: inline-flex;
  height: ${spacing.xl};
  align-items: center;
  gap: ${spacing.xs};
  padding: 0 ${spacing.xs};
  border: ${spacing.hairline} solid ${alpha(colors.paper[0], 0)};
  border-radius: ${radius.sm};
  color: ${colors.paper[600]};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize.xs};
  font-weight: 600;

  &:hover { border-color: ${colors.paper[300]}; background: ${colors.paper[0]}; color: ${colors.paper[900]}; }
`;
