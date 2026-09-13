import { and, count, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { CompileResult, Entitlement, KofiPayment, ProposedEdit, ResumeProject, ResumeVersion, ReviewSession } from "../domain.js";
import type { Repository } from "../ports.js";
import { payments, projects, proposedEdits, reviewEntitlements, reviewMessages, reviewSessions, versions } from "./schema.js";

type Database = ReturnType<typeof drizzle>;

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

  async recordKofiPayment(payment: KofiPayment) {
    return await this.db.transaction(async (tx) => {
      const users = await tx.execute(sql<{ id: string }>`select id from auth.users where lower(email) = lower(${payment.email}) limit 1`) as unknown as Array<{ id: string }>;
      const userId = users[0]?.id ?? null;
      const inserted = await tx.insert(payments).values({ userId, provider: "kofi", providerPaymentId: payment.providerPaymentId, email: payment.email.toLowerCase(), amount: payment.amount, currency: payment.currency.toUpperCase(), status: payment.status }).onConflictDoNothing().returning();
      if (!inserted[0]) return "duplicate";
      if (!userId || payment.status !== "paid") return "unmatched";
      await tx.insert(reviewEntitlements).values({ userId, paymentId: inserted[0].id, status: "available" }).onConflictDoNothing();
      return "created";
    });
  }
}
