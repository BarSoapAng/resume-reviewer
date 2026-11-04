import styled from "styled-components";
import { colors, typography } from "../../lib/style";
import { Button } from "./Button";

export { IconButton };
const IconButton = styled(Button)`
  ${typography.body}
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 7px;
  color: ${colors.inkMuted};
  background: ${colors.transparent};

  &:hover { border-color: ${colors.border}; background: ${colors.surfaceStrong}; color: ${colors.ink}; }
  &:disabled { cursor: not-allowed; opacity: 0.4; }
`;
