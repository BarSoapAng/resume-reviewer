import { colors, fontSize, spacing, radius, alpha } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const QuietButton = styled(Button)`
  display: inline-flex;
  height: ${spacing[32]};
  align-items: center;
  gap: ${spacing[8]};
  padding: 0 ${spacing[8]};
  border: ${spacing[1]} solid ${alpha(colors.paper[0], 0)};
  border-radius: ${radius[8]};
  color: ${colors.paper[600]};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize[12]};
  font-weight: 600;

  &:hover { border-color: ${colors.paper[300]}; background: ${colors.paper[0]}; color: ${colors.paper[900]}; }
`;
