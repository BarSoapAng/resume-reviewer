import styled from "styled-components";
import { colors, textSize, typography } from "../../lib/style";
import { Dropdown } from "./Dropdown";

export { Discipline };
const Discipline = styled(Dropdown)`
  ${typography.body}
  padding: 5px 8px;
  border: 1px solid ${colors.border};
  border-radius: 7px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;
