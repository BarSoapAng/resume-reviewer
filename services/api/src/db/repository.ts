import { and, count, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { CompileResult, Entitlement, StripePayment, ProposedEdit, ResumeProject, ResumeVersion, ReviewContextSnapshot, ReviewSession, ReviewState, ReviewTurnResponse } from "../domain.js";
import type { Repository } from "../ports.js";
import { payments, projects, proposedEdits, resumeFacts, reviewEntitlements, reviewIssues, reviewMessages, reviewSessions, versions } from "./schema.js";

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
      const [initial] = await tx.insert(versions).values({ projectId: created.id, latexSource: input.source, createdBy: "user", reason: "Initial import" }).returning();
      const [updated] = await tx.update(projects).set({ currentVersionId: initial.id }).where(eq(projects.id, created.id)).returning();
      return project(updated);
    });
  }

  async getProjectForUser(projectId: string, userId: string) {
    const [row] = await this.db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
    return row ? project(row) : null;
  }

  async updateProject(projectId: string, userId: string, patch: Parameters<Repository["updateProject"]>[2]) {
    const [row] = await this.db.update(projects).set({ ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.discipline !== undefined ? { discipline: patch.discipline } : {}), ...(patch.source !== undefined ? { currentSource: patch.source } : {}), updatedAt: new Date() }).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).returning();
    return row ? project(row) : null;
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

  async createReview(projectId: string, userId: string, rubricVersion: string, model: string) {
    const owned = await this.getProjectForUser(projectId, userId);
    if (!owned) return null;
    const [row] = await this.db.insert(reviewSessions).values({ projectId, rubricVersion, model, state: "initial_review" }).returning();
    return review(row);
  }

  async createEntitledReview(projectId: string, userId: string, rubricVersion: string, model: string) {
    if (!await this.getProjectForUser(projectId, userId)) return null;
    return await this.db.transaction(async (tx) => {
      const available = await tx.execute(sql<{ id: string }>`select id from review_entitlements where user_id = ${userId}::uuid and status = 'available' order by created_at for update skip locked limit 1`) as unknown as Array<{ id: string }>;
      if (!available[0]) return "payment_required" as const;
      const sessionId = randomUUID();
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

  async saveReviewTurn(reviewId: string, userId: string, turn: ReviewTurnResponse): Promise<ReviewTurnResponse | null> {
    const session = await this.getReviewForUser(reviewId, userId);
    const context = await this.getReviewContext(reviewId, userId);
    if (!session || !context) return null;
    if (!validTransition(session.state, turn.state)) throw new Error(`Invalid review transition: ${session.state} -> ${turn.state}`);
    return this.db.transaction(async (tx) => {
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

      if (turn.message.trim()) await tx.insert(reviewMessages).values({ sessionId: reviewId, role: "assistant", content: turn.message });
      await tx.update(reviewSessions).set({ state: turn.state, ...(turn.state === "complete" ? { completedAt: new Date() } : {}) }).where(eq(reviewSessions.id, reviewId));
      return { ...turn, facts: savedFacts, issues: savedIssues, questions: turn.questions.map((question) => ({ ...question, issueIds: question.issueIds.map((value) => issueIds.get(value) ?? value).filter(isUuid) })), edits: savedEdits };
    });
  }

  async addReviewMessage(reviewId: string, userId: string, content: string) {
    if (!await this.getReviewForUser(reviewId, userId)) return false;
    const [turns] = await this.db.select({ value: count() }).from(reviewMessages).where(and(eq(reviewMessages.sessionId, reviewId), eq(reviewMessages.role, "user")));
    if (turns.value >= 30) return false;
    await this.db.insert(reviewMessages).values({ sessionId: reviewId, role: "user", content });
    return true;
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
