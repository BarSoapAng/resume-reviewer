import { getSession } from "./supabase";

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
    const detail = await response.text();
    let message = detail;
    try { message = (JSON.parse(detail) as { error?: string }).error ?? detail; } catch { /* use response text */ }
    throw new ApiError(response.status, message || `Request failed (${response.status})`);
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

export async function updateProject(projectId: string, patch: { title?: string; discipline?: Discipline; source?: string }) {
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
