import { and, count, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { CompileResult, Entitlement, StripePayment, ProposedEdit, ResumeProject, ResumeVersion, ReviewContextSnapshot, ReviewSession, ReviewState, ReviewTurnResponse } from "../domain.js";
import type { Repository } from "../ports.js";
import { conversationTurns, payments, projects, proposedEdits, resumeFacts, reviewEntitlements, reviewIssues, reviewMessages, reviewSessions, versions } from "./schema.js";
import type { ConversationPart, QuestionSubmission, WorkspaceVersion } from "../../../../packages/reviewer/src/conversation.js";
import { HttpError } from "../errors.js";
import { trustedQuestionAnswers } from "../questions.js";
import { isAnchorCurrent } from "../../../../packages/reviewer/src/anchors.js";

type Database = ReturnType<typeof drizzle>;

const transitions: Record<ReviewState, readonly ReviewState[]> = {
  imported: ["initial_review"], initial_review: ["probing", "ready_to_edit"], probing: ["ready_to_edit"],
  ready_to_edit: ["editing"], editing: ["editing", "final_review"], final_review: ["editing", "complete"], complete: [],
};

function validTransition(from: ReviewState, to: ReviewState) {
  return from === to || transitions[from].includes(to);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function project(row: typeof projects.$inferSelect): ResumeProject {
  return { id: row.id, userId: row.userId, title: row.title, discipline: row.discipline, currentSource: row.currentSource, currentVersionId: row.currentVersionId, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function version(row: typeof versions.$inferSelect): ResumeVersion {
  return { id: row.id, projectId: row.projectId, parentVersionId: row.parentVersionId, latexSource: row.latexSource, createdBy: row.createdBy, reason: row.reason, createdAt: row.createdAt };
}

function review(row: typeof reviewSessions.$inferSelect): ReviewSession {
  return { id: row.id, projectId: row.projectId, rubricVersion: row.rubricVersion, state: row.state, model: row.model, startedAt: row.startedAt, completedAt: row.completedAt };
}

export function connectRepository(databaseUrl: string): { repository: Repository; close: () => Promise<void> } {
  const client = postgres(databaseUrl, { max: 10, prepare: false });
  return { repository: new PostgresRepository(drizzle(client)), close: () => client.end() };
}

export class PostgresRepository implements Repository {
  constructor(private readonly db: Database) {}

  async createProject(input: Parameters<Repository["createProject"]>[0]) {
    return await this.db.transaction(async (tx) => {
      const [created] = await tx.insert(projects).values({ userId: input.userId, title: input.title, discipline: input.discipline, currentSource: input.source }).returning();
      const [initial] = await tx.insert(versions).values({ projectId: created.id, latexSource: input.source, createdBy: "user", reason: "Initial import", metadata: { filename: input.title, discipline: input.discipline, kind: "upload" } }).returning();
      const [updated] = await tx.update(projects).set({ currentVersionId: initial.id }).where(eq(projects.id, created.id)).returning();
      return project(updated);
    });
  }

  async getProjectForUser(projectId: string, userId: string) {
    const [row] = await this.db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
    return row ? project(row) : null;
  }

  async updateProject(projectId: string, userId: string, patch: Parameters<Repository["updateProject"]>[2]) {
    return this.db.transaction(async (tx) => {
      const [owned] = await tx.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).for("update");
      if (!owned) return null;
      let currentVersionId = owned.currentVersionId;
      const changed = (patch.source !== undefined && patch.source !== owned.currentSource) || (patch.title !== undefined && patch.title !== owned.title) || (patch.discipline !== undefined && patch.discipline !== owned.discipline);
      if (changed || (patch.version && patch.version.kind !== "autosave")) {
        const [snapshot] = await tx.insert(versions).values({ id: patch.version?.id, projectId, parentVersionId: currentVersionId, latexSource: patch.source ?? owned.currentSource, createdBy: "user", reason: patch.version?.reason || "Autosave", metadata: { filename: patch.title ?? owned.title, discipline: patch.discipline ?? owned.discipline, kind: patch.version?.kind ?? "autosave", restoredFromId: patch.version?.restoredFromId }, ...(patch.version?.createdAt ? { createdAt: new Date(patch.version.createdAt) } : {}) }).onConflictDoNothing().returning();
        if (snapshot) currentVersionId = snapshot.id;
        else if (patch.version) {
          const [existing] = await tx.select().from(versions).where(eq(versions.id, patch.version.id));
          if (!existing || existing.projectId !== projectId || existing.latexSource !== (patch.source ?? owned.currentSource) || existing.metadata.filename !== (patch.title ?? owned.title) || existing.metadata.discipline !== (patch.discipline ?? owned.discipline) || (changed && existing.id !== owned.currentVersionId)) throw new HttpError(409, "Version does not match this save");
        }
      }
      const [row] = await tx.update(projects).set({ ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.discipline !== undefined ? { discipline: patch.discipline } : {}), ...(patch.source !== undefined ? { currentSource: patch.source } : {}), currentVersionId, updatedAt: new Date() }).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).returning();
      return project(row);
    });
  }

  async listVersions(projectId: string, userId: string): Promise<WorkspaceVersion[] | null> {
    const owned = await this.getProjectForUser(projectId, userId);
    if (!owned) return null;
    // Match local retention: autosaves cannot displace explicit historical events.
    const rows = (await Promise.all([
      this.db.select().from(versions).where(and(eq(versions.projectId, projectId), sql`${versions.metadata}->>'kind' = 'autosave'`)).orderBy(sql`${versions.createdAt} desc`).limit(50),
      this.db.select().from(versions).where(and(eq(versions.projectId, projectId), sql`coalesce(${versions.metadata}->>'kind', '') <> 'autosave'`)).orderBy(sql`${versions.createdAt} desc`).limit(100),
    ])).flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return rows.map((row) => ({ documentId: projectId, id: row.id, source: row.latexSource, filename: row.metadata.filename ?? owned.title, discipline: row.metadata.discipline ?? owned.discipline, createdAt: row.createdAt.toISOString(), reason: row.reason, kind: (row.metadata.kind ?? (row.createdBy === "ai" ? "edit" : "checkpoint")) as WorkspaceVersion["kind"], restoredFromId: row.metadata.restoredFromId }));
  }

  async deleteProject(projectId: string, userId: string) {
    return (await this.db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).returning({ id: projects.id })).length === 1;
  }

  async createInitialVersion(input: ResumeProject) {
    const [row] = await this.db.insert(versions).values({ projectId: input.id, latexSource: input.currentSource, createdBy: "user", reason: "Initial import" }).returning();
    return version(row);
  }

  async getVersionForUser(versionId: string, userId: string) {
    const [row] = await this.db.select({ value: versions }).from(versions).innerJoin(projects, eq(projects.id, versions.projectId)).where(and(eq(versions.id, versionId), eq(projects.userId, userId))).limit(1);
    return row ? version(row.value) : null;
  }

  async restoreVersion(versionId: string, userId: string) {
    return await this.db.transaction(async (tx) => {
      const [owned] = await tx.select({ value: versions, currentVersionId: projects.currentVersionId }).from(versions).innerJoin(projects, eq(projects.id, versions.projectId)).where(and(eq(versions.id, versionId), eq(projects.userId, userId))).limit(1);
      if (!owned) return null;
      const [restored] = await tx.insert(versions).values({ projectId: owned.value.projectId, parentVersionId: owned.currentVersionId, latexSource: owned.value.latexSource, createdBy: "user", reason: `Restored version ${owned.value.id}` }).returning();
      await tx.update(projects).set({ currentSource: restored.latexSource, currentVersionId: restored.id, updatedAt: new Date() }).where(and(eq(projects.id, restored.projectId), eq(projects.userId, userId)));
      return version(restored);
    });
  }

  async createReview(projectId: string, userId: string, rubricVersion: string, model: string, turnId?: string) {
    const owned = await this.getProjectForUser(projectId, userId);
    if (!owned) return null;
    return this.db.transaction(async (tx) => {
      if (turnId) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${turnId}))`);
        const [existingRow] = await tx.select({ value: reviewSessions }).from(reviewSessions).innerJoin(projects, eq(projects.id, reviewSessions.projectId)).where(and(eq(reviewSessions.id, turnId), eq(projects.userId, userId)));
        const existing = existingRow ? review(existingRow.value) : undefined;
        if (existing) {
          if (existing.projectId !== projectId) throw new HttpError(409, "Turn belongs to another document");
          return existing;
        }
      }
      const [row] = await tx.insert(reviewSessions).values({ id: turnId, projectId, rubricVersion, model, state: "initial_review" }).returning();
      return review(row);
    });
  }

  async createEntitledReview(projectId: string, userId: string, rubricVersion: string, model: string, turnId?: string) {
    if (!await this.getProjectForUser(projectId, userId)) return null;
    return await this.db.transaction(async (tx) => {
      if (turnId) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${turnId}))`);
        const [existingRow] = await tx.select({ value: reviewSessions }).from(reviewSessions).innerJoin(projects, eq(projects.id, reviewSessions.projectId)).where(and(eq(reviewSessions.id, turnId), eq(projects.userId, userId)));
        const existing = existingRow ? review(existingRow.value) : undefined;
        if (existing) {
          if (existing.projectId !== projectId) throw new HttpError(409, "Turn belongs to another document");
          return existing;
        }
      }
      const available = await tx.execute(sql<{ id: string }>`select id from review_entitlements where user_id = ${userId}::uuid and status = 'available' order by created_at for update skip locked limit 1`) as unknown as Array<{ id: string }>;
      if (!available[0]) return "payment_required" as const;
      const sessionId = turnId ?? randomUUID();
      const [row] = await tx.insert(reviewSessions).values({ id: sessionId, projectId, rubricVersion, model, state: "initial_review" }).returning();
      await tx.update(reviewEntitlements).set({ status: "consumed", sessionId }).where(and(eq(reviewEntitlements.id, available[0].id), eq(reviewEntitlements.status, "available")));
      return review(row);
    });
  }

  async getReviewForUser(reviewId: string, userId: string) {
    const [row] = await this.db.select({ value: reviewSessions }).from(reviewSessions).innerJoin(projects, eq(projects.id, reviewSessions.projectId)).where(and(eq(reviewSessions.id, reviewId), eq(projects.userId, userId))).limit(1);
    return row ? review(row.value) : null;
  }

  async getReviewContext(reviewId: string, userId: string): Promise<ReviewContextSnapshot | null> {
    const [owned] = await this.db.select({ value: projects }).from(reviewSessions).innerJoin(projects, eq(projects.id, reviewSessions.projectId)).where(and(eq(reviewSessions.id, reviewId), eq(projects.userId, userId))).limit(1);
    if (!owned) return null;
    const [facts, issues, latestMessages] = await Promise.all([
      this.db.select().from(resumeFacts).where(eq(resumeFacts.sessionId, reviewId)).orderBy(resumeFacts.createdAt),
      this.db.select().from(reviewIssues).where(eq(reviewIssues.sessionId, reviewId)).orderBy(reviewIssues.createdAt),
      this.db.select().from(reviewMessages).where(eq(reviewMessages.sessionId, reviewId)).orderBy(sql`${reviewMessages.createdAt} desc`).limit(6),
    ]);
    return {
      project: project(owned.value),
      facts: facts.map((fact) => ({ id: fact.id, projectId: fact.projectId, subject: fact.subject, section: fact.section, statement: fact.statement, source: fact.sourceType as "resume" | "user_message", sourceId: fact.sourceId, createdAt: fact.createdAt.toISOString() })),
      issues: issues.map((issue) => ({ id: issue.id, ruleId: issue.ruleId, severity: issue.severity, category: issue.category, description: issue.description, reasoning: issue.reasoning, sourceAnchor: issue.sourceAnchor as ReviewTurnResponse["issues"][number]["sourceAnchor"], status: issue.status })),
      recentMessages: latestMessages.reverse().filter((message): message is typeof message & { role: "user" | "assistant" } => message.role !== "system").map(({ role, content }) => ({ role, content })),
    };
  }

  async getConversation(reviewId: string, userId: string) {
    const session = await this.getReviewForUser(reviewId, userId);
    if (!session) return null;
    const rows = await this.db.select().from(reviewMessages).where(eq(reviewMessages.sessionId, reviewId)).orderBy(reviewMessages.createdAt, reviewMessages.id);
    const turns = await this.db.select().from(conversationTurns).where(eq(conversationTurns.sessionId, reviewId));
    return rows.filter((row) => row.role !== "system").map((row) => ({ id: row.id, turnId: row.turnId ?? row.id, documentId: session.projectId, role: row.role as "user" | "assistant", content: row.content, parts: (row.parts as ConversationPart[]).map((part) => {
      if (part.type !== "questions") return part;
      const response = turns.find((turn) => (turn.answers as QuestionSubmission | null)?.groupId === part.groupId)?.answers as QuestionSubmission | undefined;
      return response ? { ...part, answers: response.answers } : part;
    }) }));
  }

  async saveReviewTurn(reviewId: string, userId: string, turn: ReviewTurnResponse, turnId?: string): Promise<ReviewTurnResponse | null> {
    const session = await this.getReviewForUser(reviewId, userId);
    const context = await this.getReviewContext(reviewId, userId);
    if (!session || !context) return null;
    if ((turn.reviewedVersionId && turn.reviewedVersionId !== context.project.currentVersionId) || (turn.reviewedDiscipline && turn.reviewedDiscipline !== context.project.discipline)) throw new HttpError(409, "The resume changed during this review response");
    if (turn.issues.some((issue) => !isAnchorCurrent(context.project.currentSource, context.project.currentVersionId ?? "", issue.sourceAnchor)) || turn.edits.some((edit) => edit.baseVersionId !== context.project.currentVersionId)) throw new HttpError(409, "The resume changed during this review response");
    if (!validTransition(session.state, turn.state)) throw new Error(`Invalid review transition: ${session.state} -> ${turn.state}`);
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(projects).where(and(eq(projects.id, context.project.id), eq(projects.userId, userId))).for("update");
      if (!current || current.currentVersionId !== context.project.currentVersionId || current.currentSource !== context.project.currentSource || current.discipline !== context.project.discipline) throw new HttpError(409, "The resume changed during this review response");
      const factIds = new Map<string, string>();
      const savedFacts: NonNullable<ReviewTurnResponse["facts"]> = [];
      for (const fact of turn.facts ?? []) {
        const existing = isUuid(fact.id) && context.facts.some((value) => value.id === fact.id);
        const id = existing ? fact.id : randomUUID();
        const values = { projectId: context.project.id, sessionId: reviewId, subject: fact.subject, section: fact.section, statement: fact.statement, sourceType: fact.source, sourceId: fact.sourceId };
        if (existing) await tx.update(resumeFacts).set(values).where(and(eq(resumeFacts.id, id), eq(resumeFacts.sessionId, reviewId)));
        else await tx.insert(resumeFacts).values({ id, ...values });
        factIds.set(fact.id, id);
        savedFacts.push({ ...fact, id, projectId: context.project.id, createdAt: existing ? fact.createdAt : new Date().toISOString() });
      }

      const issueIds = new Map<string, string>();
      const savedIssues: ReviewTurnResponse["issues"] = [];
      for (const issue of turn.issues) {
        const existing = isUuid(issue.id) && context.issues.some((value) => value.id === issue.id);
        const id = existing ? issue.id : randomUUID();
        const sourceAnchor = { ...issue.sourceAnchor, versionId: context.project.currentVersionId ?? issue.sourceAnchor.versionId };
        const values = { ruleId: issue.ruleId, severity: issue.severity, category: issue.category, description: issue.description, reasoning: issue.reasoning, sourceAnchor, status: issue.status, resolvedAt: issue.status === "resolved" ? new Date() : null };
        if (existing) await tx.update(reviewIssues).set(values).where(and(eq(reviewIssues.id, id), eq(reviewIssues.sessionId, reviewId)));
        else await tx.insert(reviewIssues).values({ id, sessionId: reviewId, ...values });
        issueIds.set(issue.id, id);
        savedIssues.push({ ...issue, id, sourceAnchor });
      }

      const allowedFactIds = new Set([...context.facts.map((fact) => fact.id), ...factIds.values()]);
      const savedEdits: ReviewTurnResponse["edits"] = [];
      for (const edit of turn.edits) {
        const id = randomUUID();
        const mappedIssueIds = edit.issueIds.map((value) => issueIds.get(value) ?? value).filter(isUuid);
        const citations = (edit.citations ?? []).map((citation) => ({ ...citation, factId: factIds.get(citation.factId) ?? citation.factId }));
        if (citations.some((citation) => !allowedFactIds.has(citation.factId))) continue;
        const baseVersionId = context.project.currentVersionId;
        if (!baseVersionId) continue;
        await tx.insert(proposedEdits).values({ id, sessionId: reviewId, baseVersionId, oldText: edit.oldText, newText: edit.newText, explanation: edit.explanation, issueIds: mappedIssueIds, citations });
        savedEdits.push({ ...edit, id, baseVersionId, issueIds: mappedIssueIds, citations });
      }

      const saved = { ...turn, facts: savedFacts, issues: savedIssues, questions: turn.questions.map((question) => ({ ...question, issueIds: question.issueIds.map((value) => issueIds.get(value) ?? value).filter(isUuid) })), edits: savedEdits };
      const parts: ConversationPart[] = [{ type: "text", text: saved.message }];
      if (saved.questions.length) parts.push({ type: "questions", groupId: turnId ?? randomUUID(), questions: saved.questions });
      if (saved.edits.length) parts.push({ type: "edits", editIds: saved.edits.map((edit) => edit.id) });
      await tx.insert(reviewMessages).values({ sessionId: reviewId, role: "assistant", content: turn.message, turnId, parts });
      if (turnId) await tx.update(conversationTurns).set({ status: "completed", result: saved, updatedAt: new Date() }).where(and(eq(conversationTurns.id, turnId), eq(conversationTurns.userId, userId)));
      await tx.update(reviewSessions).set({ state: turn.state, ...(turn.state === "complete" ? { completedAt: new Date() } : {}) }).where(eq(reviewSessions.id, reviewId));
      return saved;
    });
  }

  async addReviewMessage(reviewId: string, userId: string, content: string, turnId?: string) {
    if (!await this.getReviewForUser(reviewId, userId)) return false;
    const [turns] = await this.db.select({ value: count() }).from(reviewMessages).where(and(eq(reviewMessages.sessionId, reviewId), eq(reviewMessages.role, "user")));
    if (turns.value >= 30) return false;
    if (turnId) {
      const [existing] = await this.db.select().from(reviewMessages).where(and(eq(reviewMessages.id, turnId), eq(reviewMessages.sessionId, reviewId)));
      if (existing) return true;
    }
    await this.db.insert(reviewMessages).values({ id: turnId, sessionId: reviewId, role: "user", content, turnId, parts: [{ type: "text", text: content }] }).onConflictDoNothing();
    return true;
  }

  async claimTurn(reviewId: string, userId: string, turnId: string, content: string, questions?: QuestionSubmission): ReturnType<Repository["claimTurn"]> {
    if (!await this.getReviewForUser(reviewId, userId)) throw new HttpError(404, "Review not found");
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${reviewId}))`);
      const [existing] = await tx.select().from(conversationTurns).where(eq(conversationTurns.id, turnId));
      if (existing && (existing.userId !== userId || existing.sessionId !== reviewId)) throw new HttpError(409, "Turn belongs to another review");
      if (existing && (existing.content !== content || JSON.stringify(existing.answers) !== JSON.stringify(questions ?? null))) throw new HttpError(409, "Turn input has changed");
      if (existing?.status === "completed") return { status: "completed", turn: existing.result as ReviewTurnResponse, content: existing.content };
      await tx.update(conversationTurns).set({ status: "failed" }).where(and(eq(conversationTurns.sessionId, reviewId), eq(conversationTurns.status, "running"), sql`${conversationTurns.updatedAt} < now() - interval '10 minutes'`));
      const [running] = await tx.select().from(conversationTurns).where(and(eq(conversationTurns.sessionId, reviewId), eq(conversationTurns.status, "running")));
      if (running) return { status: "busy", content };
      let trustedContent = content;
      if (questions) {
        if (questions.groupId !== questions.turnId) throw new HttpError(400, "Invalid question group");
        const [origin] = await tx.select().from(conversationTurns).where(and(eq(conversationTurns.id, questions.turnId), eq(conversationTurns.sessionId, reviewId), eq(conversationTurns.userId, userId), eq(conversationTurns.status, "completed")));
        if (!origin) throw new HttpError(400, "Unknown question group");
        const [answered] = await tx.select().from(conversationTurns).where(and(eq(conversationTurns.sessionId, reviewId), sql`${conversationTurns.answers}->>'groupId' = ${questions.groupId}`));
        if (answered && answered.id !== turnId) throw new HttpError(409, "Question group already answered");
        const result = trustedQuestionAnswers(questions, (origin.result as ReviewTurnResponse).questions);
        trustedContent = [content, result.content].filter(Boolean).join("\n\n");
        for (const issueId of result.skippedIssueIds) await tx.update(reviewIssues).set({ status: "skipped" }).where(and(eq(reviewIssues.id, issueId), eq(reviewIssues.sessionId, reviewId)));
      }
      if (existing) await tx.update(conversationTurns).set({ status: "running", updatedAt: new Date() }).where(eq(conversationTurns.id, turnId));
      else await tx.insert(conversationTurns).values({ id: turnId, userId, sessionId: reviewId, content, answers: questions ?? null });
      return { status: "claimed", content: trustedContent };
    });
  }

  async failTurn(turnId: string, userId: string) {
    await this.db.update(conversationTurns).set({ status: "failed", updatedAt: new Date() }).where(and(eq(conversationTurns.id, turnId), eq(conversationTurns.userId, userId), eq(conversationTurns.status, "running")));
  }

  async getEditForUser(editId: string, userId: string) {
    const [row] = await this.db.select({ value: proposedEdits }).from(proposedEdits)
      .innerJoin(reviewSessions, eq(reviewSessions.id, proposedEdits.sessionId))
      .innerJoin(projects, eq(projects.id, reviewSessions.projectId))
      .where(and(eq(proposedEdits.id, editId), eq(projects.userId, userId))).limit(1);
    if (!row) return null;
    const value = row.value;
    return { id: value.id, sessionId: value.sessionId, baseVersionId: value.baseVersionId, oldText: value.oldText, newText: value.newText, explanation: value.explanation, status: value.status } satisfies ProposedEdit;
  }

  async rejectEdit(editId: string, userId: string) {
    if (!await this.getEditForUser(editId, userId)) return false;
    return (await this.db.update(proposedEdits).set({ status: "rejected" }).where(and(eq(proposedEdits.id, editId), eq(proposedEdits.status, "pending"))).returning({ id: proposedEdits.id })).length === 1;
  }

  async acceptEdit(editId: string, userId: string, compile: (source: string) => Promise<CompileResult>) {
    const edit = await this.getEditForUser(editId, userId);
    if (!edit || edit.status !== "pending") return null;
    const [owned] = await this.db.select({ value: projects }).from(projects)
      .innerJoin(reviewSessions, eq(reviewSessions.projectId, projects.id))
      .where(and(eq(reviewSessions.id, edit.sessionId), eq(projects.userId, userId))).limit(1);
    if (!owned) return null;
    if (owned.value.currentVersionId !== edit.baseVersionId || !owned.value.currentSource.includes(edit.oldText)) {
      await this.db.update(proposedEdits).set({ status: "stale" }).where(eq(proposedEdits.id, editId));
      return "stale";
    }
    const nextSource = owned.value.currentSource.replace(edit.oldText, edit.newText);
    if (!(await compile(nextSource)).ok) return "compile_failed";
    return await this.db.transaction(async (tx) => {
      const changed = await tx.update(projects).set({ currentSource: nextSource, updatedAt: new Date() })
        .where(and(eq(projects.id, owned.value.id), eq(projects.userId, userId), eq(projects.currentVersionId, edit.baseVersionId))).returning({ id: projects.id });
      if (changed.length !== 1) {
        await tx.update(proposedEdits).set({ status: "stale" }).where(eq(proposedEdits.id, editId));
        return "stale" as const;
      }
      const [snapshot] = await tx.insert(versions).values({ projectId: owned.value.id, parentVersionId: edit.baseVersionId, latexSource: nextSource, createdBy: "ai", reason: edit.explanation }).returning();
      await tx.update(projects).set({ currentVersionId: snapshot.id }).where(eq(projects.id, owned.value.id));
      await tx.update(proposedEdits).set({ status: "accepted" }).where(eq(proposedEdits.id, editId));
      return version(snapshot);
    });
  }

  async listEntitlements(userId: string) {
    const rows = await this.db.select().from(reviewEntitlements).where(eq(reviewEntitlements.userId, userId));
    return rows.map((row): Entitlement => ({ id: row.id, paymentId: row.paymentId, sessionId: row.sessionId, status: row.status, createdAt: row.createdAt }));
  }

  async consumeEntitlement(userId: string, sessionId: string) {
    const rows = await this.db.execute(sql`
      update review_entitlements set status = 'consumed', session_id = ${sessionId}::uuid
      where id = (select id from review_entitlements where user_id = ${userId}::uuid and status = 'available' order by created_at for update skip locked limit 1)
      returning id
    `);
    return rows.length === 1;
  }

  async recordStripePayment(payment: StripePayment) {
    return await this.db.transaction(async (tx) => {
      const userId = payment.userId;
      const inserted = await tx.insert(payments).values({ userId, provider: "stripe", providerPaymentId: payment.providerPaymentId, email: payment.email.toLowerCase(), amount: payment.amount, currency: payment.currency.toUpperCase(), status: payment.status }).onConflictDoNothing().returning();
      if (!inserted[0]) return "duplicate";
      if (!userId || payment.status !== "paid") return "unmatched";
      await tx.insert(reviewEntitlements).values({ userId, paymentId: inserted[0].id, status: "available" }).onConflictDoNothing();
      return "created";
    });
  }
}
