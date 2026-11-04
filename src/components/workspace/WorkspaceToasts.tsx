import { useState } from "react";
import styled from "styled-components";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { colors, spacing, radius, fontSize } from "../../lib/style";
import { TextButton } from "../base/TextButton";
import { safeReviewError } from "./errors";

export function WorkspaceToasts({ model }: { model: Pick<WorkspaceModel, "compileState" | "compileError" | "reviewError" | "setReviewError"> }) {
  const [dismissedCompile, setDismissedCompile] = useState<string>();
  const compileKey = model.compileState === "error" ? model.compileError ?? "diagnostics" : undefined;
  const [lastCompile, setLastCompile] = useState(compileKey);
  if (lastCompile !== compileKey) { setLastCompile(compileKey); setDismissedCompile(undefined); }
  return <Toasts aria-label="Notifications">
    {compileKey && dismissedCompile !== compileKey && <Toast role="alert"><span>We couldn’t compile this resume. Check the highlighted source and try again.</span><TextButton aria-label="Dismiss compilation notification" onClick={() => setDismissedCompile(compileKey)}>Dismiss</TextButton></Toast>}
    {model.reviewError && <Toast role="alert"><span>{safeReviewError(model.reviewError)}</span><TextButton aria-label="Dismiss review notification" onClick={() => model.setReviewError(undefined)}>Dismiss</TextButton></Toast>}
  </Toasts>;
}

const Toasts = styled.div`position: fixed; z-index: 60; top: ${spacing.sm}; right: ${spacing.sm}; width: min(360px, calc(100vw - 24px)); display: grid; gap: ${spacing.xs}; pointer-events: none;`;
const Toast = styled.div`display: grid; gap: ${spacing.xs}; padding: ${spacing.sm}; border: 1px solid ${colors.error[600]}; border-radius: ${radius.sm}; background: ${colors.paper[0]}; color: ${colors.paper[900]}; font-size: ${fontSize.xs}; box-shadow: 0 4px 20px #0002; pointer-events: auto; overflow-wrap: anywhere;`;
