import type { DocumentSnapshot, SaveState, WorkspaceVersion } from "../../packages/reviewer/src/conversation";

export function downloadFilename(title: string, pdf = false) {
  const name = Array.from(title, (char) => char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? "_" : char).join("").replace(/[. ]+$/, "") || "resume.tex";
  return pdf ? `${name.replace(/\.[^.]+$/, "")}.pdf` : name;
}

// Keep 50 ordinary autosaves and 100 explicit events independently, per document.
export function retainVersions(versions: WorkspaceVersion[]) {
  let autosaves = 0, events = 0;
  return versions.filter((version) => version.kind === "autosave" ? ++autosaves <= 50 : ++events <= 100);
}

export function migrateVersions(raw: unknown, snapshot: DocumentSnapshot): WorkspaceVersion[] {
  if (!Array.isArray(raw)) return [];
  return retainVersions(raw.filter((v) => v && typeof v.id === "string" && typeof v.source === "string" && typeof v.createdAt === "string" && (!v.documentId || v.documentId === snapshot.documentId)).map((v) => ({
    ...snapshot, ...v, documentId: snapshot.documentId, kind: v.kind ?? "checkpoint", reason: typeof v.reason === "string" ? v.reason : "Checkpoint",
  })));
}

export class WorkspaceSaver {
  private timer?: ReturnType<typeof setTimeout>;
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;
  private generation = 0;
  private saved = "";
  private savedState: SaveState = "local";
  private writing = false;
  constructor(private persist: (snapshot: DocumentSnapshot, version?: WorkspaceVersion) => Promise<boolean>, private status: (state: SaveState) => void) {}
  schedule(snapshot: DocumentSnapshot) {
    clearTimeout(this.timer);
    const revision = ++this.revision;
    if (!this.writing && JSON.stringify(snapshot) === this.saved) { this.status(this.savedState); return; }
    this.status("pending");
    this.timer = setTimeout(() => { void this.flush(snapshot, revision).catch(() => undefined); }, 5000);
  }
  flush(snapshot: DocumentSnapshot, revision = this.revision, required = false, version?: WorkspaceVersion): Promise<void> {
    clearTimeout(this.timer);
    const generation = this.generation;
    const task = this.queue.catch(() => undefined).then(async () => {
      if (generation !== this.generation) return;
      if (!required && revision !== this.revision) return;
      if (!version && JSON.stringify(snapshot) === this.saved) {
        if (revision === this.revision) this.status(this.savedState);
        return;
      }
      this.status("saving");
      this.writing = true;
      try {
        const hosted = await this.persist(snapshot, version);
        this.saved = JSON.stringify(snapshot);
        this.savedState = hosted ? "saved" : "local";
        if (revision === this.revision) this.status(this.savedState);
      } catch (error) {
        if (revision === this.revision) this.status("failed");
        throw error;
      } finally { this.writing = false; }
    });
    this.queue = task;
    return task;
  }
  cancel() { clearTimeout(this.timer); ++this.revision; ++this.generation; this.saved = ""; }
  invalidate() { this.saved = ""; }
}
