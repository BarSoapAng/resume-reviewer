import { Textarea } from "../base/Textarea";
import { Card } from "../base/Card";
import { Button } from "../base/Button";
import styled from "styled-components";
import { Body, Code, Label, Strong, Text, colors, shadows, textSize, typography } from "../../lib/style";
import { PanelFrame } from "../layout/PanelFrame";
import { IconButton } from "../base/IconButton";
import { PanelTitle } from "../typography/PanelTitle";
import { PanelEyebrow } from "../typography/PanelEyebrow";
import { ReviewerCopy } from "../typography/ReviewerCopy";
import { TextButton } from "../base/TextButton";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import { Icon } from "../base/Icon";

export function ReviewPanel({ model }: {
  model: Pick<WorkspaceModel,
    "activeTab" | "beginReview" | "checkoutPending" | "openCheckout" | "edits" | "isDemoResume" | "issues" | "message" | "messages" | "paymentRequired" | "resolveIssue" | "reviewBusy" | "reviewError" | "reviewId" | "reviewState" | "selectIssue" | "selectedIssue" | "sendMessage" | "setActiveTab" | "setMessage" | "setReviewOpen" | "unresolvedCount" | "updateEdit"
  >;
}) {
  const {
    activeTab,
    beginReview,
    checkoutPending,
    openCheckout,
    edits,
    isDemoResume,
    issues,
    message,
    messages,
    paymentRequired,
    resolveIssue,
    reviewBusy,
    reviewError,
    reviewId,
    reviewState,
    selectIssue,
    selectedIssue,
    sendMessage,
    setActiveTab,
    setMessage,
    setReviewOpen,
    unresolvedCount,
    updateEdit,
  } = model;
  return (
    <PanelFrame $mobileActive={activeTab === "review"} aria-labelledby="workspace-tab-review" id="workspace-panel-review" role="tabpanel">
      <PanelHeader>
        <PanelTitleWrap>
          <PanelEyebrow>{isDemoResume && !reviewId ? "AI reviewer · Demo" : `AI reviewer · ${reviewState.replaceAll("_", " ")}`}</PanelEyebrow>
          <PanelTitle>{reviewBusy ? "Reviewing your evidence…" : "Let’s make this stronger."}</PanelTitle>
        </PanelTitleWrap>
        <IconButton aria-label="Collapse review panel" onClick={() => {
          setReviewOpen(false);
          setActiveTab("source");
        }} title="Collapse panel">
          <Icon name="collapse" size={16} />
        </IconButton>
      </PanelHeader>
      <ReviewBody>
        {!isDemoResume && !reviewId && (
          <UnavailableNotice>
            <ReviewerIcon><Icon name="sparkles" size={16} /></ReviewerIcon>
            <div>
              <ReviewerName>Review not started</ReviewerName>
              <ReviewerCopy>Your source is ready. Sign in and start a review when you want structured feedback.</ReviewerCopy>
            </div>
          </UnavailableNotice>
        )}
        {issues.length > 0 && <>
          <ReviewerIntro>
            <ReviewerIcon><Icon name="sparkles" size={16} /></ReviewerIcon>
            <div>
              <ReviewerName>Aria reviewer</ReviewerName>
              <ReviewerCopy>
                I found {unresolvedCount} {unresolvedCount === 1 ? "area" : "areas"} worth strengthening. I’ll ask before adding any facts.
              </ReviewerCopy>
            </div>
          </ReviewerIntro>

          <ProgressRow>
            <ProgressText>Initial review</ProgressText>
            <ProgressCount>{issues.length - unresolvedCount} of {issues.length} addressed</ProgressCount>
          </ProgressRow>
          <ProgressTrack><ProgressFill $progress={issues.length ? ((issues.length - unresolvedCount) / issues.length) * 100 : 0} /></ProgressTrack>

          <SectionLabel>Priority feedback</SectionLabel>
          <IssueList>
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                $active={selectedIssue?.id === issue.id}
                $resolved={issue.status === "resolved" || issue.status === "skipped"}
              >
                <IssueSummaryButton
                  aria-expanded={selectedIssue?.id === issue.id}
                  onClick={() => selectIssue(issue)}
                >
                  <IssueTopline>
                    <Severity $severity={issue.severity}>
                      {issue.status === "resolved" || issue.status === "skipped" ? issue.status : issue.severity}
                    </Severity>
                    <Text>{issue.location}</Text>
                  </IssueTopline>
                  <IssueTitle>{issue.label}</IssueTitle>
                </IssueSummaryButton>
                {selectedIssue?.id === issue.id && (
                  <IssueExpanded>
                    <Body>{issue.detail}</Body>
                    <QuestionBlock>
                      <QuestionLabel>One thing I’d ask</QuestionLabel>
                      {issue.question}
                    </QuestionBlock>
                    <IssueActions>
                      <TextButton onClick={resolveIssue}>Skip for now</TextButton>
                      <AnswerButton onClick={() => document.getElementById("review-message")?.focus()}>
                        Answer <Icon name="arrow" size={15} />
                      </AnswerButton>
                    </IssueActions>
                  </IssueExpanded>
                )}
              </IssueCard>
            ))}
          </IssueList>

          {messages.map((item, index) => item.role === "user" ? (
            <UserMessage key={`${item.content}-${index}`}>{item.content}</UserMessage>
          ) : (
            <AssistantMessage key={`${item.content}-${index}`}>{item.content}</AssistantMessage>
          ))}
          {edits.filter((edit) => edit.status === "pending" || edit.status === "stale").map((edit) => (
            <EditCard key={edit.id}>
              <QuestionLabel>Proposed edit</QuestionLabel>
              <DiffLine $removed>- {edit.oldText}</DiffLine>
              <DiffLine>+ {edit.newText}</DiffLine>
              <ReviewerCopy>{edit.explanation}</ReviewerCopy>
              <IssueActions>
                <TextButton onClick={() => void updateEdit(edit, "reject")}>Reject</TextButton>
                <AnswerButton disabled={edit.status === "stale"} onClick={() => void updateEdit(edit, "accept")}>
                  {edit.status === "stale" ? "Outdated" : "Accept"}
                </AnswerButton>
              </IssueActions>
            </EditCard>
          ))}
          {reviewError && <ErrorNotice role="alert">{reviewError}</ErrorNotice>}
          {paymentRequired && (
            <PaymentCard>
              <Strong>Pay what you want, starting at $1</Strong>
              <Text>Choose your amount in Stripe. One payment unlocks one complete review.</Text>
              <AnswerButton disabled={checkoutPending} onClick={() => void openCheckout()}>{checkoutPending ? "Opening checkout..." : "Continue to Stripe"}</AnswerButton>
              <TextButton onClick={() => void beginReview()}>I’ve paid — check again</TextButton>
            </PaymentCard>
          )}
        </>}
      </ReviewBody>
      <Composer>
        <ComposerInput
          id="review-message"
          aria-label="Reply to reviewer"
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          disabled={!reviewId || reviewBusy}
          placeholder={reviewId ? "Answer the reviewer…" : "Start a review to answer questions"}
          rows={2}
          value={message}
        />
        <SendButton aria-label="Send message" disabled={!reviewId || reviewBusy || !message.trim()} onClick={() => void sendMessage()}>
          <Icon name="arrow" size={17} />
        </SendButton>
      </Composer>
    </PanelFrame>
  );
}

