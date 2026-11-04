import { loadRubric, runReviewTurn, type ReviewContext, type RubricRule } from "../../../packages/ai/src/index.js";
import { validateReviewTurn, type ReviewTurn } from "../../../packages/reviewer/src/index.js";
import type { Repository, ReviewEngine } from "./ports.js";

type Runner = (context: ReviewContext, options?: { model?: string; onTextDelta?: (delta: string) => void; signal?: AbortSignal }) => Promise<ReviewTurn>;
type RubricLoader = (discipline: "software" | "mechanical") => Promise<RubricRule[]>;

export function createAiReviewer(repository: Repository, dependencies: { runner?: Runner; rubricLoader?: RubricLoader } = {}): ReviewEngine {
  const runner = dependencies.runner ?? runReviewTurn;
  const rubricLoader = dependencies.rubricLoader ?? loadRubric;
  return {
    async runTurn({ session, content, userId, messageId, userFactsText, onTextDelta, signal }) {
      const context = await repository.getReviewContext(session.id, userId);
      if (!context) throw new Error("Review project no longer exists");
      const recentMessages = content && context.recentMessages.at(-1)?.role === "user" && context.recentMessages.at(-1)?.content === content
        ? context.recentMessages.slice(0, -1)
        : context.recentMessages;
      const turn = await runner({
        discipline: context.project.discipline,
        stage: session.state,
        resume: context.project.currentSource,
        facts: context.facts,
        issues: context.issues,
        rules: await rubricLoader(context.project.discipline),
        summary: `Current source version ID: ${context.project.currentVersionId}. Project ID: ${context.project.id}. New resume facts use sourceId ${context.project.currentVersionId}; new facts from the current user message use sourceId ${messageId ?? "current_user_message"}.`,
        recentMessages,
        userMessage: content || undefined,
      }, { model: session.model === "configured" ? undefined : session.model, ...(onTextDelta ? { onTextDelta, signal } : {}) });
      const validation = validateReviewTurn(turn, {
        currentStage: session.state,
        currentVersionId: context.project.currentVersionId ?? "",
        resumeSource: context.project.currentSource,
        existingFacts: context.facts,
        existingIssues: context.issues,
        allowedSourceIds: new Set([context.project.currentVersionId ?? "", ...(content ? [messageId ?? "current_user_message"] : []), ...context.facts.map((fact) => fact.sourceId)]),
      });
      if (!validation.valid) throw new Error(`Invalid review output: ${validation.errors.join(", ")}`);
      const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
      for (const fact of turn.facts) {
        if (context.facts.some((existing) => existing.id === fact.id && existing.statement === fact.statement && existing.sourceId === fact.sourceId)) continue;
        const evidence = fact.source === "resume" ? context.project.currentSource : userFactsText ?? content;
        if (!normalize(evidence).includes(normalize(fact.statement))) throw new Error("Review fact is not supported by its source");
      }
      return {
        reviewedVersionId: context.project.currentVersionId ?? undefined,
        reviewedDiscipline: context.project.discipline,
        state: turn.recommendedTransition ?? turn.stage,
        message: turn.message,
        issues: turn.issues,
        questions: turn.questions,
        facts: turn.facts,
        edits: turn.edits.map((edit) => ({ ...edit, baseVersionId: edit.versionId, status: "pending" as const })),
      };
    },
  };
}
