import { afterEach, expect, it, vi } from "vitest";
import { downloadFilename, migrateVersions, retainVersions, WorkspaceSaver } from "./workspacePersistence";
import type { DocumentSnapshot, SaveState, WorkspaceVersion } from "../../packages/reviewer/src/conversation";

const snapshot: DocumentSnapshot = { documentId: "doc", source: "source", filename: "Angela Resume.tex", discipline: "software" };
afterEach(() => vi.useRealTimers());

it("debounces for five seconds and reports local persistence truthfully", async () => {
  vi.useFakeTimers();
  const states: SaveState[] = [];
  const persist = vi.fn(async () => false);
  const saver = new WorkspaceSaver(persist, (state) => states.push(state));
  saver.schedule(snapshot);
  await vi.advanceTimersByTimeAsync(4999);
  expect(persist).not.toHaveBeenCalled();
  saver.schedule({ ...snapshot, filename: "Updated.tex" });
  await vi.advanceTimersByTimeAsync(5000);
  expect(states).toEqual(["pending", "pending", "saving", "local"]);
  expect(persist).toHaveBeenCalledTimes(1);
  saver.schedule({ ...snapshot, filename: "Updated.tex" });
  expect(states.at(-1)).toBe("local");
});

it("serializes writes and never marks edits saved from an older completion", async () => {
  vi.useFakeTimers();
  let finish!: (hosted: boolean) => void;
  const states: SaveState[] = [];
  const persist = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
  const saver = new WorkspaceSaver(persist, (state) => states.push(state));
  saver.schedule(snapshot);
  await vi.advanceTimersByTimeAsync(5000);
  saver.schedule({ ...snapshot, source: "new" });
  await vi.advanceTimersByTimeAsync(5000);
  expect(persist).toHaveBeenCalledTimes(1);
  finish(true);
  await vi.runAllTimersAsync();
  expect(states).toEqual(["pending", "saving", "pending", "saving", "saved"]);
  expect(persist.mock.calls[1][0].source).toBe("new");
});

it("preserves failed snapshots for retry for both local and remote failures", async () => {
  const states: SaveState[] = [];
  const persist = vi.fn().mockRejectedValueOnce(new Error("storage/network")).mockResolvedValue(true);
  const saver = new WorkspaceSaver(persist, (state) => states.push(state));
  await expect(saver.flush(snapshot)).rejects.toThrow();
  await saver.flush(snapshot);
  expect(states).toEqual(["saving", "failed", "saving", "saved"]);
  expect(persist).toHaveBeenCalledTimes(2);
});

it("saves a revert even when it matches the last completed snapshot", async () => {
  vi.useFakeTimers();
  let finish!: (hosted: boolean) => void;
  const states: SaveState[] = [];
  const persist = vi.fn().mockResolvedValueOnce(true).mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
  const saver = new WorkspaceSaver(persist, (state) => states.push(state));
  await saver.flush(snapshot);
  saver.schedule({ ...snapshot, source: "B" });
  await vi.advanceTimersByTimeAsync(5000);
  saver.schedule(snapshot);
  expect(states.at(-1)).toBe("pending");
  finish(true);
  await vi.advanceTimersByTimeAsync(5000);
  expect(persist.mock.calls.map((call) => call[0].source)).toEqual(["source", "B", "source"]);
  expect(states.at(-1)).toBe("saved");
});

it("restores saved status after a failed intervening write and revert", async () => {
  vi.useFakeTimers();
  let fail!: (error: Error) => void;
  const states: SaveState[] = [];
  const persist = vi.fn().mockResolvedValueOnce(true).mockImplementationOnce(() => new Promise<boolean>((_, reject) => { fail = reject; }));
  const saver = new WorkspaceSaver(persist, (state) => states.push(state));
  await saver.flush(snapshot);
  saver.schedule({ ...snapshot, source: "B" });
  await vi.advanceTimersByTimeAsync(5000);
  saver.schedule(snapshot);
  fail(new Error("network"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(states.at(-1)).toBe("saved");
});

it("pins explicit draft and restore metadata to each serialized write", async () => {
  const persist = vi.fn(async () => true);
  const saver = new WorkspaceSaver(persist, () => undefined);
  const draft: WorkspaceVersion = { ...snapshot, id: "draft", createdAt: "2026-01-01", reason: "Draft before restore", kind: "checkpoint" };
  const restored: WorkspaceVersion = { ...draft, id: "restore", source: "restored", kind: "restore", restoredFromId: "target", reason: "Restored to target timestamp" };
  const first = saver.flush(snapshot, undefined, true, draft);
  const second = saver.flush({ ...snapshot, source: "restored" }, undefined, true, restored);
  await Promise.all([first, second]);
  expect(persist.mock.calls).toEqual([[snapshot, draft], [{ ...snapshot, source: "restored" }, restored]]);
  await saver.flush({ ...snapshot, source: "restored" });
  expect(persist).toHaveBeenCalledTimes(2);
});

it("cancels queued required writes when replacing a document", async () => {
  let finish!: (hosted: boolean) => void;
  const persist = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
  const saver = new WorkspaceSaver(persist, () => undefined);
  const first = saver.flush(snapshot);
  await Promise.resolve();
  await Promise.resolve();
  const queued = saver.flush({ ...snapshot, source: "old restore" }, undefined, true);
  saver.cancel();
  const replacement = saver.flush({ ...snapshot, documentId: "replacement", source: "new upload" }, undefined, true);
  finish(true);
  await Promise.all([first, queued, replacement]);
  expect(persist.mock.calls.map((call) => call[0].source)).toEqual(["source", "new upload"]);
});

it("migrates legacy history, excludes other documents, and retains explicit events independently", () => {
  const migrated = migrateVersions([{ id: "old", source: "old", reason: "Before restore", createdAt: "2026-01-01" }, { id: "other", source: "other", documentId: "another", createdAt: "2026-01-01" }], snapshot);
  expect(migrated).toHaveLength(1);
  expect(migrated[0]).toMatchObject({ filename: snapshot.filename, documentId: "doc", kind: "checkpoint" });
  const autosaves = Array.from({ length: 70 }, (_, id) => ({ ...migrated[0], id: String(id), kind: "autosave" as const }));
  expect(retainVersions([...autosaves, migrated[0]] as WorkspaceVersion[])).toHaveLength(51);
});

it("derives safe PDF names without changing display titles", () => {
  expect(downloadFilename("Angela Resume Updated.tex", true)).toBe("Angela Resume Updated.pdf");
  expect(downloadFilename("folder/name.tex", true)).toBe("folder_name.pdf");
  expect(downloadFilename("resume", true)).toBe("resume.pdf");
});
