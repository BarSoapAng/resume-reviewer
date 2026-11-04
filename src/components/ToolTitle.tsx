import styled from "styled-components";
import { textSize, typography } from "../lib/style";

export { ToolTitle };
const ToolTitle = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: ${textSize.s12};
  font-weight: 700;
`;
