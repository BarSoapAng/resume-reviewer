import { colors, fontSize, spacing, radius, alpha, shadows, Body, Text, Label, Code, Strong } from "../../lib/style";
import { Textarea } from "../base/Textarea";
import { Card } from "../base/Card";
import { Button } from "../base/Button";
import styled from "styled-components";
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
          <Icon name="collapse" size={spacing.md} />
        </IconButton>
      </PanelHeader>
      <ReviewBody>
        {!isDemoResume && !reviewId && (
          <UnavailableNotice>
            <ReviewerIcon><Icon name="sparkles" size={spacing.md} /></ReviewerIcon>
            <div>
              <ReviewerName>Review not started</ReviewerName>
              <ReviewerCopy>Your source is ready. Sign in and start a review when you want structured feedback.</ReviewerCopy>
            </div>
          </UnavailableNotice>
        )}
        {issues.length > 0 && <>
          <ReviewerIntro>
            <ReviewerIcon><Icon name="sparkles" size={spacing.md} /></ReviewerIcon>
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
                        Answer <Icon name="arrow" size={spacing.md} />
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
          <Icon name="arrow" size={spacing.md} />
        </SendButton>
      </Composer>
    </PanelFrame>
  );
}

const PanelHeader = styled.div`
  display: flex;
  min-height: ${spacing["5xl"]};
  align-items: flex-start;
  justify-content: space-between;
  gap: ${spacing.sm};
  padding: ${spacing.lg} ${spacing.md} ${spacing.md};
  border-bottom: ${spacing.hairline} solid ${colors.paper[300]};
  background: ${colors.paper[0]};
`;

const PanelTitleWrap = styled.div`
  display: grid;
  gap: ${spacing.xs};
`;

const ReviewBody = styled.div`
  min-height: 0;
  padding: ${spacing.md};
  overflow: auto;
  scrollbar-width: thin;
`;

const ReviewerIntro = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${spacing.sm};
  padding-bottom: ${spacing.md};
`;

const UnavailableNotice = styled(ReviewerIntro)`
  padding: ${spacing.sm};
  border: ${spacing.hairline} solid ${colors.paper[300]};
  border-radius: ${radius.md};
  background: ${colors.paper[0]};
`;

const ReviewerIcon = styled.div`
  display: grid;
  width: ${spacing.xl};
  height: ${spacing.xl};
  place-items: center;
  border-radius: ${radius.sm};
  color: ${colors.forest[600]};
  background: ${colors.forest[100]};
`;

const ReviewerName = styled(Text).attrs({ as: "div" })`
  margin: ${spacing.hairline} 0 ${spacing.xxs};
  font-size: ${fontSize.xs};
  font-weight: 700;
`;

const ProgressRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${spacing.xxxs};
`;

const ProgressText = styled(Text).attrs({ as: "span" })`
  font-size: ${fontSize.xs};
  font-weight: 700;
`;

const ProgressCount = styled(Text).attrs({ as: "span" })`
  color: ${colors.paper[600]};
  font-size: ${fontSize.xs};
`;

const ProgressTrack = styled.div`
  height: ${spacing.xxs};
  margin-top: ${spacing.xs};
  overflow: hidden;
  border-radius: ${radius.pill};
  background: ${colors.paper[300]};
`;

const ProgressFill = styled.div<{ $progress: number; }>`
  width: ${({ $progress }) => `${$progress}%`};
  height: 100%;
  border-radius: inherit;
  background: ${colors.forest[600]};
  transition: width 220ms ease;
`;

const SectionLabel = styled(Label).attrs({ as: "div" })`
  margin: ${spacing.lg} 0 ${spacing.sm};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xxs};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const IssueList = styled.div`
  display: grid;
  gap: ${spacing.xs};
`;

const IssueCard = styled.div<{ $active: boolean; $resolved: boolean; }>`
  width: 100%;
  border: ${spacing.hairline} solid ${({ $active }) => ($active ? colors.forest[600] : colors.paper[300])};
  border-radius: ${radius.md};
  color: inherit;
  background: ${({ $active, $resolved }) => ($resolved ? colors.forest[100] : $active ? colors.paper[0] : alpha(colors.paper[0], 0))};
  box-shadow: ${({ $active }) => ($active ? `0 ${spacing.xxs} ${spacing.md} ${alpha(colors.paper[900], 0.06)}` : "none")};
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;

  &:hover { border-color: ${colors.paper[400]}; }
`;

const IssueSummaryButton = styled(Button)`
  width: 100%;
  padding: ${spacing.sm};
  border: 0;
  color: inherit;
  background: ${alpha(colors.paper[0], 0)};
  text-align: left;
`;

const IssueTopline = styled(Label).attrs({ as: "div" })`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xxs};
  white-space: nowrap;
  overflow: hidden;

  span:last-child { overflow: hidden; text-overflow: ellipsis; }
`;

const Severity = styled(Text).attrs({ as: "span" }) <{ $severity: string; }>`
  flex: 0 0 auto;
  padding: ${spacing.xxs} ${spacing.xs};
  border-radius: ${radius.xs};
  color: ${({ $severity }) => ($severity === "high" ? colors.error[600] : colors.forest[800])};
  background: ${({ $severity }) => ($severity === "high" ? colors.error[100] : colors.apricot[100])};
  font-size: ${fontSize.xxs};
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const IssueTitle = styled(Text).attrs({ as: "div" })`
  margin-top: ${spacing.xs};
  font-size: ${fontSize.sm};
  font-weight: 700;
`;

