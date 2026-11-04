import { colors } from "../../lib/style";
import styled from "styled-components";

export const Button = styled.button`
  color: ${colors.paper[900]};
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.45; }
`;
