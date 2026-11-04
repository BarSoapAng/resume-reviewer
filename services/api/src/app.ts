import cors from "@fastify/cors";
import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import { PassThrough } from "node:stream";
import { z } from "zod";
import { disciplines, type Principal, type ReviewSession, type ReviewTurnResponse } from "./domain.js";
import type { ReviewStreamEvent } from "../../../packages/reviewer/src/conversation.js";
import { HttpError } from "./errors.js";
import type { createStripePayments } from "./stripe.js";
import type { Authenticator, Compiler, Repository, ReviewEngine } from "./ports.js";

type StreamPayload<T> = T extends unknown ? Omit<T, "turnId" | "eventId"> : never;

const IdParams = z.object({ id: z.string().uuid() });
const Source = z.string().min(1).max(1_048_576);
const ProjectInput = z.object({
  title: z.string().trim().min(1).max(200),
  discipline: z.enum(disciplines),
  source: Source.optional(),
  currentSource: Source.optional(),
}).transform((value, context) => {
  const source = value.source ?? value.currentSource;
  if (!source) { context.addIssue({ code: "custom", message: "source is required" }); return z.NEVER; }
  return { title: value.title, discipline: value.discipline, source };
});
const ProjectPatch = z.object({ title: z.string().trim().min(1).max(200).optional(), discipline: z.enum(disciplines).optional(), source: Source.optional(), version: z.object({ id: z.string().uuid(), reason: z.string().max(500), kind: z.enum(["autosave", "checkpoint", "upload", "edit", "restore"]), restoredFromId: z.string().uuid().optional(), createdAt: z.string().datetime().optional() }).optional() }).refine((value) => Object.keys(value).length > 0);
const QuestionInput = z.object({ turnId: z.string().uuid(), groupId: z.string().uuid(), answers: z.array(z.object({ questionId: z.string().min(1), state: z.enum(["answered", "skipped", "unanswered"]), answer: z.string().max(20_000) })).max(30) });
const ReviewInput = z.object({ rubricVersion: z.string().min(1).max(100).default("v1"), model: z.string().min(1).max(100).default("configured"), turnId: z.string().uuid().optional(), content: z.string().trim().max(20_000).default("Review this resume") });
const MessageInput = z.object({ content: z.string().trim().max(20_000).default(""), turnId: z.string().uuid().optional(), questions: QuestionInput.optional() }).refine((value) => value.content || value.questions, "A message or question answers are required");

export interface AppDependencies {
  repository: Repository;
  authenticator: Authenticator;
  compiler: Compiler;
  reviewer: ReviewEngine;
  payments?: ReturnType<typeof createStripePayments>;
  corsOrigin?: string;
  requireReviewEntitlement?: boolean;
}

async function principal(request: FastifyRequest, authenticator: Authenticator): Promise<Principal> {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ")) throw new HttpError(401, "Authentication required");
  const authenticated = await authenticator.authenticate(value.slice(7));
  if (!authenticated) throw new HttpError(401, "Invalid access token");
  return authenticated;
}

