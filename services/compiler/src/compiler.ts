import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PdfCache, createCacheKey } from "./cache.js";
import type { CompilerConfig } from "./config.js";
import { parseDiagnostics, truncateDiagnostics } from "./diagnostics.js";
import type { CompilerEngine, CompileResult } from "./types.js";

export class InputLimitError extends Error {}

export class Compiler {
  private readonly cache: PdfCache;

  constructor(
    private readonly engine: CompilerEngine,
    private readonly config: CompilerConfig,
    cache = new PdfCache(config.cacheDirectory, config.maxPdfBytes),
  ) {
    this.cache = cache;
  }

  async compile(source: string): Promise<CompileResult> {
    const sourceBytes = Buffer.byteLength(source, "utf8");
    if (sourceBytes === 0) throw new InputLimitError("LaTeX source cannot be empty");
    if (sourceBytes > this.config.maxSourceBytes) {
      throw new InputLimitError(`LaTeX source exceeds ${this.config.maxSourceBytes} bytes`);
    }

    const cacheKey = createCacheKey(
      source,
      `${this.engine.name}:${this.engine.version}`,
      this.config.packageBundleVersion,
    );
    const cachedPdf = await this.cache.get(cacheKey);
    if (cachedPdf) {
      return {
        success: true,
        cached: true,
        cacheKey,
        engine: this.engine.name,
        engineVersion: this.engine.version,
        durationMs: 0,
        diagnostics: [],
        pdf: cachedPdf,
      };
    }

    const startedAt = performance.now();
    const directory = await mkdtemp(join(tmpdir(), "resume-compile-"));
    try {
      await writeFile(join(directory, "input.tex"), source, { encoding: "utf8", mode: 0o600, flag: "wx" });
      const result = await this.engine.compile(directory, this.config.compileTimeoutMs);
      const combinedOutput = truncateDiagnostics(
        [result.stderr, result.stdout, result.log ?? ""].filter(Boolean).join("\n"),
        this.config.maxDiagnosticBytes,
      );
      const diagnostics = parseDiagnostics(combinedOutput);

      if (result.timedOut) {
        diagnostics.unshift({
          severity: "error",
          message: `Compilation exceeded the ${this.config.compileTimeoutMs}ms time limit`,
        });
      } else if (result.exitCode !== 0 && diagnostics.every(({ severity }) => severity !== "error")) {
        diagnostics.unshift({ severity: "error", message: "LaTeX compilation failed" });
      }

      const validPdf = result.pdf && result.pdf.byteLength > 0 && result.pdf.byteLength <= this.config.maxPdfBytes;
      const success = result.exitCode === 0 && !result.timedOut && Boolean(validPdf);
      if (result.pdf && result.pdf.byteLength > this.config.maxPdfBytes) {
        diagnostics.unshift({
          severity: "error",
          message: `Compiled PDF exceeds ${this.config.maxPdfBytes} bytes`,
        });
      } else if (result.exitCode === 0 && !result.pdf) {
        diagnostics.unshift({ severity: "error", message: "Compiler did not produce a PDF" });
      }

      if (success && result.pdf) await this.cache.set(cacheKey, result.pdf);
      return {
        success,
        cached: false,
        cacheKey,
        engine: this.engine.name,
        engineVersion: this.engine.version,
        durationMs: Math.round(performance.now() - startedAt),
        diagnostics,
        pdf: success ? result.pdf : undefined,
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
