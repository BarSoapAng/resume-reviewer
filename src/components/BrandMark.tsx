import styled from "styled-components";
import { Text, colors, typography } from "../lib/style";

export { BrandMark };
const BrandMark = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  color: ${colors.white};
  background: ${colors.forest};
`;
