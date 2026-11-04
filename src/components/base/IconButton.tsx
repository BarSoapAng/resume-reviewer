import { colors, spacing, radius, alpha } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const IconButton = styled(Button)`
  display: grid;
  width: ${spacing[32]};
  height: ${spacing[32]};
  padding: 0;
  place-items: center;
  border: ${spacing[1]} solid ${alpha(colors.paper[0], 0)};
  border-radius: ${radius[8]};
  color: ${colors.paper[600]};
  background: ${alpha(colors.paper[0], 0)};

  &:hover { border-color: ${colors.paper[300]}; background: ${colors.paper[0]}; color: ${colors.paper[900]}; }
  &:disabled { cursor: not-allowed; opacity: 0.4; }
`;
