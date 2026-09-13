export const disciplines = ["software", "mechanical"] as const;
export type Discipline = (typeof disciplines)[number];

export const reviewStates = [
  "imported",
  "initial_review",
  "probing",
  "ready_to_edit",
  "editing",
  "final_review",
  "complete",
] as const;
export type ReviewState = (typeof reviewStates)[number];

export interface Principal {
  userId: string;
  email: string;
}

export interface ResumeProject {
  id: string;
  userId: string;
  title: string;
  discipline: Discipline;
  currentSource: string;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeVersion {
  id: string;
  projectId: string;
  parentVersionId: string | null;
  latexSource: string;
  createdBy: "user" | "ai" | "system";
  reason: string;
  createdAt: Date;
}

export interface ReviewSession {
  id: string;
  projectId: string;
  rubricVersion: string;
  state: ReviewState;
  model: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface ProposedEdit {
  id: string;
  sessionId: string;
  baseVersionId: string;
  oldText: string;
  newText: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected" | "stale";
}

export interface Entitlement {
  id: string;
  paymentId: string;
  sessionId: string | null;
  status: "available" | "consumed" | "revoked";
  createdAt: Date;
}

export interface KofiPayment {
  providerPaymentId: string;
  email: string;
  amount: string;
  currency: string;
  status: "paid" | "refunded";
}

export interface CompileResult {
  ok: boolean;
  pdfUrl?: string;
  pdfBase64?: string;
  cached?: boolean;
  diagnostics: Array<{ message: string; line?: number }>;
}

export interface ReviewTurnResponse {
  state: ReviewState;
  message: string;
  issues: unknown[];
  questions: unknown[];
  edits: unknown[];
}
