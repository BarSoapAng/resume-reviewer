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
      if (!response.ok) throw new Error(`Compiler returned ${response.status}`);
      return await response.json();
    },
  };
}
