import type { Discipline, ResumeFact, ReviewIssue, ReviewStage } from "../../reviewer/src/schemas.js";
import type { RubricRule } from "./knowledge.js";

export type ConversationMessage = { role: "user" | "assistant"; content: string };
export type ReviewContext = {
  discipline: Discipline;
  stage: ReviewStage;
  resume: string;
  facts: readonly ResumeFact[];
  issues: readonly ReviewIssue[];
  rules: readonly RubricRule[];
  summary?: string;
  recentMessages?: readonly ConversationMessage[];
  userMessage?: string;
};

export function redactContactDetails(source: string): string {
  return source
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/(?:\+?\d[\s().-]*){8,}/g, "[phone removed]")
    .replace(/\\href\{(?:mailto:|tel:)[^}]+\}\{[^}]*\}/g, "[contact removed]");
}

export function buildReviewInput(context: ReviewContext): string {
  return [
    `DISCIPLINE\n${context.discipline}`,
    `APPLICATION-OWNED STAGE\n${context.stage}`,
    `RELEVANT RULES\n${JSON.stringify(context.rules)}`,
    `CURRENT RESUME\n${redactContactDetails(context.resume)}`,
    `VERIFIED FACT LEDGER\n${JSON.stringify(context.facts)}`,
    `CURRENT ISSUES\n${JSON.stringify(context.issues.filter((issue) => issue.status === "open" || issue.status === "probing"))}`,
    `RESOLVED ISSUES\n${JSON.stringify(context.issues.filter((issue) => issue.status === "resolved" || issue.status === "skipped"))}`,
    context.summary ? `CONVERSATION SUMMARY\n${context.summary}` : "",
    context.recentMessages?.length ? `RECENT CONVERSATION\n${JSON.stringify(context.recentMessages.slice(-6))}` : "",
    context.userMessage ? `CURRENT USER MESSAGE\n${context.userMessage}` : "",
  ].filter(Boolean).join("\n\n");
}
