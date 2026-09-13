import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Compiler, InputLimitError } from "../src/compiler.js";
import type { CompilerEngine, EngineResult } from "../src/types.js";
import { testConfig } from "./helpers.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function fakeEngine(result: EngineResult): CompilerEngine {
  return { name: "fake", version: "1", compile: vi.fn().mockResolvedValue(result) };
}

describe("Compiler", () => {
  it("rejects source over the byte limit before invoking the engine", async () => {
    const config = testConfig({ maxSourceBytes: 3 });
    directories.push(config.cacheDirectory);
    const engine = fakeEngine({ exitCode: 0, timedOut: false, stdout: "", stderr: "", pdf: Buffer.from("pdf") });
    const compiler = new Compiler(engine, config);
    await expect(compiler.compile("four")).rejects.toBeInstanceOf(InputLimitError);
    expect(engine.compile).not.toHaveBeenCalled();
  });

  it("caches successful compilation by content and versions", async () => {
    const config = testConfig();
    directories.push(config.cacheDirectory);
    const engine = fakeEngine({ exitCode: 0, timedOut: false, stdout: "", stderr: "", pdf: Buffer.from("pdf") });
    const compiler = new Compiler(engine, config);

    expect((await compiler.compile("source")).cached).toBe(false);
    const cached = await compiler.compile("source");
    expect(cached.cached).toBe(true);
    expect(cached.pdf).toEqual(Buffer.from("pdf"));
    expect(engine.compile).toHaveBeenCalledTimes(1);
  });

  it("returns useful timeout diagnostics and does not cache failures", async () => {
    const config = testConfig();
    directories.push(config.cacheDirectory);
    const engine = fakeEngine({ exitCode: null, timedOut: true, stdout: "", stderr: "" });
    const compiler = new Compiler(engine, config);
    const first = await compiler.compile("source");
    const second = await compiler.compile("source");

    expect(first.success).toBe(false);
    expect(first.diagnostics[0]?.message).toContain("time limit");
    expect(second.cached).toBe(false);
    expect(engine.compile).toHaveBeenCalledTimes(2);
  });

  it("returns parsed compiler diagnostics on a failed compile", async () => {
    const config = testConfig();
    directories.push(config.cacheDirectory);
    const compiler = new Compiler(fakeEngine({
      exitCode: 1,
      timedOut: false,
      stdout: "",
      stderr: "! Missing } inserted.\nl.9 \\item Broken",
    }), config);

    expect((await compiler.compile("source")).diagnostics).toEqual([
      { severity: "error", message: "Missing } inserted.", line: 9 },
    ]);
  });
});
