import styled from "styled-components";
import { colors, typography } from "../../lib/style";
import { Card } from "./Card";

export { EditCard };
const EditCard = styled(Card)`
  ${typography.body}
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
`;
