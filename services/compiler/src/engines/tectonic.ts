import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CompilerEngine, EngineResult } from "../types.js";

function appendBounded(current: Buffer[], chunk: Buffer, currentBytes: number, limit: number): number {
  const remaining = limit - currentBytes;
  if (remaining <= 0) return currentBytes;
  current.push(chunk.subarray(0, remaining));
  return currentBytes + Math.min(chunk.byteLength, remaining);
}

export class TectonicEngine implements CompilerEngine {
  readonly name = "tectonic";

  constructor(
    readonly version: string,
    private readonly binary: string,
    private readonly maxOutputBytes: number,
  ) {}

  async compile(workDirectory: string, timeoutMs: number): Promise<EngineResult> {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;

    const child = spawn(
      this.binary,
      ["--untrusted", "--only-cached", "--keep-logs", "--outdir", workDirectory, "input.tex"],
      {
        cwd: workDirectory,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          TECTONIC_UNTRUSTED_MODE: "1",
          HOME: workDirectory,
          TMPDIR: workDirectory,
          XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
          XDG_CONFIG_HOME: workDirectory,
        },
      },
    );

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes = appendBounded(stdout, chunk, stdoutBytes, this.maxOutputBytes);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes = appendBounded(stderr, chunk, stderrBytes, this.maxOutputBytes);
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    timeout.unref();

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    }).finally(() => clearTimeout(timeout));

    const pdf = await readFile(join(workDirectory, "input.pdf")).catch(() => undefined);
    const log = await readFile(join(workDirectory, "input.log"), "utf8").catch(() => undefined);
    return {
      exitCode,
      timedOut,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
      pdf,
      log,
    };
  }
}
