import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CompilerConfig } from "../src/config.js";

export function testConfig(overrides: Partial<CompilerConfig> = {}): CompilerConfig {
  return {
    host: "127.0.0.1",
    port: 8080,
    maxSourceBytes: 1024,
    maxRequestBytes: 2048,
    maxPdfBytes: 4096,
    maxDiagnosticBytes: 2048,
    compileTimeoutMs: 100,
    cacheDirectory: join(tmpdir(), `compiler-test-${process.pid}-${Math.random()}`),
    packageBundleVersion: "test-bundle",
    tectonicBinary: "tectonic",
    tectonicVersion: "test-version",
    ...overrides,
  };
}
