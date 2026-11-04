import styled from "styled-components";
import { colors, fonts, textSize, typography } from "../../lib/style";
import { Textarea } from "./Textarea";

export { ImportTextarea };
const ImportTextarea = styled(Textarea)`
  ${typography.body}
  width: 100%;
  min-height: 190px;
  padding: 13px;
  resize: vertical;
  border: 1px solid ${colors.border};
  border-radius: 9px;
  color: ${colors.code};
  background: ${colors.editorSurface};
  font-family: ${fonts.mono};
  font-size: ${textSize.s11};
  line-height: 1.55;
`;
