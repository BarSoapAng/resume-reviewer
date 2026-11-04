import { colors, spacing } from "../../lib/style";
import styled from "styled-components";

export const ToolHeader = styled.div`
  display: flex;
  min-height: ${spacing[48]};
  align-items: center;
  justify-content: space-between;
  gap: ${spacing[12]};
  padding: 0 ${spacing[12]} 0 ${spacing[16]};
  border-bottom: ${spacing[1]} solid ${colors.paper[300]};
  background: ${colors.paper[0]};
`;
