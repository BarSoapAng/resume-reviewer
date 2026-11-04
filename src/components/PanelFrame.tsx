import styled from "styled-components";
import { colors, breakpoints, typography } from "../lib/style";

export { PanelFrame };
const PanelFrame = styled.section<{ $mobileActive: boolean }>`
  ${typography.body}
  display: flex;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  background: ${colors.surface};

  @media (max-width: ${breakpoints.tablet}) {
    display: ${({ $mobileActive }) => ($mobileActive ? "flex" : "none")};
  }
`;
