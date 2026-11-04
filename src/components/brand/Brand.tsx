import { Icon } from "../base/Icon";
import styled from "styled-components";
import { Text, colors, fonts, textSize, typography } from "../../lib/style";

const BrandRoot = styled.div`
  ${typography.body}
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 9px;
  padding: 0;
  border: 0;
  color: inherit;
  background: none;
`;

export function Brand() {
  return <BrandRoot><BrandMark><Icon name="sparkles" size={17} /></BrandMark><BrandName>Aria</BrandName></BrandRoot>;
}

const BrandName = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  font-family: ${fonts.heading};
  font-size: ${textSize.s19};
  font-weight: 700;
  letter-spacing: -0.6px;
`;

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

