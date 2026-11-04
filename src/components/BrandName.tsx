import styled from "styled-components";
import { Text, fonts, textSize, typography } from "../lib/style";

export { BrandName };
const BrandName = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  font-family: ${fonts.heading};
  font-size: ${textSize.s19};
  font-weight: 700;
  letter-spacing: -0.6px;
`;
