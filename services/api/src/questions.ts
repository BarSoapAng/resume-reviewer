import type { QuestionSubmission, ConversationQuestion } from "../../../packages/reviewer/src/conversation.js";
import { HttpError } from "./errors.js";

export function trustedQuestionAnswers(submission: QuestionSubmission, questions: ConversationQuestion[]): { content: string; skippedIssueIds: string[] } {
  const ids = new Set<string>();
  const skippedIssueIds: string[] = [];
  const content = submission.answers.map((answer) => {
    const question = questions.find((value) => value.id === answer.questionId);
    if (!question || ids.has(answer.questionId)) throw new HttpError(400, "Invalid question response");
    ids.add(answer.questionId);
    if (answer.state === "skipped") skippedIssueIds.push(...question.issueIds);
    const text = answer.state === "answered" && answer.answer.trim() ? answer.answer.trim() : "[No information supplied]";
    return `Question: ${question.text}\nResponse (${answer.state}): ${text}`;
  }).join("\n\n");
  if (ids.size !== questions.length) throw new HttpError(400, "Incomplete question group");
  return { content, skippedIssueIds };
}
