import styled from "styled-components";
import { colors, typography } from "../lib/style";

export { ToolHeader };
const ToolHeader = styled.div`
  ${typography.body}
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px 0 15px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;
