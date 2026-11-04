import type {
  CompileResult,
  Discipline,
  Entitlement,
  StripePayment,
  Principal,
  ProposedEdit,
  ResumeProject,
  ResumeVersion,
  ReviewSession,
  ReviewContextSnapshot,
  ReviewTurnResponse,
} from "./domain.js";

export interface Authenticator {
  authenticate(token: string): Promise<Principal | null>;
}

export interface Repository {
  createProject(input: { userId: string; title: string; discipline: Discipline; source: string }): Promise<ResumeProject>;
  getProjectForUser(projectId: string, userId: string): Promise<ResumeProject | null>;
  updateProject(projectId: string, userId: string, patch: { title?: string; discipline?: Discipline; source?: string }): Promise<ResumeProject | null>;
  deleteProject(projectId: string, userId: string): Promise<boolean>;
  createInitialVersion(project: ResumeProject): Promise<ResumeVersion>;
  getVersionForUser(versionId: string, userId: string): Promise<ResumeVersion | null>;
  restoreVersion(versionId: string, userId: string): Promise<ResumeVersion | null>;
  createReview(projectId: string, userId: string, rubricVersion: string, model: string): Promise<ReviewSession | null>;
  createEntitledReview(projectId: string, userId: string, rubricVersion: string, model: string): Promise<ReviewSession | "payment_required" | null>;
  getReviewForUser(reviewId: string, userId: string): Promise<ReviewSession | null>;
  getReviewContext(reviewId: string, userId: string): Promise<ReviewContextSnapshot | null>;
  saveReviewTurn(reviewId: string, userId: string, turn: ReviewTurnResponse): Promise<ReviewTurnResponse | null>;
  addReviewMessage(reviewId: string, userId: string, content: string): Promise<boolean>;
  getEditForUser(editId: string, userId: string): Promise<ProposedEdit | null>;
  rejectEdit(editId: string, userId: string): Promise<boolean>;
  acceptEdit(editId: string, userId: string, compile: (source: string) => Promise<CompileResult>): Promise<ResumeVersion | "stale" | "compile_failed" | null>;
  listEntitlements(userId: string): Promise<Entitlement[]>;
  consumeEntitlement(userId: string, sessionId: string): Promise<boolean>;
  recordStripePayment(payment: StripePayment): Promise<"created" | "duplicate" | "unmatched">;
}

export interface Compiler {
  compile(source: string): Promise<CompileResult>;
}

export interface ReviewEngine {
  runTurn(input: { session: ReviewSession; content: string; userId: string }): Promise<ReviewTurnResponse>;
}
