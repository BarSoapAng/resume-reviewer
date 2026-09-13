import type { EditProposal, ResumeFact } from "./schemas.js";

export type GroundingFailure = { code: "unknown_fact" | "source_missing" | "claim_missing" | "unsupported_quantity"; detail: string };
export type GroundingResult = { valid: true } | { valid: false; failures: GroundingFailure[] };

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/\\[a-zA-Z]+|[^\p{L}\p{N}%+.-]+/gu, " ").replace(/\s+/g, " ").trim();
}

/** Validates explicit claim-to-source chains. It deliberately does not guess semantic entailment. */
export function validateFactGrounding(
  proposal: EditProposal,
  facts: readonly ResumeFact[],
  resumeSource: string,
): GroundingResult {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  const failures: GroundingFailure[] = [];

  for (const citation of proposal.citations) {
    const fact = byId.get(citation.factId);
    if (!fact) {
      failures.push({ code: "unknown_fact", detail: citation.factId });
      continue;
    }
    if (!normalized(proposal.newText).includes(normalized(citation.claim)) || !normalized(fact.statement).includes(normalized(citation.claim))) {
      failures.push({ code: "claim_missing", detail: citation.claim });
    }
    if (fact.source === "resume" && !normalized(resumeSource).includes(normalized(fact.statement))) {
      failures.push({ code: "source_missing", detail: fact.id });
    }
  }

  const oldQuantities = new Set(normalized(proposal.oldText).match(/(?:~|\b)\d[\d,.]*(?:%|ms|kg|mm|cm|m|n|kn|x)?\b/g) ?? []);
  const supported = normalized(proposal.citations.map((citation) => byId.get(citation.factId)?.statement ?? "").join(" "));
  for (const quantity of normalized(proposal.newText).match(/(?:~|\b)\d[\d,.]*(?:%|ms|kg|mm|cm|m|n|kn|x)?\b/g) ?? []) {
    if (!oldQuantities.has(quantity) && !supported.includes(quantity)) failures.push({ code: "unsupported_quantity", detail: quantity });
  }

  return failures.length === 0 ? { valid: true } : { valid: false, failures };
}

export function validateNewFacts(facts: readonly ResumeFact[], allowedSourceIds: ReadonlySet<string>): GroundingResult {
  const failures = facts
    .filter((fact) => !allowedSourceIds.has(fact.sourceId))
    .map((fact) => ({ code: "source_missing" as const, detail: fact.id }));
  return failures.length === 0 ? { valid: true } : { valid: false, failures };
}
