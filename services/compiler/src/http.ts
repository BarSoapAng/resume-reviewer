import { createServer as createNodeServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Compiler, InputLimitError } from "./compiler.js";
import type { CompilerConfig } from "./config.js";

type HttpError = Error & { statusCode?: number };

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage, maxBytes: number): Promise<unknown> {
  const advertisedLength = Number(request.headers["content-length"] ?? 0);
  if (advertisedLength > maxBytes) {
    const error: HttpError = new Error("Request body is too large");
    error.statusCode = 413;
    throw error;
  }

  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.byteLength;
    if (received > maxBytes) {
      const error: HttpError = new Error("Request body is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error: HttpError = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

export function createCompilerServer(compiler: Compiler, config: CompilerConfig): Server {
  return createNodeServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://compiler.local");
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }
      if (request.method !== "POST" || url.pathname !== "/compile") {
        sendJson(response, 404, { error: "Not found" });
        return;
      }
      if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, { error: "Content-Type must be application/json" });
        return;
      }

      const body = await readJson(request, config.maxRequestBytes);
      if (typeof body !== "object" || body === null || typeof (body as { source?: unknown }).source !== "string") {
        sendJson(response, 400, { error: "Request must contain a string source field" });
        return;
      }
      const result = await compiler.compile((body as { source: string }).source);
      sendJson(response, result.success ? 200 : 422, {
        ...result,
        pdf: undefined,
        pdfBase64: result.pdf?.toString("base64"),
      });
    } catch (error) {
      if (error instanceof InputLimitError) {
        sendJson(response, 413, { error: error.message });
        return;
      }
      const httpError = error as HttpError;
      if (httpError.statusCode) {
        sendJson(response, httpError.statusCode, { error: httpError.message });
        return;
      }
      console.error("Compilation request failed", error instanceof Error ? error.message : error);
      sendJson(response, 500, { error: "Internal compiler error" });
    }
  }).setTimeout(config.compileTimeoutMs + 5_000);
}
