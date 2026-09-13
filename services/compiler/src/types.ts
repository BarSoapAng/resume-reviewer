export type DiagnosticSeverity = "error" | "warning" | "info";

export type CompileDiagnostic = {
  severity: DiagnosticSeverity;
  message: string;
  line?: number;
  column?: number;
};

export type EngineResult = {
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  pdf?: Buffer;
  log?: string;
};

export type CompilerEngine = {
  readonly name: string;
  readonly version: string;
  compile(workDirectory: string, timeoutMs: number): Promise<EngineResult>;
};

export type CompileResult = {
  success: boolean;
  cacheKey: string;
  cached: boolean;
  engine: string;
  engineVersion: string;
  durationMs: number;
  diagnostics: CompileDiagnostic[];
  pdf?: Buffer;
};
