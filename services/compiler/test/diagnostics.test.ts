import { describe, expect, it } from "vitest";
import { parseDiagnostics, truncateDiagnostics } from "../src/diagnostics.js";

describe("parseDiagnostics", () => {
  it("parses Tectonic severity and source location", () => {
    const result = parseDiagnostics([
      "warning: unused option",
      "error: Undefined control sequence",
      "  --> input.tex:18:7",
    ].join("\n"));

    expect(result).toEqual([
      { severity: "warning", message: "unused option" },
      { severity: "error", message: "Undefined control sequence", line: 18, column: 7 },
    ]);
  });

  it("parses classic TeX line locations", () => {
    expect(parseDiagnostics("! Undefined control sequence.\nl.42 \\badcommand")).toEqual([
      { severity: "error", message: "Undefined control sequence.", line: 42 },
    ]);
  });

  it("bounds raw compiler output", () => {
    expect(Buffer.byteLength(truncateDiagnostics("abcdefgh", 4))).toBeLessThan(64);
    expect(truncateDiagnostics("abcdefgh", 4)).toContain("abcd");
  });
});
