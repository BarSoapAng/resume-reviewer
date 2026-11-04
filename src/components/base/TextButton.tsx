import { colors, fontSize, spacing, alpha } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const TextButton = styled(Button)`
  padding: ${spacing.xs} ${spacing.xxs};
  border: 0;
  color: ${colors.paper[600]};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize.xs};
  font-weight: 600;
`;
