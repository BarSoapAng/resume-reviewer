import styled from "styled-components";
import { colors, shadows, typography } from "../../lib/style";
import { Card } from "./Card";

export { Composer };
const Composer = styled(Card)`
  ${typography.body}
  position: relative;
  margin: auto 14px 14px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};

  &:focus-within {
    border-color: ${colors.forest};
    box-shadow: 0 0 0 2px ${colors.forestPale};
  }
`;
