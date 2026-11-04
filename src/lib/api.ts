import { getSession } from "./supabase";
import type { QuestionSubmission, ReviewStreamEvent, WorkspaceVersion } from "../../packages/reviewer/src/conversation";

export type Discipline = "software" | "mechanical";
export type ReviewState =
  | "imported"
  | "initial_review"
  | "probing"
  | "ready_to_edit"
  | "editing"
  | "final_review"
  | "complete";

export type SourceAnchor = {
  versionId: string;
  exactText: string;
  occurrence: number;
};

export type ReviewIssue = {
  id: string;
  ruleId: string;
  severity: "high" | "medium" | "low";
  category: string;
  description: string;
  reasoning: string;
  sourceAnchor: SourceAnchor;
  status: "open" | "probing" | "resolved" | "skipped";
};

export type EditProposal = {
  id: string;
  baseVersionId: string;
  issueIds: string[];
  oldText: string;
  newText: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected" | "stale";
};

export type ReviewTurn = {
  id?: string;
  state: ReviewState;
  message: string;
  issues: ReviewIssue[];
  questions: Array<{ id: string; issueIds: string[]; text: string }>;
  edits: EditProposal[];
};

export type CompileDiagnostic = {
  severity: "error" | "warning";
  message: string;
  line?: number;
  column?: number;
};

export type CompileResult = {
  pdfUrl?: string;
  pdfBase64?: string;
  diagnostics: CompileDiagnostic[];
  cached?: boolean;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

function safeApiMessage(status: number) {
  return status === 401 ? "Please sign in to start your review." : status === 402 ? "A payment is needed to start this review." : status === 422 ? "Please check your source or answers and try again." : "We couldn’t complete this request. Please try again.";
}

export async function readReviewStream(response: Response, onEvent: (event: ReviewStreamEvent<ReviewTurn & { id?: string }>) => void) {
  if (!response.ok) throw new ApiError(response.status, safeApiMessage(response.status));
  if (!response.body) throw new Error("The review connection was interrupted. Try sending your message again.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", finalized = false;
  const seen = new Set<string>();
  let turnId: string | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as ReviewStreamEvent<ReviewTurn>;
    if (!event.eventId || !event.turnId || (turnId && event.turnId !== turnId)) throw new Error("Invalid review stream");
    turnId = event.turnId;
    if (seen.has(event.eventId)) return;
    seen.add(event.eventId);
    if (event.type === "error") throw new Error("The review connection was interrupted. Try sending your message again.");
    if (finalized) throw new Error("Invalid review stream order");
    if (event.type === "turn_final") finalized = true;
    onEvent(event);
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) { consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); }
      if (done) break;
    }
    consume(buffer);
    if (!finalized) throw new Error("The review connection was interrupted. Try sending your message again.");
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export async function streamReview(path: string, input: { turnId: string; content?: string; questions?: QuestionSubmission }, onEvent: Parameters<typeof readReviewStream>[1], signal?: AbortSignal) {
  const session = await getSession();
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", signal, headers: {
    "Content-Type": "application/json", Accept: "application/x-ndjson",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }, body: JSON.stringify(input) });
  await readReviewStream(response, onEvent);
}

export function listProjectVersions(projectId: string) {
  return request<WorkspaceVersion[]>(`/api/projects/${projectId}/versions`);
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getSession();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, safeApiMessage(response.status));
  }

  return response.json() as Promise<T>;
}

export async function compileLatex(source: string): Promise<CompileResult> {
  return request<CompileResult>("/api/compile", {
    method: "POST",
    body: JSON.stringify({ source }),
  });
}

export async function createProject(title: string, discipline: Discipline, source: string) {
  return request<{ id: string; currentVersionId: string }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ title, discipline, currentSource: source }),
  });
}

export async function updateProject(projectId: string, patch: { title?: string; discipline?: Discipline; source?: string; version?: Pick<WorkspaceVersion, "id" | "reason" | "kind" | "restoredFromId" | "createdAt"> }) {
  return request<{ id: string; currentSource: string }>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function startReview(projectId: string): Promise<ReviewTurn & { id: string }> {
  return request<ReviewTurn & { id: string }>(`/api/projects/${projectId}/reviews`, { method: "POST" });
}

export async function sendReviewMessage(reviewId: string, content: string): Promise<ReviewTurn> {
  return request<ReviewTurn>(`/api/reviews/${reviewId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function decideEdit(editId: string, decision: "accept" | "reject") {
  return request<{ source?: string; versionId?: string; status: EditProposal["status"] }>(
    `/api/edits/${editId}/${decision}`,
    { method: "POST" },
  );
}

export async function createCheckout() {
  return request<{ url: string }>("/api/payments/checkout", { method: "POST" });
}
