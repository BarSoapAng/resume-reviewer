import { describe, expect, it, vi } from "vitest";
import { partialMessage, runReviewTurn, type ReviewClient } from "./reviewer.js";

describe("review provider streaming", () => {
  it("decodes public text across escaped and unicode chunk boundaries without structured JSON", () => {
    expect(partialMessage('{"stage":"probing","message":"Hello ')).toBe("Hello ");
    expect(partialMessage('{"message":"Hello \\u20')).toBe("Hello ");
    expect(partialMessage('{"message":"Hello \\u2014\\nworld","issues":[')).toBe("Hello —\nworld");
    expect(partialMessage('{"issues":[{"description":"Issue"}]}')).toBe("");
  });
  it("forwards real provider deltas before the final structured response", async () => {
    const onTextDelta = vi.fn();
    const turn = { stage: "probing", message: "Hello world", issues: [], questions: [], facts: [], edits: [], recommendedTransition: null };
    const finalResponse = vi.fn(async () => {
      expect(onTextDelta.mock.calls).toEqual([["Hello "], ["world"]]);
      return { output_parsed: turn };
    });
    const client = { responses: { stream: vi.fn(() => ({ async *[Symbol.asyncIterator]() { yield { type: "response.output_text.delta", delta: '{"message":"Hello ' }; yield { type: "response.output_text.delta", delta: 'world"}' }; }, finalResponse })) } } as unknown as ReviewClient;
    await expect(runReviewTurn({ discipline: "software", stage: "probing", resume: "resume", facts: [], issues: [], rules: [] }, { client, model: "test", onTextDelta })).resolves.toMatchObject({ message: "Hello world" });
  });
});
