import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ReviewTurnSchema, type ReviewTurn } from "../../reviewer/src/schemas.js";
import { buildReviewInput, type ReviewContext } from "./context.js";
import { REVIEWER_SYSTEM_POLICY } from "./policy.js";

export type ReviewClient = Pick<OpenAI, "responses">;

export async function runReviewTurn(
  context: ReviewContext,
  options: { client?: ReviewClient; model?: string } = {},
): Promise<ReviewTurn> {
  const client = options.client ?? new OpenAI();
  const model = options.model ?? process.env.OPENAI_REVIEW_MODEL;
  if (!model) throw new Error("OPENAI_REVIEW_MODEL is required");
  const response = await client.responses.parse({
    model,
    store: false,
    instructions: REVIEWER_SYSTEM_POLICY,
    input: buildReviewInput(context),
    text: { format: zodTextFormat(ReviewTurnSchema, "review_turn") },
  });
  if (!response.output_parsed) throw new Error("The review model returned no structured output");
  return ReviewTurnSchema.parse(response.output_parsed);
}
