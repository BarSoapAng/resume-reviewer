import { resolve } from "node:path";

export type CompilerConfig = {
  host: string;
  port: number;
  maxSourceBytes: number;
  maxRequestBytes: number;
  maxPdfBytes: number;
  maxDiagnosticBytes: number;
  compileTimeoutMs: number;
  cacheDirectory: string;
  packageBundleVersion: string;
  tectonicBinary: string;
  tectonicVersion: string;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received ${JSON.stringify(value)}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CompilerConfig {
  return {
    host: env.HOST ?? "0.0.0.0",
    port: positiveInteger(env.PORT, 8080),
    maxSourceBytes: positiveInteger(env.MAX_SOURCE_BYTES, 512 * 1024),
    maxRequestBytes: positiveInteger(env.MAX_REQUEST_BYTES, 700 * 1024),
    maxPdfBytes: positiveInteger(env.MAX_PDF_BYTES, 10 * 1024 * 1024),
    maxDiagnosticBytes: positiveInteger(env.MAX_DIAGNOSTIC_BYTES, 256 * 1024),
    compileTimeoutMs: positiveInteger(env.COMPILE_TIMEOUT_MS, 15_000),
    cacheDirectory: resolve(env.COMPILER_CACHE_DIR ?? "/tmp/compiler-cache"),
    packageBundleVersion: env.PACKAGE_BUNDLE_VERSION ?? "tectonic-default-v1",
    tectonicBinary: env.TECTONIC_BINARY ?? "tectonic",
    tectonicVersion: env.TECTONIC_VERSION ?? "0.15.0",
  };
}
