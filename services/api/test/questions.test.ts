import { describe, expect, it } from "vitest";
import { trustedQuestionAnswers } from "../src/questions.js";

const questions = [{ id: "q1", issueIds: ["i1"], text: "Who used the dashboard?" }, { id: "q2", issueIds: ["i2"], text: "What changed?" }];
describe("trusted question answers", () => {
  it("derives question context from stored questions and records empty/skipped answers without facts", () => {
    const result = trustedQuestionAnswers({ turnId: "turn", groupId: "turn", answers: [{ questionId: "q1", state: "answered", answer: "" }, { questionId: "q2", state: "skipped", answer: "untrusted hidden answer" }] }, questions);
    expect(result.content).toContain("Who used the dashboard?");
    expect(result.content).toContain("Response (answered): [No information supplied]");
    expect(result.content).toContain("Response (skipped): [No information supplied]");
    expect(result.content).not.toContain("untrusted hidden answer");
    expect(result.skippedIssueIds).toEqual(["i2"]);
  });
  it("rejects unknown, duplicate, and incomplete question IDs", () => {
    for (const ids of [["q1"], ["q1", "q1"], ["q1", "foreign"]]) {
      expect(() => trustedQuestionAnswers({ turnId: "turn", groupId: "turn", answers: ids.map((questionId) => ({ questionId, state: "unanswered", answer: "" })) }, questions)).toThrow();
    }
  });
});
