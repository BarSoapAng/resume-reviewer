import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCompilerServer } from "../src/http.js";
import type { Compiler } from "../src/compiler.js";
import { testConfig } from "./helpers.js";

const servers: ReturnType<typeof createCompilerServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(async (server) => {
    server.close();
    await once(server, "close");
  }));
});

async function endpointFor(compiler: Compiler, maxRequestBytes = 2048): Promise<string> {
  const server = createCompilerServer(compiler, testConfig({ maxRequestBytes }));
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("compiler HTTP API", () => {
  it("serializes successful PDFs as base64", async () => {
    const compiler = { compile: vi.fn().mockResolvedValue({
      success: true,
      cached: false,
      cacheKey: "key",
      engine: "fake",
      engineVersion: "1",
      durationMs: 1,
      diagnostics: [],
      pdf: Buffer.from("pdf"),
    }) } as unknown as Compiler;
    const endpoint = await endpointFor(compiler);
    const response = await fetch(`${endpoint}/compile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "latex" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ pdfBase64: Buffer.from("pdf").toString("base64") });
  });

  it("rejects oversized request bodies", async () => {
    const compiler = { compile: vi.fn() } as unknown as Compiler;
    const endpoint = await endpointFor(compiler, 10);
    const response = await fetch(`${endpoint}/compile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "a long source" }),
    });
    expect(response.status).toBe(413);
    expect(compiler.compile).not.toHaveBeenCalled();
  });
});
