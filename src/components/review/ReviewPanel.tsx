import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";
import { colors, fontSize, spacing, radius, Body } from "../../lib/style";
import { Textarea } from "../base/Textarea";
import { PrimaryButton } from "../base/PrimaryButton";
import { Form } from "../base/Form";
import { Dropdown } from "../base/Dropdown";
import { Icon } from "../base/Icon";
import { TextButton } from "../base/TextButton";
import { PanelFrame } from "../layout/PanelFrame";
import { ToolHeader } from "../layout/ToolHeader";
import { ToolTitle } from "../layout/ToolTitle";
import type { WorkspaceModel } from "../../hooks/useResumeWorkspace";
import type { ConversationMessage, ConversationPart, QuestionResponse, QuestionSubmission } from "../../../packages/reviewer/src/conversation";

type QuestionPart = Extract<ConversationPart, { type: "questions" }>;

export function ReviewPanel({ model }: { model: Pick<WorkspaceModel,
  "activeTab" | "beginReview" | "checkoutPending" | "openCheckout" | "edits" | "message" | "messages" | "paymentRequired" | "reviewBusy" | "reviewId" | "sendMessage" | "setMessage" | "updateEdit" | "discipline" | "setDiscipline" | "documentId" | "submitQuestions" | "issues" | "selectIssue"
> }) {
  const { messages, reviewBusy } = model;
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const resize = () => { element.style.height = "auto"; element.style.height = `${element.scrollHeight + 2}px`; };
    resize();
    const observer = new ResizeObserver(resize);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [model.message]);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [messages, reviewBusy]);
  const groups = messages.flatMap((message) => message.parts.filter((part): part is QuestionPart => part.type === "questions").map((part) => ({ message, part })));
  const activeGroup = groups.find(({ part }) => !part.answers && part.questions.length > 0);
  return (
    <PanelFrame $mobileActive={model.activeTab === "review"} aria-label="Aria" id="workspace-panel-review">
      <ToolHeader>
        <ToolTitle><Icon name="sparkles" size={spacing.md} /> Aria</ToolTitle>
        <Dropdown aria-label="Review discipline" value={model.discipline} onChange={(event) => model.setDiscipline(event.target.value as "software" | "mechanical")}>
          <option value="software">SWE</option><option value="mechanical">MECH</option>
        </Dropdown>
      </ToolHeader>
      <ReviewBody ref={body} aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
        {messages.map((item) => <Message key={item.id} $user={item.role === "user"}>
          <Speaker>{item.role === "user" ? "You" : "Aria"}</Speaker>
          {item.parts.some((part) => part.type === "text") ? item.parts.map((part, index) => part.type === "text" ? <Copy key={index}>{part.text}</Copy> : null) : <Copy>{item.content}</Copy>}
          {item.parts.map((part, index) => part.type === "tool" ? <ToolActivity key={index}>{part.name} · {part.state === "completed" ? "Complete" : "In progress"}</ToolActivity> : part.type === "questions" ? <QuestionHistory key={part.groupId} part={part} /> : part.type === "edits" ? part.editIds.map((id) => {
            const edit = model.edits.find((value) => value.id === id);
            return edit ? <Edit key={id}><Speaker>Proposed edit · {edit.status}</Speaker><Diff $removed>{edit.oldText}</Diff><Diff>{edit.newText}</Diff><Copy>{edit.explanation}</Copy>{(edit.status === "pending" || edit.status === "stale") && <Actions><TextButton onClick={() => void model.updateEdit(edit, "reject")}>Reject</TextButton><Action disabled={edit.status !== "pending" || reviewBusy} onClick={() => void model.updateEdit(edit, "accept")}>Accept</Action></Actions>}</Edit> : null;
          }) : null)}
        </Message>)}
        {reviewBusy && <ToolActivity role="status">Aria is responding…</ToolActivity>}
        {model.paymentRequired && <Payment><Body>Choose your review payment to continue.</Body><Action disabled={model.checkoutPending} onClick={() => void model.openCheckout()}>{model.checkoutPending ? "Opening checkout…" : "Continue to payment"}</Action><TextButton disabled={reviewBusy} onClick={() => void model.beginReview()}>I’ve paid — check again</TextButton></Payment>}
      </ReviewBody>
      {activeGroup && <QuestionCard key={`${model.documentId}:${activeGroup.part.groupId}`} message={activeGroup.message} part={activeGroup.part} busy={reviewBusy} submit={model.submitQuestions} sourceModel={model} />}
      <Composer onSubmit={(event) => { event.preventDefault(); void model.sendMessage(); }}>
        <ComposerInput ref={input} id="review-message" aria-label="Message Aria" placeholder={model.reviewId ? "Message Aria…" : "Review this resume…"} rows={1} value={model.message} onChange={(event) => model.setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void model.sendMessage(); } }} />
        <SendButton type="submit" disabled={reviewBusy || (!!model.reviewId && !model.message.trim())} aria-label="Send message" title="Send message"><Icon name="arrow-up" /></SendButton>
      </Composer>
    </PanelFrame>
  );
}

