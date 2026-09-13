import { describe, expect, it, vi } from "vitest";
import type { ReviewTurn } from "../../../packages/reviewer/src/index.js";
import { createAiReviewer } from "../src/reviewer-adapter.js";
import type { Repository } from "../src/ports.js";

describe("AI reviewer adapter", () => {
  it("loads the durable ledger, issues, and bounded conversation into the next turn", async () => {
    const project = { id: "project", userId: "user", title: "Resume", discipline: "software" as const, currentSource: "resume source", currentVersionId: "version", createdAt: new Date(), updatedAt: new Date() };
    const fact = { id: "fact", projectId: "project", subject: null, section: "Experience", statement: "Used Redis", source: "user_message" as const, sourceId: "message", createdAt: new Date().toISOString() };
    const issue = { id: "issue", ruleId: "SWE_1", severity: "high" as const, category: "impact", description: "Weak impact", reasoning: "No result", sourceAnchor: { versionId: "version", exactText: "resume", occurrence: 0 }, status: "probing" as const };
    const getReviewContext = vi.fn(async () => ({ project, facts: [fact], issues: [issue], recentMessages: [{ role: "assistant" as const, content: "Question" }, { role: "user" as const, content: "Used Redis" }] }));
    const runner = vi.fn(async (): Promise<ReviewTurn> => ({ message: "Thanks", stage: "probing", issues: [issue], questions: [], facts: [fact], edits: [], recommendedTransition: "ready_to_edit" }));
    const reviewer = createAiReviewer({ getReviewContext } as unknown as Repository, { runner, rubricLoader: vi.fn(async () => []) });
    const session = { id: "session", projectId: "project", rubricVersion: "v1", state: "probing" as const, model: "configured", startedAt: new Date(), completedAt: null };

    const result = await reviewer.runTurn({ session, content: "Used Redis", userId: "user" });

    expect(getReviewContext).toHaveBeenCalledWith("session", "user");
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ resume: "resume source", facts: [fact], issues: [issue], recentMessages: [{ role: "assistant", content: "Question" }], userMessage: "Used Redis" }), { model: undefined });
    expect(result.state).toBe("ready_to_edit");
  });
});
