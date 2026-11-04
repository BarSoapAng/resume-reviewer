import { describe, expect, it, vi } from "vitest";
import { PostgresRepository } from "../src/db/repository.js";

describe("hosted version save idempotency", () => {
  it.each(["other-project", "different-source", "stale-id"])("rejects a reused %s version ID before changing the project", async (scenario) => {
    const owned = { id: "project", userId: "owner", title: "resume.tex", discipline: "software", currentSource: "old source", currentVersionId: "current-version" };
    const existing = { id: "reused-version", projectId: scenario === "other-project" ? "other" : "project", latexSource: scenario === "different-source" ? "different" : "new source", metadata: { filename: "resume.tex", discipline: "software" } };
    const tx = {
      select: vi.fn().mockReturnValueOnce({ from: () => ({ where: () => ({ for: async () => [owned] }) }) }).mockReturnValueOnce({ from: () => ({ where: async () => [existing] }) }),
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => [] }) }) }),
      update: vi.fn(),
    };
    const repository = new PostgresRepository({ transaction: async (run: (value: typeof tx) => unknown) => run(tx) } as unknown as ConstructorParameters<typeof PostgresRepository>[0]);
    await expect(repository.updateProject("project", "owner", { source: "new source", version: { id: "reused-version", kind: "autosave", reason: "Autosave" } })).rejects.toMatchObject({ statusCode: 409 });
    expect(tx.update).not.toHaveBeenCalled();
  });
});
