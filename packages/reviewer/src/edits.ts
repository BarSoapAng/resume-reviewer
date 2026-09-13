import type { EditProposal, ResumeFact } from "./schemas.js";
import { validateFactGrounding } from "./grounding.js";

export type EditValidation =
  | { valid: true; source: string }
  | { valid: false; reason: "stale_version" | "old_text_missing" | "ambiguous_anchor" | "ungrounded_claim"; detail?: unknown };

export function validateAndApplyEdit(
  proposal: EditProposal,
  currentVersionId: string,
  source: string,
  facts: readonly ResumeFact[],
): EditValidation {
  if (proposal.versionId !== currentVersionId) return { valid: false, reason: "stale_version" };
  const first = source.indexOf(proposal.oldText);
  if (first < 0) return { valid: false, reason: "old_text_missing" };
  if (source.indexOf(proposal.oldText, first + proposal.oldText.length) >= 0) {
    return { valid: false, reason: "ambiguous_anchor" };
  }
  const grounding = validateFactGrounding(proposal, facts, source);
  if (!grounding.valid) return { valid: false, reason: "ungrounded_claim", detail: grounding.failures };
  return { valid: true, source: `${source.slice(0, first)}${proposal.newText}${source.slice(first + proposal.oldText.length)}` };
}
