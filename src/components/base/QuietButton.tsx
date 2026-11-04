import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Button } from "./Button";

export const QuietButton = styled(Button)`
  ${typography.body}
  display: inline-flex;
  height: 31px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: ${colors.inkMuted};
  background: ${colors.transparent};
  font-size: ${textSize.s11};
  font-weight: 600;

  &:hover { border-color: ${colors.border}; background: ${colors.surfaceStrong}; color: ${colors.ink}; }
`;
