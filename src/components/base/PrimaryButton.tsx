import { colors, fontSize, spacing, radius } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const PrimaryButton = styled(Button)`
  display: inline-flex;
  height: ${spacing[32]};
  align-items: center;
  gap: ${spacing[8]};
  padding: 0 ${spacing[12]};
  border: 0;
  border-radius: ${radius[8]};
  color: ${colors.paper[0]};
  background: ${colors.forest[600]};
  font-size: ${fontSize[12]};
  font-weight: 700;

  &:hover { background: ${colors.forest[800]}; }
  &:disabled { cursor: not-allowed; opacity: 0.45; }
`;
