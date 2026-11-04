import { colors, spacing } from "../../lib/style";
import styled from "styled-components";

export const ToolHeader = styled.div`
  display: flex;
  min-height: ${spacing.xxxl};
  align-items: center;
  justify-content: space-between;
  gap: ${spacing.sm};
  padding: 0 ${spacing.sm} 0 ${spacing.md};
  border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[0]};
`;
