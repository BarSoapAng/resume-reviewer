import { createApp } from "./app.js";
import { createSupabaseAuthenticator } from "./auth.js";
import { createHttpCompiler } from "./compiler.js";
import { connectRepository } from "./db/repository.js";
import { createAiReviewer } from "./reviewer-adapter.js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const database = connectRepository(required("DATABASE_URL"));
const reviewer = createAiReviewer(database.repository);
const requireReviewEntitlement = process.env.REQUIRE_REVIEW_ENTITLEMENT !== "false";
const app = await createApp({
  repository: database.repository,
  authenticator: createSupabaseAuthenticator(required("SUPABASE_URL"), required("SUPABASE_PUBLISHABLE_KEY")),
  compiler: createHttpCompiler(required("COMPILER_URL"), process.env.COMPILER_TOKEN),
  reviewer,
  kofiVerificationToken: requireReviewEntitlement ? required("KOFI_VERIFICATION_TOKEN") : process.env.KOFI_VERIFICATION_TOKEN ?? "disabled",
  corsOrigin: process.env.WEB_ORIGIN,
  requireReviewEntitlement,
});

const close = async () => { await app.close(); await database.close(); };
process.on("SIGINT", close);
process.on("SIGTERM", close);
await app.listen({ host: process.env.HOST ?? "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
