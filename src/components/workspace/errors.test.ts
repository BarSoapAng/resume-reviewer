import { describe, expect, it } from "vitest";
import { safeReviewError } from "./errors";

describe("safe review notifications", () => {
  it("keeps provider details, response bodies and stack traces out of notifications", () => {
    for (const error of ["SQL failure: secret-table", '{"provider":"internal","error":"secret"}', "TypeError at internal.js:10"]) {
      expect(safeReviewError(error)).toBe("The review connection was interrupted. Try sending your message again.");
    }
  });
  it("keeps actionable recovery for known failures", () => {
    expect(safeReviewError("Please sign in")).toContain("sign in");
    expect(safeReviewError("Payment required")).toContain("payment");
    expect(safeReviewError("Save failed")).toContain("Retry saving");
  });
});
