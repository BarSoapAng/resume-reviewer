import { loadRubric, runReviewTurn, type ReviewContext, type RubricRule } from "../../../packages/ai/src/index.js";
import type { ReviewTurn } from "../../../packages/reviewer/src/index.js";
import type { Repository, ReviewEngine } from "./ports.js";

type Runner = (context: ReviewContext, options?: { model?: string }) => Promise<ReviewTurn>;
type RubricLoader = (discipline: "software" | "mechanical") => Promise<RubricRule[]>;

export function createAiReviewer(repository: Repository, dependencies: { runner?: Runner; rubricLoader?: RubricLoader } = {}): ReviewEngine {
  const runner = dependencies.runner ?? runReviewTurn;
  const rubricLoader = dependencies.rubricLoader ?? loadRubric;
  return {
    async runTurn({ session, content, userId }) {
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
        recentMessages,
        userMessage: content || undefined,
      }, { model: session.model === "configured" ? undefined : session.model });
      return {
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
