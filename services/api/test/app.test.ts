import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import type { Repository } from "../src/ports.js";

const user = { userId: "00000000-0000-4000-8000-000000000001", email: "student@example.com" };
const project = {
  id: "00000000-0000-4000-8000-000000000002",
  userId: user.userId,
  title: "Resume",
  discipline: "software" as const,
  currentSource: "latex",
  currentVersionId: "00000000-0000-4000-8000-000000000003",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function repository(overrides: Partial<Repository> = {}): Repository {
  return {
    createProject: vi.fn(async (input) => ({ ...project, ...input, id: project.id, currentVersionId: project.currentVersionId, createdAt: project.createdAt, updatedAt: project.updatedAt })),
    getProjectForUser: vi.fn(async () => project),
    updateProject: vi.fn(async () => project),
    deleteProject: vi.fn(async () => true),
    createInitialVersion: vi.fn(),
    getVersionForUser: vi.fn(),
    restoreVersion: vi.fn(),
    createReview: vi.fn(),
    createEntitledReview: vi.fn(async () => "payment_required"),
    getReviewForUser: vi.fn(),
    getReviewContext: vi.fn(),
    saveReviewTurn: vi.fn(async (_reviewId, _userId, turn) => turn),
    addReviewMessage: vi.fn(),
    getEditForUser: vi.fn(),
    rejectEdit: vi.fn(),
    acceptEdit: vi.fn(),
    listEntitlements: vi.fn(async () => []),
    consumeEntitlement: vi.fn(),
    recordKofiPayment: vi.fn(async () => "created"),
    ...overrides,
  } as Repository;
}

async function app(repo = repository(), requireReviewEntitlement?: boolean) {
  return createApp({
    repository: repo,
    authenticator: { authenticate: vi.fn(async (token) => token === "valid" ? user : null) },
    compiler: { compile: vi.fn(async () => ({ ok: true, pdfBase64: "cGRm", diagnostics: [], cached: false })) },
    reviewer: { runTurn: vi.fn(async () => ({ state: "probing" as const, message: "Review", issues: [], questions: [], edits: [] })) },
    kofiVerificationToken: "secret",
    requireReviewEntitlement,
  });
}

describe("API", () => {
  it("allows anonymous compilation", async () => {
    const instance = await app();
    const response = await instance.inject({ method: "POST", url: "/api/compile", payload: { source: "latex" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ pdfBase64: "cGRm", cached: false });
    await instance.close();
  });

  it("requires a bearer token for owned resources", async () => {
    const instance = await app();
    const response = await instance.inject({ method: "GET", url: `/api/projects/${project.id}` });
    expect(response.statusCode).toBe(401);
    await instance.close();
  });

  it("passes the authenticated owner to project lookup", async () => {
    const getProjectForUser = vi.fn(async () => project);
    const instance = await app(repository({ getProjectForUser }));
    const response = await instance.inject({ method: "GET", url: `/api/projects/${project.id}`, headers: { authorization: "Bearer valid" } });
    expect(response.statusCode).toBe(200);
    expect(getProjectForUser).toHaveBeenCalledWith(project.id, user.userId);
    await instance.close();
  });

  it("returns payment required without creating an unpaid review", async () => {
    const createEntitledReview = vi.fn(async () => "payment_required" as const);
    const instance = await app(repository({ createEntitledReview }));
    const response = await instance.inject({ method: "POST", url: `/api/projects/${project.id}/reviews`, headers: { authorization: "Bearer valid" }, payload: {} });
    expect(response.statusCode).toBe(402);
    expect(createEntitledReview).toHaveBeenCalledWith(project.id, user.userId, "v1", "configured");
    await instance.close();
  });

  it("runs and returns the initial review after consuming an entitlement", async () => {
    const session = { id: "00000000-0000-4000-8000-000000000004", projectId: project.id, rubricVersion: "v1", state: "initial_review" as const, model: "configured", startedAt: new Date(), completedAt: null };
    const instance = await app(repository({ createEntitledReview: vi.fn(async () => session) }));
    const response = await instance.inject({ method: "POST", url: `/api/projects/${project.id}/reviews`, headers: { authorization: "Bearer valid" }, payload: {} });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ id: session.id, state: "probing", message: "Review", issues: [], questions: [], edits: [] });
    await instance.close();
  });

  it("allows self-hosted reviews without a payment entitlement when configured", async () => {
    const session = { id: "00000000-0000-4000-8000-000000000004", projectId: project.id, rubricVersion: "v1", state: "initial_review" as const, model: "configured", startedAt: new Date(), completedAt: null };
    const createReview = vi.fn(async () => session);
    const createEntitledReview = vi.fn();
    const instance = await app(repository({ createReview, createEntitledReview }), false);
    const response = await instance.inject({ method: "POST", url: `/api/projects/${project.id}/reviews`, headers: { authorization: "Bearer valid" }, payload: {} });
    expect(response.statusCode).toBe(201);
    expect(createReview).toHaveBeenCalledWith(project.id, user.userId, "v1", "configured");
    expect(createEntitledReview).not.toHaveBeenCalled();
    await instance.close();
  });

  it("returns a structured review turn for the JSON client", async () => {
    const session = { id: "00000000-0000-4000-8000-000000000004", projectId: project.id, rubricVersion: "v1", state: "probing" as const, model: "configured", startedAt: new Date(), completedAt: null };
    const saveReviewTurn = vi.fn(async (_reviewId, _userId, turn) => turn);
    const instance = await app(repository({ getReviewForUser: vi.fn(async () => session), addReviewMessage: vi.fn(async () => true), saveReviewTurn }));
    const response = await instance.inject({ method: "POST", url: `/api/reviews/${session.id}/messages`, headers: { authorization: "Bearer valid" }, payload: { content: "I built the caching layer" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: session.id, state: "probing", message: "Review", issues: [], questions: [], edits: [] });
    expect(saveReviewTurn).toHaveBeenCalledWith(session.id, user.userId, expect.objectContaining({ message: "Review" }));
    await instance.close();
  });

  it("acknowledges a valid Ko-fi webhook and delegates idempotency", async () => {
    const recordKofiPayment = vi.fn(async () => "duplicate" as const);
    const instance = await app(repository({ recordKofiPayment }));
    const response = await instance.inject({ method: "POST", url: "/api/webhooks/kofi", payload: { verification_token: "secret", transaction_id: "txn", email: "student@example.com", amount: "1", currency: "USD" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true, result: "duplicate" });
    expect(recordKofiPayment).toHaveBeenCalledOnce();
    await instance.close();
  });
});
