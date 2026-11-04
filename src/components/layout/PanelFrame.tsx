import { colors, breakpoints } from "../../lib/style";
import styled from "styled-components";

export const PanelFrame = styled.section<{ $mobileActive: boolean; }>`
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  background: ${colors.paper[100]};

  @media (max-width: ${breakpoints.tablet}) {
    display: ${({ $mobileActive }) => ($mobileActive ? "flex" : "none")};
  }
`;
