import { jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const disciplineEnum = pgEnum("discipline", ["software", "mechanical"]);
export const versionCreatorEnum = pgEnum("version_creator", ["user", "ai", "system"]);
export const reviewStateEnum = pgEnum("review_state", ["imported", "initial_review", "probing", "ready_to_edit", "editing", "final_review", "complete"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const severityEnum = pgEnum("issue_severity", ["high", "medium", "low"]);
export const issueStatusEnum = pgEnum("issue_status", ["open", "probing", "resolved", "skipped"]);
export const editStatusEnum = pgEnum("edit_status", ["pending", "accepted", "rejected", "stale"]);
export const entitlementStatusEnum = pgEnum("entitlement_status", ["available", "consumed", "revoked"]);
export const paymentStatusEnum = pgEnum("payment_status", ["paid", "refunded"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("resume_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  discipline: disciplineEnum("discipline").notNull(),
  currentSource: text("current_source").notNull(),
  currentVersionId: uuid("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const versions = pgTable("resume_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  parentVersionId: uuid("parent_version_id"),
  latexSource: text("latex_source").notNull(),
  createdBy: versionCreatorEnum("created_by").notNull(),
  reason: text("reason").notNull(),
  metadata: jsonb("metadata").$type<{ filename?: string; discipline?: "software" | "mechanical"; kind?: string; restoredFromId?: string }>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewSessions = pgTable("review_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  rubricVersion: text("rubric_version").notNull(),
  state: reviewStateEnum("state").notNull().default("imported"),
  model: text("model").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const reviewMessages = pgTable("review_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  turnId: uuid("turn_id"),
  parts: jsonb("parts").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversationTurns = pgTable("conversation_turns", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  content: text("content").notNull(),
  answers: jsonb("answers"),
  status: text("status").notNull().default("running"),
  result: jsonb("result"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resumeFacts = pgTable("resume_facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  subject: text("subject"),
  section: text("section"),
  statement: text("statement").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewIssues = pgTable("review_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  ruleId: text("rule_id").notNull(),
  severity: severityEnum("severity").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  reasoning: text("reasoning").notNull(),
  sourceAnchor: jsonb("source_anchor").notNull(),
  status: issueStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const proposedEdits = pgTable("proposed_edits", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  baseVersionId: uuid("base_version_id").notNull(),
  oldText: text("old_text").notNull(),
  newText: text("new_text").notNull(),
  explanation: text("explanation").notNull(),
  issueIds: uuid("issue_ids").array().notNull().default([]),
  citations: jsonb("citations").notNull().default([]),
  status: editStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  model: text("model").notNull(),
  inputTokens: numeric("input_tokens", { mode: "number" }).notNull(),
  outputTokens: numeric("output_tokens", { mode: "number" }).notNull(),
  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  provider: text("provider").notNull(),
  providerPaymentId: text("provider_payment_id").notNull(),
  email: text("email").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: paymentStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("payments_provider_payment_unique").on(table.provider, table.providerPaymentId)]);

export const reviewEntitlements = pgTable("review_entitlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  paymentId: uuid("payment_id").notNull().unique(),
  sessionId: uuid("session_id").unique(),
  status: entitlementStatusEnum("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
