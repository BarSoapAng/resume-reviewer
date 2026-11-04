export type DocumentSnapshot = { documentId: string; source: string; filename: string; discipline: "software" | "mechanical" };
export type SaveState = "pending" | "saving" | "saved" | "local" | "failed";
export type WorkspaceVersion = DocumentSnapshot & { id: string; createdAt: string; reason: string; kind: "autosave" | "checkpoint" | "upload" | "edit" | "restore"; restoredFromId?: string };
export type ConversationQuestion = { id: string; issueIds: string[]; text: string; priority?: "high" | "medium" | "low" };
export type QuestionResponse = { questionId: string; state: "answered" | "skipped" | "unanswered"; answer: string };
export type QuestionSubmission = { turnId: string; groupId: string; answers: QuestionResponse[] };
export type ConversationPart =
  | { type: "text"; text: string }
  | { type: "tool"; toolCallId: string; name: string; state: "started" | "completed" }
  | { type: "questions"; groupId: string; questions: ConversationQuestion[]; answers?: QuestionResponse[] }
  | { type: "edits"; editIds: string[] };
export type ConversationMessage = { id: string; turnId: string; documentId: string; role: "user" | "assistant"; content: string; parts: ConversationPart[] };
export type ReviewStreamEvent<T> = { turnId: string; eventId: string } & (
  | { type: "turn_start"; reviewId: string }
  | { type: "text_delta"; delta: string }
  | { type: "tool_start" | "tool_complete"; toolCallId: string; name: string }
  | { type: "question_group"; groupId: string; questions: ConversationQuestion[] }
  | { type: "turn_final"; turn: T }
  | { type: "error"; message: string }
);
