import { colors, fontSize, spacing, alpha } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const TextButton = styled(Button)`
  padding: ${spacing[8]} ${spacing[4]};
  border: 0;
  color: ${colors.paper[600]};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize[12]};
  font-weight: 600;
`;
