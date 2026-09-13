import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function createCacheKey(
  source: string,
  engineVersion: string,
  packageBundleVersion: string,
): string {
  return createHash("sha256")
    .update(source, "utf8")
    .update("\0")
    .update(engineVersion, "utf8")
    .update("\0")
    .update(packageBundleVersion, "utf8")
    .digest("hex");
}

export class PdfCache {
  constructor(
    private readonly directory: string,
    private readonly maxPdfBytes: number,
  ) {}

  private pathFor(key: string): string {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid cache key");
    return join(this.directory, `${key}.pdf`);
  }

  async get(key: string): Promise<Buffer | undefined> {
    const path = this.pathFor(key);
    try {
      const metadata = await stat(path);
      if (metadata.size <= 0 || metadata.size > this.maxPdfBytes) {
        await unlink(path).catch(() => undefined);
        return undefined;
      }
      return await readFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async set(key: string, pdf: Buffer): Promise<void> {
    if (pdf.byteLength <= 0 || pdf.byteLength > this.maxPdfBytes) {
      throw new Error("Compiled PDF exceeds the configured size limit");
    }
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const destination = this.pathFor(key);
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, pdf, { mode: 0o600, flag: "wx" });
    await rename(temporary, destination);
  }
}
