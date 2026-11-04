import styled from "styled-components";
import { Label, Text, breakpoints, colors, textSize, typography } from "../../lib/style";
import { QuietButton } from "../base/QuietButton";
import { PrimaryButton } from "../base/PrimaryButton";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { Icon } from "../base/Icon";

export function WorkspaceFooter({ model }: {
  model: Pick<WorkspaceModel,
    "beginReview" | "compileState" | "diagnostics" | "downloadSource" | "reviewBusy" | "reviewId"
  >;
}) {
  const {
    beginReview,
    compileState,
    diagnostics,
    downloadSource,
    reviewBusy,
    reviewId,
  } = model;
  return (
    <FooterBar>
      <CompileStatus>
        <StatusDot $state={compileState} /> {compileState === "success" ? "Compiled" : compileState === "compiling" ? "Compiling…" : compileState === "error" ? "Compile failed" : "Ready to compile"}
      </CompileStatus>
      <FooterHint>{diagnostics.length ? `${diagnostics.length} compiler diagnostic${diagnostics.length === 1 ? "" : "s"}` : "Changes are saved locally"}</FooterHint>
      <FooterActions>
        <FooterDownloadButton aria-label="Download .tex source" onClick={downloadSource}><Icon name="download" size={15} /><Text>Download .tex</Text></FooterDownloadButton>
        <PrimaryButton disabled={reviewBusy || Boolean(reviewId)} onClick={() => void beginReview()}>
          <Icon name="sparkles" size={15} /> {reviewId ? "Review active" : reviewBusy ? "Starting…" : "Start review"}
        </PrimaryButton>
      </FooterActions>
    </FooterBar>
  );
}

const FooterBar = styled.footer`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 14px 0 18px;
  border-top: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const CompileStatus = styled(Label).attrs({ as: "div" })`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 7px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};
  font-weight: 600;
`;

const StatusDot = styled(Text).attrs({ as: "span" }) <{ $state: "idle" | "compiling" | "success" | "error"; }>`
  ${typography.body}
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $state }) => $state === "success" ? colors.forest : $state === "error" ? colors.red : $state === "compiling" ? colors.apricot : colors.inkMuted};
  box-shadow: 0 0 0 3px ${colors.forestPale};
`;

const FooterHint = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  color: ${colors.inkMuted};
  font-size: ${textSize.s10};

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const FooterActions = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
`;

const FooterDownloadButton = styled(QuietButton)`
  @media (max-width: ${breakpoints.mobile}) {
    width: 32px;
    padding: 0;
    justify-content: center;

    span { display: none; }
  }
`;