function QuestionHistory({ part }: { part: QuestionPart }) {
  return <History>{part.questions.map((question) => {
    const answer = part.answers?.find((item) => item.questionId === question.id);
    return <div key={question.id}><Copy>{question.text}</Copy>{answer && <Answer>{answer.state === "skipped" ? "Skipped" : answer.answer.trim() || "No answer provided"}</Answer>}</div>;
  })}</History>;
}

function QuestionCard({ message, part, busy, submit, sourceModel }: { message: ConversationMessage; part: QuestionPart; busy: boolean; submit: (submission: QuestionSubmission) => Promise<void>; sourceModel: Pick<WorkspaceModel, "issues" | "selectIssue"> }) {
  const storageKey = `aria:questions:${message.documentId}:${message.turnId}:${part.groupId}`;
  const [draft, setDraft] = useState<{ index: number; answers: QuestionResponse[] }>(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null"); if (saved && Array.isArray(saved.answers)) return { index: Math.min(Math.max(saved.index || 0, 0), part.questions.length - 1), answers: saved.answers }; } catch { /* keep drafts in memory when storage is unavailable */ }
    return { index: 0, answers: [] };
  });
  const question = part.questions[draft.index];
  const issue = sourceModel.issues.find((item) => question.issueIds.includes(item.id) && item.anchor?.exactText);
  const answer = draft.answers.find((value) => value.questionId === question.id);
  const save = (next: typeof draft) => {
    setDraft(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* the active draft remains in memory */ }
  };
  const respond = async (state: QuestionResponse["state"]) => {
    const answers = part.questions.map((item) => item.id === question.id ? { questionId: item.id, state, answer: state === "skipped" ? "" : answer?.answer ?? "" } : draft.answers.find((value) => value.questionId === item.id) ?? { questionId: item.id, state: "unanswered" as const, answer: "" });
    save({ index: Math.min(draft.index + 1, part.questions.length - 1), answers });
    if (draft.index === part.questions.length - 1) await submit({ turnId: message.turnId, groupId: part.groupId, answers });
  };
  return <QuestionBox aria-label="Resume question">
    <QuestionTop><Speaker>Question {draft.index + 1} of {part.questions.length}</Speaker><Severity>{question.priority ?? "medium"}</Severity></QuestionTop>
    <QuestionText as="label" htmlFor={`answer-${part.groupId}`}>{question.text}</QuestionText>
    {issue && <TextButton onClick={() => sourceModel.selectIssue(issue)}>Locate source</TextButton>}
    <AnswerInput id={`answer-${part.groupId}`} placeholder="Share what you know, or leave this blank" value={answer?.answer ?? ""} onChange={(event) => save({ ...draft, answers: [...draft.answers.filter((value) => value.questionId !== question.id), { questionId: question.id, state: "answered", answer: event.target.value }] })} rows={2} />
    <Actions><TextButton disabled={draft.index === 0 || busy} onClick={() => save({ ...draft, index: draft.index - 1 })}>Previous</TextButton><TextButton disabled={busy} onClick={() => void respond("skipped").catch(() => undefined)}>Skip</TextButton><Action disabled={busy} onClick={() => void respond("answered").catch(() => undefined)}>{draft.index === part.questions.length - 1 ? "Submit answers" : "Answer / Next"}</Action></Actions>
  </QuestionBox>;
}

