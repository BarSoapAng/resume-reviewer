import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpCompiler } from "../src/compiler.js";

describe("HTTP compiler adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes the compiler service success contract", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      success: true,
      pdfBase64: "cGRm",
      cached: true,
      diagnostics: [],
    }), { status: 200 })));

    await expect(createHttpCompiler("http://compiler:8080").compile("source")).resolves.toEqual({
      ok: true,
      pdfUrl: undefined,
      pdfBase64: "cGRm",
      cached: true,
      diagnostics: [],
    });
  });

  it("returns compilation diagnostics for invalid LaTeX", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      success: false,
      diagnostics: [{ severity: "error", message: "Undefined control sequence", line: 4 }],
    }), { status: 422 })));

    const result = await createHttpCompiler("http://compiler:8080").compile("bad source");
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
  });
});
