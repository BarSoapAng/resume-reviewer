import styled from "styled-components";
import { colors, shadows, typography } from "../../lib/style";
import { Card } from "./Card";

export { ImportCard };
const ImportCard = styled(Card)`
  ${typography.body}
  width: min(100%, 650px);
  margin-top: 35px;
  padding: 15px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 14px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};
  text-align: left;
`;
