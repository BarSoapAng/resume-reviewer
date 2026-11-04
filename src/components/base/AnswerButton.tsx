import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Button } from "./Button";

export { AnswerButton };
const AnswerButton = styled(Button)`
  ${typography.body}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  border: 0;
  border-radius: 6px;
  color: ${colors.white};
  background: ${colors.forest};
  font-size: ${textSize.s11};
  font-weight: 700;
`;
