import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { createCacheKey, PdfCache } from "../src/cache.js";
import { testConfig } from "./helpers.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("PDF cache", () => {
  it("varies the key by source, engine, and package bundle", () => {
    const key = createCacheKey("source", "engine", "bundle");
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(createCacheKey("changed", "engine", "bundle")).not.toBe(key);
    expect(createCacheKey("source", "changed", "bundle")).not.toBe(key);
    expect(createCacheKey("source", "engine", "changed")).not.toBe(key);
  });

  it("round-trips a PDF", async () => {
    const { cacheDirectory } = testConfig();
    directories.push(cacheDirectory);
    const cache = new PdfCache(cacheDirectory, 1024);
    const key = createCacheKey("source", "engine", "bundle");
    await cache.set(key, Buffer.from("pdf"));
    expect(await cache.get(key)).toEqual(Buffer.from("pdf"));
  });
});
