import { colors, fontSize, spacing, radius, fonts, Text } from "../../lib/style";
import { Icon } from "../base/Icon";
import styled from "styled-components";

const BrandRoot = styled.div`
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: ${spacing[8]};
  padding: 0;
  border: 0;
  color: inherit;
  background: none;
`;

export function Brand() {
  return <BrandRoot><BrandMark><Icon name="sparkles" size={spacing[16]} /></BrandMark><BrandName>Aria</BrandName></BrandRoot>;
}

const BrandName = styled(Text).attrs({ as: "span" })`
  font-family: ${fonts.heading};
  font-size: ${fontSize[18]};
  font-weight: 700;
  letter-spacing: -0.025em;
`;

const BrandMark = styled(Text).attrs({ as: "span" })`
  display: grid;
  width: ${spacing[32]};
  height: ${spacing[32]};
  place-items: center;
  border-radius: ${radius[8]};
  color: ${colors.paper[0]};
  background: ${colors.forest[600]};
`;