export async function createApp(deps: AppDependencies) {
  const app = Fastify({ logger: false, bodyLimit: 1_100_000 });
  await app.register(cors, { origin: deps.corsOrigin ?? false });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ error: error.message });
    if (error instanceof z.ZodError) return reply.code(400).send({ error: "Invalid request", details: error.issues });
    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });

  app.get("/health", async () => ({ ok: true }));

  async function streamTurn(request: FastifyRequest, reply: FastifyReply, user: Principal, session: ReviewSession, turnId: string, content: string, questions?: z.infer<typeof QuestionInput>) {
    const claim = await deps.repository.claimTurn(session.id, user.userId, turnId, content, questions);
    if (claim.status === "busy") throw new HttpError(409, "A review response is already running");
    const stream = new PassThrough();
    const controller = new AbortController();
    let sequence = 0;
    const emit = (event: StreamPayload<ReviewStreamEvent<ReviewTurnResponse & { id: string }>>) => {
      if (!controller.signal.aborted) stream.write(`${JSON.stringify({ ...event, turnId, eventId: `${turnId}:${sequence++}` })}\n`);
    };
    reply.raw.on("close", () => { if (!reply.raw.writableEnded) controller.abort(); });
    request.raw.on("aborted", () => controller.abort());
    reply.header("Content-Type", "application/x-ndjson; charset=utf-8").header("Cache-Control", "no-cache, no-transform");
    reply.send(stream);
    void (async () => {
      try {
        emit({ type: "turn_start", reviewId: session.id });
        let saved = claim.turn;
        if (claim.status === "claimed") {
          if (!await deps.repository.addReviewMessage(session.id, user.userId, claim.content, turnId)) throw new HttpError(429, "Review turn limit reached");
          const turn = await deps.reviewer.runTurn({ session, content: claim.content, userId: user.userId, messageId: turnId, ...(questions ? { userFactsText: [content, ...questions.answers.filter((answer) => answer.state === "answered").map((answer) => answer.answer)].join("\n") } : {}), onTextDelta: (delta) => emit({ type: "text_delta", delta }), signal: controller.signal });
          controller.signal.throwIfAborted();
          saved = await deps.repository.saveReviewTurn(session.id, user.userId, turn, turnId) ?? undefined;
        }
        if (!saved) throw new Error("Review could not be saved");
        if (saved.questions.length) emit({ type: "question_group", groupId: turnId, questions: saved.questions });
        emit({ type: "turn_final", turn: { id: session.id, ...saved } });
      } catch (error) {
        app.log.error(error);
        await deps.repository.failTurn(turnId, user.userId).catch((failure) => app.log.error(failure));
        emit({ type: "error", message: "The review connection was interrupted. Try sending your message again." });
      } finally { stream.end(); }
    })();
    return reply;
  }

  app.post("/api/compile", async (request, reply) => {
    const { source } = z.object({ source: Source }).parse(request.body);
    const result = await deps.compiler.compile(source);
    return reply.code(result.ok ? 200 : 422).send(result);
  });

  app.post("/api/projects", async (request, reply) => {
    const user = await principal(request, deps.authenticator);
    const input = ProjectInput.parse(request.body);
    return reply.code(201).send(await deps.repository.createProject({ userId: user.userId, ...input }));
  });

  app.get("/api/projects/:id", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const value = await deps.repository.getProjectForUser(id, user.userId);
    if (!value) throw new HttpError(404, "Project not found");
    return value;
  });

  app.patch("/api/projects/:id", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const value = await deps.repository.updateProject(id, user.userId, ProjectPatch.parse(request.body));
    if (!value) throw new HttpError(404, "Project not found");
    return value;
  });

  app.get("/api/projects/:id/versions", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const values = await deps.repository.listVersions(id, user.userId);
    if (!values) throw new HttpError(404, "Project not found");
    return values;
  });

  app.delete("/api/projects/:id", async (request, reply) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    if (!await deps.repository.deleteProject(id, user.userId)) throw new HttpError(404, "Project not found");
    return reply.code(204).send();
  });

  app.post("/api/projects/:id/compile", async (request, reply) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const value = await deps.repository.getProjectForUser(id, user.userId);
    if (!value) throw new HttpError(404, "Project not found");
    const result = await deps.compiler.compile(value.currentSource);
    return reply.code(result.ok ? 200 : 422).send(result);
  });

  app.post("/api/projects/:id/reviews", async (request, reply) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const input = ReviewInput.parse(request.body ?? {});
    const streaming = request.headers.accept?.includes("application/x-ndjson");
    if (streaming && !input.turnId) throw new HttpError(400, "A turn ID is required");
    const args = [id, user.userId, input.rubricVersion, input.model] as const;
    const value = deps.requireReviewEntitlement === false
      ? await deps.repository.createReview(...args, ...(input.turnId ? [input.turnId] : []))
      : await deps.repository.createEntitledReview(...args, ...(input.turnId ? [input.turnId] : []));
    if (!value) throw new HttpError(404, "Project not found");
    if (value === "payment_required") throw new HttpError(402, "A review entitlement is required");
    if (streaming) return streamTurn(request, reply, user, value, input.turnId!, input.content);
    const turn = await deps.reviewer.runTurn({ session: value, content: "", userId: user.userId });
    const saved = await deps.repository.saveReviewTurn(value.id, user.userId, turn);
    if (!saved) throw new HttpError(404, "Review not found");
    return reply.code(201).send({ id: value.id, ...saved });
  });

  app.get("/api/reviews/:id", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const value = await deps.repository.getReviewForUser(id, user.userId);
    if (!value) throw new HttpError(404, "Review not found");
    return { id: value.id, state: value.state, message: "", issues: [], questions: [], edits: [], messages: await deps.repository.getConversation(id, user.userId) };
  });

  app.post("/api/reviews/:id/messages", async (request, reply) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const { content, turnId, questions } = MessageInput.parse(request.body);
    const session = await deps.repository.getReviewForUser(id, user.userId);
    if (!session) throw new HttpError(404, "Review not found");
    if (request.headers.accept?.includes("application/x-ndjson")) {
      if (!turnId) throw new HttpError(400, "A turn ID is required");
      return streamTurn(request, reply, user, session, turnId, content, questions);
    }
    if (questions) throw new HttpError(400, "Question answers require the streaming protocol");
    if (!await deps.repository.addReviewMessage(id, user.userId, content)) throw new HttpError(429, "Review turn limit reached");
    const turn = await deps.reviewer.runTurn({ session, content, userId: user.userId });
    const saved = await deps.repository.saveReviewTurn(id, user.userId, turn);
    if (!saved) throw new HttpError(404, "Review not found");
    return { id: session.id, ...saved };
  });

  app.post("/api/edits/:id/accept", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const result = await deps.repository.acceptEdit(id, user.userId, (source) => deps.compiler.compile(source));
    if (!result) throw new HttpError(404, "Pending edit not found");
    if (result === "stale") throw new HttpError(409, "This suggestion is outdated");
    if (result === "compile_failed") throw new HttpError(422, "The proposed edit did not compile");
    return { source: result.latexSource, versionId: result.id, status: "accepted" };
  });

  app.post("/api/edits/:id/reject", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    if (!await deps.repository.rejectEdit(id, user.userId)) throw new HttpError(404, "Pending edit not found");
    return { status: "rejected" };
  });

  app.post("/api/versions/:id/restore", async (request) => {
    const user = await principal(request, deps.authenticator);
    const { id } = IdParams.parse(request.params);
    const value = await deps.repository.restoreVersion(id, user.userId);
    if (!value) throw new HttpError(404, "Version not found");
    return value;
  });

  app.get("/api/account/entitlements", async (request) => {
    const user = await principal(request, deps.authenticator);
    return { entitlements: await deps.repository.listEntitlements(user.userId) };
  });

  app.post("/api/payments/checkout", async (request) => {
    const user = await principal(request, deps.authenticator);
    if (!deps.payments) throw new HttpError(503, "Payments are not configured");
    return deps.payments.checkout(user);
  });

  await app.register(async (webhooks) => {
    webhooks.removeContentTypeParser("application/json");
    webhooks.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
    webhooks.post("/api/webhooks/stripe", async (request) => {
      if (!deps.payments) throw new HttpError(503, "Payments are not configured");
      let payment;
      try {
        const signature = request.headers["stripe-signature"];
        if (typeof signature !== "string") throw new Error("Missing signature");
        payment = deps.payments.parseWebhook(request.body as Buffer, signature);
      } catch { throw new HttpError(400, "Invalid Stripe webhook"); }
      const result = payment ? await deps.repository.recordStripePayment(payment) : "ignored";
      return { received: true, result };
    });
  });

  return app;
}
