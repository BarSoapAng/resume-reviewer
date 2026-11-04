import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Textarea } from "./Textarea";

export { ComposerInput };
const ComposerInput = styled(Textarea)`
  ${typography.body}
  display: block;
  width: 100%;
  min-height: 68px;
  padding: 12px 43px 12px 12px;
  resize: none;
  border: 0;
  color: ${colors.ink};
  background: ${colors.transparent};
  font-size: ${textSize.s12};
  line-height: 1.45;

  &::placeholder { color: ${colors.placeholder}; }
  &:focus-visible { outline: none; }
  &:disabled { cursor: not-allowed; background: ${colors.disabledSurface}; }
`;