const PanelHeader = styled.div`
  ${typography.body}
  display: flex;
  min-height: 104px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px 17px;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceStrong};
`;

const PanelTitleWrap = styled.div`
  ${typography.body}
  display: grid;
  gap: 7px;
`;

const ReviewBody = styled.div`
  ${typography.body}
  min-height: 0;
  padding: 18px;
  overflow: auto;
  scrollbar-width: thin;
`;

const ReviewerIntro = styled.div`
  ${typography.body}
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 11px;
  padding-bottom: 17px;
`;

const UnavailableNotice = styled(ReviewerIntro)`
  padding: 13px;
  border: 1px solid ${colors.border};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
`;

const ReviewerIcon = styled.div`
  ${typography.body}
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 9px;
  color: ${colors.forest};
  background: ${colors.forestPale};
`;

const ReviewerName = styled(Text).attrs({ as: "div" })`
  ${typography.body}
  margin: 1px 0 5px;
  font-size: ${textSize.s12};
  font-weight: 700;
`;

const ProgressRow = styled.div`
  ${typography.body}
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
`;

const ProgressText = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  font-size: ${textSize.s11};
  font-weight: 700;
`;

const ProgressCount = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  color: ${colors.inkMuted};
  font-size: ${textSize.s11};
`;

const ProgressTrack = styled.div`
  ${typography.body}
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: ${colors.border};
`;

const ProgressFill = styled.div<{ $progress: number; }>`
  ${typography.body}
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  border-radius: inherit;
  background: ${colors.forest};
  transition: width 220ms ease;
`;

const SectionLabel = styled(Label).attrs({ as: "div" })`
  ${typography.body}
  margin: 23px 0 10px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s10};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const IssueList = styled.div`
  ${typography.body}
  display: grid;
  gap: 8px;
`;

const IssueCard = styled.div<{ $active: boolean; $resolved: boolean; }>`
  ${typography.body}
  width: 100%;
  border: 1px solid ${({ $active }) => ($active ? colors.forest : colors.border)};
  border-radius: 10px;
  color: inherit;
  background: ${({ $active, $resolved }) => ($resolved ? colors.forestPale : $active ? colors.surfaceStrong : colors.transparent)};
  box-shadow: ${({ $active }) => ($active ? `0 4px 16px ${colors.issueShadow}` : "none")};
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;

  &:hover { border-color: ${colors.borderStrong}; }
`;

const IssueSummaryButton = styled(Button)`
  ${typography.body}
  width: 100%;
  padding: 13px;
  border: 0;
  color: inherit;
  background: ${colors.transparent};
  text-align: left;
