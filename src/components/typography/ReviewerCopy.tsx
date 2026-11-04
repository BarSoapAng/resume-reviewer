import { colors, fontSize, Body } from "../../lib/style";
import styled from "styled-components";

export const ReviewerCopy = styled(Body).attrs({ as: "p" })`
  margin: 0;
  color: ${colors.paper[600]};
  font-size: ${fontSize[14]};
  line-height: 1.55;
`;
