import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Button } from "./Button";

export { AuthButton };
const AuthButton = styled(Button)`
  ${typography.body}
  min-height: 40px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 8px;
  color: ${colors.ink};
  background: ${colors.surfaceStrong};
  font-size: ${textSize.s12};
  font-weight: 700;

  &:hover { border-color: ${colors.forest}; background: ${colors.forestPale}; }
`;
