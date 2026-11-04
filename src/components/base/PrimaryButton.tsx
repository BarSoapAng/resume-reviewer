import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Button } from "./Button";

export const PrimaryButton = styled(Button)`
  ${typography.body}
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  color: ${colors.white};
  background: ${colors.forest};
  font-size: ${textSize.s11};
  font-weight: 700;

  &:hover { background: ${colors.forestDark}; }
  &:disabled { cursor: not-allowed; opacity: 0.45; }
`;
