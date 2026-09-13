import type { ReviewIssue, ReviewStage } from "./schemas.js";

const transitions: Record<ReviewStage, readonly ReviewStage[]> = {
  imported: ["initial_review"],
  initial_review: ["probing", "ready_to_edit"],
  probing: ["probing", "ready_to_edit"],
  ready_to_edit: ["probing", "editing"],
  editing: ["editing", "final_review"],
  final_review: ["editing", "complete"],
  complete: [],
};

export class InvalidReviewTransitionError extends Error {}

export function canTransition(from: ReviewStage, to: ReviewStage): boolean {
  return transitions[from].includes(to);
}

export function highPriorityIssuesSettled(issues: readonly ReviewIssue[]): boolean {
  return issues
    .filter((issue) => issue.severity === "high")
    .every((issue) => issue.status === "resolved" || issue.status === "skipped");
}

export function transitionReview(
  from: ReviewStage,
  to: ReviewStage,
  issues: readonly ReviewIssue[] = [],
): ReviewStage {
  if (!canTransition(from, to)) throw new InvalidReviewTransitionError(`${from} cannot transition to ${to}`);
  if (to === "ready_to_edit" && !highPriorityIssuesSettled(issues)) {
    throw new InvalidReviewTransitionError("High-priority issues must be resolved or skipped before editing");
  }
  return to;
}
