import { createApp } from "./app.js";
import { loadRubric, runReviewTurn } from "../../../packages/ai/src/index.js";
import { createSupabaseAuthenticator } from "./auth.js";
import { createHttpCompiler } from "./compiler.js";
import { connectRepository } from "./db/repository.js";
import type { ReviewEngine } from "./ports.js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const database = connectRepository(required("DATABASE_URL"));
const reviewer: ReviewEngine = {
  async runTurn({ session, content, userId }) {
    const project = await database.repository.getProjectForUser(session.projectId, userId);
    if (!project) throw new Error("Review project no longer exists");
    const turn = await runReviewTurn({
      discipline: project.discipline,
      stage: session.state,
      resume: project.currentSource,
      facts: [],
      issues: [],
      rules: await loadRubric(project.discipline),
      userMessage: content || undefined,
    }, { model: session.model === "configured" ? undefined : session.model });
    return {
      state: turn.stage,
      message: turn.message,
      issues: turn.issues,
      questions: turn.questions,
      edits: turn.edits.map((edit) => ({ ...edit, baseVersionId: edit.versionId })),
    };
  },
};
const app = await createApp({
  repository: database.repository,
  authenticator: createSupabaseAuthenticator(required("SUPABASE_URL"), required("SUPABASE_ANON_KEY")),
  compiler: createHttpCompiler(required("COMPILER_URL"), process.env.COMPILER_TOKEN),
  reviewer,
  kofiVerificationToken: required("KOFI_VERIFICATION_TOKEN"),
  corsOrigin: process.env.WEB_ORIGIN,
});

const close = async () => { await app.close(); await database.close(); };
process.on("SIGINT", close);
process.on("SIGTERM", close);
await app.listen({ host: process.env.HOST ?? "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
