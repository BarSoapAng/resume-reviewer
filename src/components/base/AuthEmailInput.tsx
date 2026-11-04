import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Input } from "./Input";

export { AuthEmailInput };
const AuthEmailInput = styled(Input)`
  ${typography.body}
  min-height: 40px;
  padding: 0 11px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 8px;
  color: ${colors.ink};
  background: ${colors.surfaceStrong};
  font-size: ${textSize.s12};
`;