`;

const IssueTopline = styled(Label).attrs({ as: "div" })`
  ${typography.body}
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s10};
  white-space: nowrap;
  overflow: hidden;

  span:last-child { overflow: hidden; text-overflow: ellipsis; }
`;

const Severity = styled(Text).attrs({ as: "span" }) <{ $severity: string; }>`
  ${typography.body}
  flex: 0 0 auto;
  padding: 3px 6px;
  border-radius: 4px;
  color: ${({ $severity }) => ($severity === "high" ? colors.red : colors.forestDark)};
  background: ${({ $severity }) => ($severity === "high" ? colors.redPale : colors.apricotPale)};
  font-size: ${textSize.s9};
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const IssueTitle = styled(Text).attrs({ as: "div" })`
  ${typography.body}
  margin-top: 9px;
  font-size: ${textSize.s13};
  font-weight: 700;
`;

const IssueExpanded = styled.div`
  ${typography.body}
  padding: 0 13px 13px;

  > p { margin: 0; color: ${colors.inkMuted}; font-size: ${textSize.s12}; line-height: 1.5; }
`;

const QuestionBlock = styled(Body).attrs({ as: "div" })`
  ${typography.body}
  margin-top: 11px;
  padding: 11px;
  border-left: 2px solid ${colors.apricot};
  border-radius: 0 6px 6px 0;
  background: ${colors.apricotPale};
  font-size: ${textSize.s12};
  line-height: 1.45;
`;

const QuestionLabel = styled(Text).attrs({ as: "span" })`
  ${typography.body}
  display: block;
  margin-bottom: 4px;
  color: ${colors.inkMuted};
  font-size: ${textSize.s9};
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const IssueActions = styled.div`
  ${typography.body}
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 11px;
`;

const UserMessage = styled(Body).attrs({ as: "div" })`
  ${typography.body}
  max-width: 88%;
  margin: 14px 0 0 auto;
  padding: 10px 12px;
  border-radius: 10px 10px 2px 10px;
  color: ${colors.white};
  background: ${colors.forest};
  font-size: ${textSize.s12};
  line-height: 1.45;
`;

const AssistantMessage = styled(Body).attrs({ as: "div" })`
  ${typography.body}
  max-width: 92%;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid ${colors.border};
  border-radius: 2px 10px 10px 10px;
  background: ${colors.surfaceStrong};
  font-size: ${textSize.s12};
  line-height: 1.5;
`;

const DiffLine = styled(Code).attrs({ as: "code" }) <{ $removed?: boolean; }>`
  ${typography.body}
  display: block;
  padding: 7px 8px;
  border-radius: 5px;
  color: ${({ $removed }) => ($removed ? colors.red : colors.forestDark)};
  background: ${({ $removed }) => ($removed ? colors.redPale : colors.forestPale)};
  font-size: ${textSize.s10};
  line-height: 1.45;
  white-space: pre-wrap;
`;

const ErrorNotice = styled(Body).attrs({ as: "p" })`
  ${typography.body}
  margin: 14px 0 0;
  padding: 10px;
  border-radius: 7px;
  color: ${colors.red};
  background: ${colors.redPale};
  font-size: ${textSize.s11};
  line-height: 1.45;
`;

const PaymentCard = styled.div`
  ${typography.body}
  display: grid;
  gap: 9px;
  margin-top: 10px;
  padding: 13px;
  border: 1px solid ${colors.apricot};
  border-radius: 9px;
  background: ${colors.apricotPale};
  font-size: ${textSize.s11};
  line-height: 1.45;

  span { color: ${colors.inkMuted}; }
`;

const SendButton = styled(Button)`
  ${typography.body}
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  width: 29px;
  height: 29px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 7px;
  color: ${colors.white};
  background: ${colors.forest};

  &:disabled { cursor: default; opacity: 0.35; }
`;

const AnswerButton = styled(Button)`
  ${typography.body}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  border: 0;
  border-radius: 6px;
  color: ${colors.white};
  background: ${colors.forest};
  font-size: ${textSize.s11};
  font-weight: 700;
`;

const EditCard = styled(Card)`
  ${typography.body}
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
`;

const Composer = styled(Card)`
  ${typography.body}
  position: relative;
  margin: auto 14px 14px;
  border: 1px solid ${colors.borderStrong};
  border-radius: 10px;
  background: ${colors.surfaceStrong};
  box-shadow: ${shadows.soft};

  &:focus-within {
    border-color: ${colors.forest};
    box-shadow: 0 0 0 2px ${colors.forestPale};
  }
`;

const ComposerInput = styled(Textarea)`
  ${typography.body}
  display: block;
  width: 100%;
  min-height: 68px;
  padding: 12px 43px 12px 12px;
  resize: none;
  border: 0;
  color: ${colors.ink};
  background: ${colors.transparent};
  font-size: ${textSize.s12};
  line-height: 1.45;

  &::placeholder { color: ${colors.placeholder}; }
  &:focus-visible { outline: none; }
  &:disabled { cursor: not-allowed; background: ${colors.disabledSurface}; }
`;
