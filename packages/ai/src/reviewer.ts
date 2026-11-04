import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ReviewTurnSchema, type ReviewTurn } from "../../reviewer/src/schemas.js";
import { buildReviewInput, type ReviewContext } from "./context.js";
import { REVIEWER_SYSTEM_POLICY } from "./policy.js";

export type ReviewClient = Pick<OpenAI, "responses">;

export async function runReviewTurn(
  context: ReviewContext,
  options: { client?: ReviewClient; model?: string; onTextDelta?: (delta: string) => void; signal?: AbortSignal } = {},
): Promise<ReviewTurn> {
  const client = options.client ?? new OpenAI();
  const model = options.model ?? process.env.OPENAI_REVIEW_MODEL;
  if (!model) throw new Error("OPENAI_REVIEW_MODEL is required");
  const input = {
    model,
    store: false,
    instructions: REVIEWER_SYSTEM_POLICY,
    input: buildReviewInput(context),
    text: { format: zodTextFormat(ReviewTurnSchema, "review_turn") },
  };
  let response;
  if (options.onTextDelta) {
    const stream = client.responses.stream(input, { signal: options.signal });
    let json = "";
    let emitted = "";
    for await (const event of stream) {
      if (event.type !== "response.output_text.delta") continue;
      json += event.delta;
      const text = partialMessage(json);
      if (text.startsWith(emitted) && text.length > emitted.length) {
        options.onTextDelta(text.slice(emitted.length));
        emitted = text;
      }
    }
    response = await stream.finalResponse();
  } else response = await client.responses.parse(input, { signal: options.signal });
  if (!response.output_parsed) throw new Error("The review model returned no structured output");
  return ReviewTurnSchema.parse(response.output_parsed);
}

/** Decode only the public message field, including JSON escapes split across chunks. */
export function partialMessage(json: string): string {
  const match = /"message"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(json);
  if (!match) return "";
  let value = match[1];
  // A unicode escape may be split midway through its four digits.
  value = value.replace(/\\u[0-9a-fA-F]{0,3}$/, "");
  try { return JSON.parse(`"${value}"`) as string; } catch { return ""; }
}