const ReviewBody = styled.div`flex: 1; min-height: 0; min-width: 0; padding: ${spacing.md}; overflow-y: auto; overflow-x: hidden; overflow-wrap: anywhere; scrollbar-width: thin;`;
const Message = styled.div<{ $user: boolean }>`margin: 0 0 ${spacing.md}; padding: ${spacing.sm}; border-radius: ${radius.sm}; background: ${({ $user }) => $user ? colors.forest[100] : colors.paper[0]}; overflow-wrap: anywhere; min-width: 0;`;
const Copy = styled(Body)`white-space: pre-wrap; font-size: ${fontSize.xs}; overflow-wrap: anywhere;`;
const Speaker = styled.div`font-size: ${fontSize.xs}; font-weight: 700; margin-bottom: ${spacing.xxs};`;
const ToolActivity = styled.div`font-size: ${fontSize.xs}; color: ${colors.paper[600]}; margin: ${spacing.xs} 0; overflow-wrap: anywhere;`;
const History = styled.div`display: grid; gap: ${spacing.sm}; margin-top: ${spacing.xs};`;
const Answer = styled(Copy)`padding-left: ${spacing.sm}; border-left: 2px solid ${colors.forest[200]}; color: ${colors.paper[600]};`;
const Edit = styled.div`min-width: 0; margin-top: ${spacing.sm};`;
const Diff = styled.pre<{ $removed?: boolean }>`white-space: pre-wrap; overflow-wrap: anywhere; max-width: 100%; overflow: auto; padding: ${spacing.xs}; background: ${({ $removed }) => $removed ? colors.error[100] : colors.forest[100]}; font-size: ${fontSize.xxs};`;
const Actions = styled.div`display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: ${spacing.xs};`;
const Action = styled(PrimaryButton)`flex: 0 0 auto; width: fit-content; justify-content: center;`;
const SendButton = styled(Action)`position: absolute; width: ${spacing.xl}; padding: 0; right: ${spacing.xxs}; bottom: ${spacing.xxs};`;
const Payment = styled.div`display: grid; gap: ${spacing.sm}; padding: ${spacing.sm}; border: 1px solid ${colors.apricot[400]}; border-radius: ${radius.sm};`;
const Composer = styled(Form)`position: relative; flex: 0 0 auto; min-width: 0; margin: ${spacing.sm}; border: 1px solid ${colors.paper[400]}; border-radius: ${radius.sm}; &:focus-within { border-color: ${colors.forest[600]}; }`;
const ComposerInput = styled(Textarea)`display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: calc(1.5em + ${spacing.md}); max-height: calc(4.5em + ${spacing.md}); overflow-y: auto; resize: none; padding: ${spacing.xs} ${spacing.xxxl} ${spacing.xs} ${spacing.sm}; border: 0; border-radius: inherit; background: transparent; font: inherit; font-size: ${fontSize.sm}; line-height: 1.5; &:focus-visible { outline: 2px solid ${colors.forest[600]}; outline-offset: 2px; }`;
const QuestionBox = styled.div`flex: 0 1 auto; min-height: 0; max-height: 45dvh; overflow: auto; margin: 0 ${spacing.sm} ${spacing.xs}; padding: ${spacing.sm}; display: grid; gap: ${spacing.xs}; border: 1px solid ${colors.forest[600]}; border-radius: ${radius.sm}; background: ${colors.paper[0]}; overflow-wrap: anywhere;`;
const QuestionTop = styled.div`display: flex; align-items: center; justify-content: space-between; gap: ${spacing.xs};`;
const Severity = styled.span`font-size: ${fontSize.xxs}; color: ${colors.paper[600]}; text-transform: uppercase;`;
const QuestionText = styled(Copy)`display: block; font-weight: 600;`;
const AnswerInput = styled(Textarea)`width: 100%; min-height: 55px; max-height: 15dvh; resize: vertical; padding: ${spacing.xs}; border: 1px solid ${colors.paper[400]}; border-radius: ${radius.xs}; font: inherit; font-size: ${fontSize.xs};`;