const IssueExpanded = styled.div`
  padding: 0 ${spacing.sm} ${spacing.sm};

  > p { margin: 0; color: ${colors.paper[600]}; font-size: ${fontSize.xs}; line-height: 1.5; }
`;

const QuestionBlock = styled(Body).attrs({ as: "div" })`
  margin-top: ${spacing.sm};
  padding: ${spacing.sm};
  border-left: ${spacing.xxxs} solid ${colors.apricot[400]};
  border-radius: 0 ${radius.sm} ${radius.sm} 0;
  background: ${colors.apricot[100]};
  font-size: ${fontSize.xs};
  line-height: 1.45;
`;

const QuestionLabel = styled(Text).attrs({ as: "span" })`
  display: block;
  margin-bottom: ${spacing.xxs};
  color: ${colors.paper[600]};
  font-size: ${fontSize.xxs};
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const IssueActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${spacing.xs};
  margin-top: ${spacing.sm};
`;

const UserMessage = styled(Body).attrs({ as: "div" })`
  max-width: 88%;
  margin: ${spacing.md} 0 0 auto;
  padding: ${spacing.sm} ${spacing.sm};
  border-radius: ${radius.md} ${radius.md} ${radius.xxs} ${radius.md};
  color: ${colors.paper[0]};
  background: ${colors.forest[600]};
  font-size: ${fontSize.xs};
  line-height: 1.45;
`;

const AssistantMessage = styled(Body).attrs({ as: "div" })`
  max-width: 92%;
  margin-top: ${spacing.md};
  padding: ${spacing.sm} ${spacing.sm};
  border: ${spacing.hairline} solid ${colors.paper[300]};
  border-radius: ${radius.xxs} ${radius.md} ${radius.md} ${radius.md};
  background: ${colors.paper[0]};
  font-size: ${fontSize.xs};
  line-height: 1.5;
`;

const DiffLine = styled(Code).attrs({ as: "code" }) <{ $removed?: boolean; }>`
  display: block;
  padding: ${spacing.xs} ${spacing.xs};
  border-radius: ${radius.xs};
  color: ${({ $removed }) => ($removed ? colors.error[600] : colors.forest[800])};
  background: ${({ $removed }) => ($removed ? colors.error[100] : colors.forest[100])};
  font-size: ${fontSize.xxs};
  line-height: 1.45;
  white-space: pre-wrap;
`;

const ErrorNotice = styled(Body).attrs({ as: "p" })`
  margin: ${spacing.md} 0 0;
  padding: ${spacing.sm};
  border-radius: ${radius.sm};
  color: ${colors.error[600]};
  background: ${colors.error[100]};
  font-size: ${fontSize.xs};
  line-height: 1.45;
`;

const PaymentCard = styled.div`
  display: grid;
  gap: ${spacing.xs};
  margin-top: ${spacing.sm};
  padding: ${spacing.sm};
  border: ${spacing.hairline} solid ${colors.apricot[400]};
  border-radius: ${radius.sm};
  background: ${colors.apricot[100]};
  font-size: ${fontSize.xs};
  line-height: 1.45;

  span { color: ${colors.paper[600]}; }
`;

const SendButton = styled(Button)`
  position: absolute;
  right: ${spacing.xs};
  bottom: ${spacing.xs};
  display: grid;
  width: ${spacing.xl};
  height: ${spacing.xl};
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: ${radius.sm};
  color: ${colors.paper[0]};
  background: ${colors.forest[600]};

  &:disabled { cursor: default; opacity: 0.35; }
`;

const AnswerButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xxs};
  padding: ${spacing.xs} ${spacing.xs};
  border: 0;
  border-radius: ${radius.sm};
  color: ${colors.paper[0]};
  background: ${colors.forest[600]};
  font-size: ${fontSize.xs};
  font-weight: 700;
`;

const EditCard = styled(Card)`
  display: grid;
  gap: ${spacing.xs};
  margin-top: ${spacing.md};
  padding: ${spacing.sm};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.md};
  background: ${colors.paper[0]};
`;

const Composer = styled(Card)`
  position: relative;
  margin: auto ${spacing.md} ${spacing.md};
  border: ${spacing.hairline} solid ${colors.paper[400]};
  border-radius: ${radius.md};
  background: ${colors.paper[0]};
  box-shadow: ${shadows.soft};

  &:focus-within {
    border-color: ${colors.forest[600]};
    box-shadow: 0 0 0 ${spacing.xxxs} ${colors.forest[100]};
  }
`;

const ComposerInput = styled(Textarea)`
  display: block;
  width: 100%;
  min-height: ${spacing["4xl"]};
  padding: ${spacing.sm} ${spacing.xxl} ${spacing.sm} ${spacing.sm};
  resize: none;
  border: 0;
  color: ${colors.paper[900]};
  background: ${alpha(colors.paper[0], 0)};
  font-size: ${fontSize.xs};
  line-height: 1.45;

  &::placeholder { color: ${colors.paper[500]}; }
  &:focus-visible { outline: none; }
  &:disabled { cursor: not-allowed; background: ${colors.paper[200]}; }
`;
