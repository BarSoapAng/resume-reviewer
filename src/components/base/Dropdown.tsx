import { colors, fontSize, spacing, radius } from "../../lib/style";
import styled from "styled-components";
import type { SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

export function Dropdown(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <DropdownRoot><Select {...props} /><Chevron><Icon name="chevron-down" size={12} /></Chevron></DropdownRoot>;
}

const DropdownRoot = styled.span`position: relative; display: inline-flex; min-width: 0; max-width: 100%;`;
const Chevron = styled.span`position: absolute; right: ${spacing.xs}; top: 50%; transform: translateY(-50%); display: flex; pointer-events: none; color: ${colors.paper[600]};`;
const Select = styled.select`
  appearance: none;
  min-width: 0;
  max-width: 100%;
  height: ${spacing.xl};
  padding: 0 ${spacing.lg} 0 ${spacing.xs};
  border: 1px solid ${colors.paper[300]};
  border-radius: ${radius.sm};
  color: ${colors.paper[900]};
  background: ${colors.paper[100]};
  font: inherit;
  font-size: ${fontSize.xs};
  cursor: pointer;
  &:hover:not(:disabled) { border-color: ${colors.paper[400]}; }
  &:focus-visible { outline: 2px solid ${colors.forest[600]}; outline-offset: 2px; }
  &:disabled { cursor: not-allowed; opacity: 0.45; }
  option { color: ${colors.paper[900]}; background: ${colors.paper[0]}; }
`;
