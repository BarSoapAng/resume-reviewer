import styled from "styled-components";
import { Body, colors, textSize, typography } from "../../lib/style";

export const ReviewerCopy = styled(Body).attrs({ as: "p" })`
  ${typography.body}
  margin: 0;
  color: ${colors.inkMuted};
  font-size: ${textSize.s13};
  line-height: 1.55;
`;
