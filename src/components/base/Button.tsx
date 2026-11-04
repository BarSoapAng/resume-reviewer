import styled from "styled-components";
import { colors, typography } from "../../lib/style";

export const Button = styled.button`
  ${typography.body}
  color: ${colors.ink};
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.45; }
`;
