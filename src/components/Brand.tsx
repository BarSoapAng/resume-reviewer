import styled from "styled-components";
import { typography } from "../lib/style";

export { Brand };
const Brand = styled.div`
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
