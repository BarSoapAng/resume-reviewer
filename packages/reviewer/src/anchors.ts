import type { SourceAnchor } from "./types.js";

export type ResolvedAnchor = SourceAnchor & { start: number; end: number };

export function resolveSourceAnchor(source: string, anchor: SourceAnchor): ResolvedAnchor | null {
  let cursor = 0;
  for (let found = 0; found <= anchor.occurrence; found += 1) {
    const start = source.indexOf(anchor.exactText, cursor);
    if (start < 0) return null;
    if (found === anchor.occurrence) return { ...anchor, start, end: start + anchor.exactText.length };
    cursor = start + anchor.exactText.length;
  }
  return null;
}

export function isAnchorCurrent(source: string, currentVersionId: string, anchor: SourceAnchor): boolean {
  return anchor.versionId === currentVersionId && resolveSourceAnchor(source, anchor) !== null;
}
