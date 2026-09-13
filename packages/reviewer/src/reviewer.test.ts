import { describe, expect, it } from "vitest";
import { resolveSourceAnchor } from "./anchors.js";
import { validateAndApplyEdit } from "./edits.js";
import { reviewResume } from "./simple-review.js";
import { InvalidReviewTransitionError, transitionReview } from "./state-machine.js";
import { validateReviewTurn } from "./turn-validation.js";
import type { EditProposal, ResumeFact, ReviewIssue, ReviewTurn } from "./schemas.js";

const issue: ReviewIssue = {
  id: "i1", ruleId: "SWE_IMPACT_001", severity: "high", category: "impact",
  description: "Weak", reasoning: "Missing detail",
  sourceAnchor: { versionId: "v1", exactText: "Built app", occurrence: 0 }, status: "open",
};

const fact: ResumeFact = {
  id: "f1", projectId: "p1", subject: null, section: null, statement: "API latency fell from 800 ms to 200 ms after adding Redis caching",
  source: "user_message", sourceId: "m1", createdAt: "2026-01-01T00:00:00.000Z",
};

function proposal(overrides: Partial<EditProposal> = {}): EditProposal {
  return { id: "e1", versionId: "v1", issueIds: ["i1"], oldText: "Improved performance",
    newText: "Reduced API latency from 800 ms to 200 ms by adding Redis caching", explanation: "Adds verified detail",
    citations: [{ factId: "f1", claim: "800 ms to 200 ms" }], ...overrides };
}

describe("review state machine", () => {
  it("permits the defined path", () => expect(transitionReview("imported", "initial_review")).toBe("initial_review"));
  it("blocks model-recommended jumps", () => expect(() => transitionReview("imported", "editing")).toThrow(InvalidReviewTransitionError));
  it("requires high priority issues to be settled", () => expect(() => transitionReview("probing", "ready_to_edit", [issue])).toThrow(/High-priority/));
  it("allows skipped high priority issues", () => expect(transitionReview("probing", "ready_to_edit", [{ ...issue, status: "skipped" }])).toBe("ready_to_edit"));
});

describe("source anchors", () => {
  it("resolves the requested zero-based occurrence", () => expect(resolveSourceAnchor("x Built app y Built app", { versionId: "v1", exactText: "Built app", occurrence: 1 })?.start).toBe(14));
  it("returns null when the occurrence disappeared", () => expect(resolveSourceAnchor("Built app", { versionId: "v1", exactText: "Built app", occurrence: 1 })).toBeNull());
});

describe("edit validation", () => {
  it("applies an exactly anchored grounded proposal", () => expect(validateAndApplyEdit(proposal(), "v1", "\\item Improved performance", [fact])).toMatchObject({ valid: true }));
  it("rejects stale and ambiguous edits", () => {
    expect(validateAndApplyEdit(proposal(), "v2", "Improved performance", [fact])).toMatchObject({ reason: "stale_version" });
    expect(validateAndApplyEdit(proposal(), "v1", "Improved performance Improved performance", [fact])).toMatchObject({ reason: "ambiguous_anchor" });
  });
  it("rejects citations that do not support the claim", () => expect(validateAndApplyEdit(proposal({ citations: [{ factId: "f1", claim: "3,000 users" }] }), "v1", "Improved performance", [fact])).toMatchObject({ reason: "ungrounded_claim" }));
  it("rejects an unsupported new quantity", () => expect(validateAndApplyEdit(proposal({ newText: "Reduced API latency by 40%", citations: [] }), "v1", "Improved performance", [fact])).toMatchObject({ reason: "ungrounded_claim" }));
});

describe("offline review", () => {
  it("asks no more than three questions", () => expect(reviewResume("- Built app\n- Helped team\n- Improved speed\n- Worked on tests", "software").questions).toHaveLength(3));
  it("usually leaves an already substantive bullet alone", () => expect(reviewResume("- Reduced API latency from 800 ms to 200 ms by implementing Redis caching for repeated catalog queries", "software").issues).toHaveLength(0));
});

describe("model turn validation", () => {
  const turn: ReviewTurn = { message: "", stage: "probing", issues: [], questions: [], facts: [], edits: [], recommendedTransition: null };
  const context = { currentStage: "probing" as const, currentVersionId: "v1", resumeSource: "Built app", existingFacts: [], existingIssues: [issue], allowedSourceIds: new Set(["m1"]) };

  it("rejects an invalid recommended transition", () => expect(validateReviewTurn({ ...turn, recommendedTransition: "complete" }, context)).toMatchObject({ valid: false }));
  it("rejects facts not tied to the current resume or user messages", () => expect(validateReviewTurn({ ...turn, facts: [{ ...fact, sourceId: "made-up-message" }] }, context)).toMatchObject({ valid: false }));
  it("rejects questions referencing unknown issues", () => expect(validateReviewTurn({ ...turn, questions: [{ id: "q1", issueIds: ["missing"], priority: "high", text: "Question?" }] }, context)).toMatchObject({ valid: false }));
});
