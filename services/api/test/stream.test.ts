import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { Repository, ReviewEngine } from "../src/ports.js";

const session = { id: "00000000-0000-4000-8000-000000000004", projectId: "00000000-0000-4000-8000-000000000002", rubricVersion: "v1", state: "probing" as const, model: "configured", startedAt: new Date(), completedAt: null };
const turnId = "00000000-0000-4000-8000-000000000005";
const turn = { state: "probing" as const, message: "Hello world", issues: [], questions: [{ id: "q", issueIds: ["i"], text: "Who used your dashboard?" }], edits: [] };
const headers = { authorization: "Bearer valid", accept: "application/x-ndjson" };

async function fixture(completed = false, failure = false) {
  const repo = {
    getReviewForUser: vi.fn(async () => session),
    createEntitledReview: vi.fn(async () => session),
    claimTurn: vi.fn(async () => ({ status: completed ? "completed" : "claimed", content: "Review this resume", ...(completed ? { turn } : {}) })),
    addReviewMessage: vi.fn(async () => true),
    saveReviewTurn: vi.fn(async () => turn),
    failTurn: vi.fn(async () => undefined),
  };
  const reviewer: ReviewEngine = { runTurn: vi.fn(async ({ onTextDelta }) => {
    onTextDelta?.("Hello ");
    if (failure) throw new Error("provider internals: SQL secret");
    onTextDelta?.("world");
    return turn;
  }) };
  const instance = await createApp({ repository: repo as unknown as Repository, reviewer, authenticator: { authenticate: async () => ({ userId: "owner", email: "owner@example.com" }) }, compiler: { compile: vi.fn() } });
  return { instance, repo, reviewer };
}

describe("authenticated review streaming", () => {
  it("orders provider deltas before validated questions and final turn with stable IDs", async () => {
    const { instance, repo } = await fixture();
    const response = await instance.inject({ method: "POST", url: `/api/reviews/${session.id}/messages`, headers, payload: { turnId, content: "Review this resume" } });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/x-ndjson");
    const events = response.body.trim().split("\n").map((line) => JSON.parse(line));
    expect(events.map((event) => event.type)).toEqual(["turn_start", "text_delta", "text_delta", "question_group", "turn_final"]);
    expect(events.map((event) => event.eventId)).toEqual(events.map((_event, index) => `${turnId}:${index}`));
    expect(events[3]).toMatchObject({ turnId, groupId: turnId, questions: turn.questions });
    expect(repo.saveReviewTurn).toHaveBeenCalledWith(session.id, "owner", turn, turnId);
    await instance.close();
  });
  it("replays a completed turn without regenerating text or saving duplicate edits/messages", async () => {
    const { instance, repo, reviewer } = await fixture(true);
    const response = await instance.inject({ method: "POST", url: `/api/reviews/${session.id}/messages`, headers, payload: { turnId, content: "Review this resume" } });
    expect(response.body).toContain('"type":"turn_final"');
    expect(response.body).not.toContain('"type":"text_delta"');
    expect(reviewer.runTurn).not.toHaveBeenCalled();
    expect(repo.addReviewMessage).not.toHaveBeenCalled();
    expect(repo.saveReviewTurn).not.toHaveBeenCalled();
    await instance.close();
  });
  it("reports interruptions safely and keeps invalid/incomplete questions non-actionable", async () => {
    const { instance, repo } = await fixture(false, true);
    const response = await instance.inject({ method: "POST", url: `/api/reviews/${session.id}/messages`, headers, payload: { turnId, content: "Review this resume" } });
    expect(response.body).toContain('"type":"error"');
    expect(response.body).not.toContain("SQL secret");
    expect(response.body).not.toContain('"type":"question_group"');
    expect(repo.failTurn).toHaveBeenCalledWith(turnId, "owner");
    expect(repo.saveReviewTurn).not.toHaveBeenCalled();
    await instance.close();
  });
  it("passes the stable initial turn ID into entitlement creation and requires authentication", async () => {
    const { instance, repo } = await fixture();
    const url = `/api/projects/${session.projectId}/reviews`;
    expect((await instance.inject({ method: "POST", url, headers: { accept: "application/x-ndjson" }, payload: { turnId } })).statusCode).toBe(401);
    await instance.inject({ method: "POST", url, headers, payload: { turnId } });
    expect(repo.createEntitledReview).toHaveBeenCalledExactlyOnceWith(session.projectId, "owner", "v1", "configured", turnId);
    await instance.close();
  });
});
