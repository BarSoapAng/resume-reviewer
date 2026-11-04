import { colors, fontSize, spacing, radius, breakpoints, Text, Label } from "../../lib/style";
import styled from "styled-components";
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
        <FooterDownloadButton aria-label="Download .tex source" onClick={downloadSource}><Icon name="download" size={spacing[16]} /><Text>Download .tex</Text></FooterDownloadButton>
        <PrimaryButton disabled={reviewBusy || Boolean(reviewId)} onClick={() => void beginReview()}>
          <Icon name="sparkles" size={spacing[16]} /> {reviewId ? "Review active" : reviewBusy ? "Starting…" : "Start review"}
        </PrimaryButton>
      </FooterActions>
    </FooterBar>
  );
}

const FooterBar = styled.footer`
  display: flex;
  align-items: center;
  gap: ${spacing[16]};
  padding: 0 ${spacing[16]} 0 ${spacing[16]};
  border-top: ${spacing[1]} solid ${colors.paper[300]};
  background: ${colors.paper[0]};
`;

const CompileStatus = styled(Label).attrs({ as: "div" })`
  display: flex;
  align-items: center;
  gap: ${spacing[8]};
  color: ${colors.paper[600]};
  font-size: ${fontSize[12]};
  font-weight: 600;
`;

const StatusDot = styled(Text).attrs({ as: "span" }) <{ $state: "idle" | "compiling" | "success" | "error"; }>`
  width: ${spacing[8]};
  height: ${spacing[8]};
  border-radius: ${radius.full};
  background: ${({ $state }) => $state === "success" ? colors.forest[600] : $state === "error" ? colors.error[600] : $state === "compiling" ? colors.apricot[400] : colors.paper[600]};
  box-shadow: 0 0 0 ${spacing[4]} ${colors.forest[100]};
`;

const FooterHint = styled(Text).attrs({ as: "span" })`
  color: ${colors.paper[600]};
  font-size: ${fontSize[10]};

  @media (max-width: ${breakpoints.mobile}) { display: none; }
`;

const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing[4]};
  margin-left: auto;
`;

const FooterDownloadButton = styled(QuietButton)`
  @media (max-width: ${breakpoints.mobile}) {
    width: ${spacing[32]};
    padding: 0;
    justify-content: center;

    span { display: none; }
  }
`;
