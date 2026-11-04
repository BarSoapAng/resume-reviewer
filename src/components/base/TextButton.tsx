import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Button } from "./Button";

export const TextButton = styled(Button)`
  ${typography.body}
  padding: 6px 4px;
  border: 0;
  color: ${colors.inkMuted};
  background: ${colors.transparent};
  font-size: ${textSize.s11};
  font-weight: 600;
`;
