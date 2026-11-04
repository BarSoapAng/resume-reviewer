import { isAnchorCurrent } from "./anchors.js";
import { validateAndApplyEdit } from "./edits.js";
import { validateNewFacts } from "./grounding.js";
import type { ResumeFact, ReviewIssue, ReviewStage, ReviewTurn } from "./schemas.js";
import { canTransition, highPriorityIssuesSettled } from "./state-machine.js";

export type TurnValidationContext = {
  currentStage: ReviewStage;
  currentVersionId: string;
  resumeSource: string;
  existingFacts: readonly ResumeFact[];
  existingIssues: readonly ReviewIssue[];
  allowedSourceIds: ReadonlySet<string>;
};

export type TurnValidationResult = { valid: true } | { valid: false; errors: string[] };

/** Checks model output before any tool or persistence side effect is allowed. */
export function validateReviewTurn(turn: ReviewTurn, context: TurnValidationContext): TurnValidationResult {
  const errors: string[] = [];
  const facts = [...context.existingFacts, ...turn.facts];
  const issues = [...new Map([...context.existingIssues, ...turn.issues].map((issue) => [issue.id, issue])).values()];
  const issueIds = new Set(issues.map((issue) => issue.id));

  const factValidation = validateNewFacts(turn.facts, context.allowedSourceIds);
  if (!factValidation.valid) errors.push(...factValidation.failures.map((failure) => `fact:${failure.detail}:${failure.code}`));

  for (const issue of turn.issues) {
    if (!isAnchorCurrent(context.resumeSource, context.currentVersionId, issue.sourceAnchor)) {
      errors.push(`issue:${issue.id}:stale_anchor`);
    }
  }
  for (const question of turn.questions) {
    for (const issueId of question.issueIds) if (!issueIds.has(issueId)) errors.push(`question:${question.id}:unknown_issue:${issueId}`);
  }
  for (const edit of turn.edits) {
    const validation = validateAndApplyEdit(edit, context.currentVersionId, context.resumeSource, facts);
    if (!validation.valid) errors.push(`edit:${edit.id}:${validation.reason}`);
  }
  if (turn.recommendedTransition) {
    if (!canTransition(context.currentStage, turn.recommendedTransition)) errors.push(`transition:invalid:${context.currentStage}:${turn.recommendedTransition}`);
    else if (turn.recommendedTransition === "ready_to_edit" && !highPriorityIssuesSettled(issues)) errors.push("transition:high_priority_issues_unsettled");
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
