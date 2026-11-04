import { colors, fontSize, spacing, alpha } from "../../lib/style";
import styled from "styled-components";
import { Button } from "./Button";

export const TextButton = styled(Button)`
  display: inline-block;
  flex: 0 0 auto;
  width: fit-content;
  justify-self: start;
  align-self: center;
  padding: 0;
  border: 0;
  color: ${colors.paper[600]};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize.xs};
  font-weight: 600;
  text-underline-offset: ${spacing.xxxs};
  &:hover, &:active { text-decoration: underline; }
  &:focus-visible { outline: 2px solid ${colors.forest[600]}; outline-offset: ${spacing.xxxs}; }
`;
