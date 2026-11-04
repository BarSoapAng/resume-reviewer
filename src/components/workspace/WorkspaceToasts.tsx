import { useEffect, useState } from "react";
import styled from "styled-components";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { colors, spacing, radius, fontSize } from "../../lib/style";
import { IconButton } from "../base/IconButton";
import { Icon } from "../base/Icon";
import { safeReviewError } from "./errors";

export function WorkspaceToasts({ model }: { model: Pick<WorkspaceModel, "compileState" | "compileError" | "reviewError" | "setReviewError"> }) {
  const [dismissedCompile, setDismissedCompile] = useState<string>();
  const compileKey = model.compileState === "error" ? model.compileError ?? "diagnostics" : undefined;
  const [lastCompile, setLastCompile] = useState(compileKey);
  if (lastCompile !== compileKey) { setLastCompile(compileKey); setDismissedCompile(undefined); }
  useEffect(() => {
    if (!compileKey) return;
    const timer = window.setTimeout(() => setDismissedCompile(compileKey), 6000);
    return () => window.clearTimeout(timer);
  }, [compileKey]);
  const { reviewError, setReviewError } = model;
  useEffect(() => {
    if (!reviewError) return;
    const timer = window.setTimeout(() => setReviewError(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [reviewError, setReviewError]);
  return <Toasts aria-label="Notifications">
    {compileKey && dismissedCompile !== compileKey && <Toast role="alert"><span>We couldn’t compile this resume. Check the highlighted source and try again.</span><CloseButton aria-label="Dismiss compilation notification" onClick={() => setDismissedCompile(compileKey)}><Icon name="close" /></CloseButton></Toast>}
    {reviewError && <Toast role="alert"><span>{safeReviewError(reviewError)}</span><CloseButton aria-label="Dismiss review notification" onClick={() => setReviewError(undefined)}><Icon name="close" /></CloseButton></Toast>}
  </Toasts>;
}

const Toasts = styled.div`position: fixed; z-index: 60; top: ${spacing.sm}; right: ${spacing.sm}; width: min(360px, calc(100vw - 24px)); display: grid; gap: ${spacing.xs}; pointer-events: none;`;
const Toast = styled.div`position: relative; padding: ${spacing.sm} ${spacing.xxxl} ${spacing.sm} ${spacing.sm}; border: 1px solid ${colors.error[600]}; border-radius: ${radius.sm}; background: ${colors.paper[0]}; color: ${colors.paper[900]}; font-size: ${fontSize.xs}; box-shadow: 0 4px 20px #0002; pointer-events: auto; overflow-wrap: anywhere;`;
const CloseButton = styled(IconButton)`position: absolute; top: ${spacing.xxs}; right: ${spacing.xxs};`;
