import type { CompileDiagnostic, DiagnosticSeverity } from "./types.js";

type PendingLocation = { line: number; column?: number };

function severityFor(message: string): DiagnosticSeverity {
  if (/^(error|fatal error)\b|^!/i.test(message)) return "error";
  if (/^warning\b|warning:/i.test(message)) return "warning";
  return "info";
}

function cleanMessage(line: string): string {
  return line
    .replace(/^(error|warning|note):\s*/i, "")
    .replace(/^!\s*/, "")
    .trim();
}

/** Parses Tectonic's human output plus common TeX log error forms. */
export function parseDiagnostics(output: string): CompileDiagnostic[] {
  const diagnostics: CompileDiagnostic[] = [];
  let pendingLocation: PendingLocation | undefined;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const tectonicLocation = line.match(/^-->\s+.*?:(\d+):(\d+)\s*$/);
    if (tectonicLocation) {
      const location = {
        line: Number(tectonicLocation[1]),
        column: Number(tectonicLocation[2]),
      };
      const previous = diagnostics[diagnostics.length - 1];
      if (previous && previous.line === undefined) Object.assign(previous, location);
      else pendingLocation = location;
      continue;
    }

    const texLocation = line.match(/^l\.(\d+)\s*(.*)$/);
    if (texLocation && diagnostics.length > 0) {
      const previous = diagnostics[diagnostics.length - 1];
      if (previous && previous.line === undefined) previous.line = Number(texLocation[1]);
      continue;
    }

    if (/^(error|warning|note):/i.test(line) || /^!\s*/.test(line)) {
      const diagnostic: CompileDiagnostic = {
        severity: severityFor(line),
        message: cleanMessage(line),
      };
      if (pendingLocation) Object.assign(diagnostic, pendingLocation);
      diagnostics.push(diagnostic);
      pendingLocation = undefined;
    }
  }

  return diagnostics;
}

export function truncateDiagnostics(output: string, maxBytes: number): string {
  const bytes = Buffer.from(output, "utf8");
  if (bytes.byteLength <= maxBytes) return output;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n[compiler output truncated]`;
}
