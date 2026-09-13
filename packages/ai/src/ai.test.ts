import { describe, expect, it } from "vitest";
import { buildReviewInput, redactContactDetails } from "./context.js";
import { loadRubric } from "./knowledge.js";

describe("knowledge loader", () => {
  it("loads discipline-specific and general rules", async () => {
    const software = await loadRubric("software");
    expect(software.some((rule) => rule.id === "SWE_IMPACT_001")).toBe(true);
    expect(software.some((rule) => rule.id === "ME_DESIGN_001")).toBe(false);
    expect(software.every((rule) => rule.constraints.may_invent_information === false)).toBe(true);
  });
});

describe("context construction", () => {
  it("removes common contact details and limits recent conversation", () => {
    expect(redactContactDetails("a@example.com +1 (555) 123-4567 body")).not.toContain("example.com");
    const input = buildReviewInput({ discipline: "software", stage: "probing", resume: "a@example.com resume", facts: [], issues: [], rules: [], recentMessages: Array.from({ length: 9 }, (_, i) => ({ role: "user" as const, content: String(i) })) });
    expect(input).not.toContain("a@example.com");
    expect(input).not.toContain('"0"');
    expect(input).toContain('"8"');
  });
});
