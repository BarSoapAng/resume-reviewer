import styled, { keyframes } from "styled-components";
import { colors } from "../../lib/style";

const spin = keyframes`to { transform: rotate(360deg); }`;

export const Loader = styled.span.attrs({ "aria-hidden": true })`
  display: inline-block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 2px solid ${colors.forestPale};
  border-top-color: ${colors.forest};
  border-radius: 50%;
  animation: ${spin} 800ms linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
