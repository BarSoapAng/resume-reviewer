import { colors, spacing, radius } from "../../lib/style";
import styled, { keyframes } from "styled-components";

const spin = keyframes`to { transform: rotate(360deg); }`;

export const Loader = styled.span.attrs({ "aria-hidden": true })`
  display: inline-block;
  width: ${spacing.md};
  height: ${spacing.md};
  flex-shrink: 0;
  border: ${spacing.xxxs} solid ${colors.forest[100]};
  border-top-color: ${colors.forest[600]};
  border-radius: ${radius.full};
  animation: ${spin} 800ms linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
