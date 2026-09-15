import type { Compiler } from "./ports.js";

export function createHttpCompiler(baseUrl: string, token?: string): Compiler {
  return {
    async compile(source) {
      const response = await fetch(new URL("/compile", baseUrl), {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ source }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok && response.status !== 422) throw new Error(`Compiler returned ${response.status}`);
      const result = await response.json() as {
        success?: boolean;
        ok?: boolean;
        pdfUrl?: string;
        pdfBase64?: string;
        cached?: boolean;
        diagnostics?: Array<{ message: string; line?: number; column?: number; severity?: "error" | "warning" }>;
      };
      return {
        ok: result.ok ?? result.success ?? false,
        pdfUrl: result.pdfUrl,
        pdfBase64: result.pdfBase64,
        cached: result.cached,
        diagnostics: result.diagnostics ?? [],
      };
    },
  };
}
