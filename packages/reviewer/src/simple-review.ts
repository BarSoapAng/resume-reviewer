import type { Discipline, Question, ReviewIssue } from "./schemas.js";

export type ReviewSummary = { issues: ReviewIssue[]; questions: Question[]; proposedDirection: string[] };

function linesOf(source: string): string[] {
  return source.split(/\r?\n/).map((line) => line.trim()).filter((line) => /\\item\b|^[•*-]\s/.test(line));
}

function isSubstantive(line: string): boolean {
  const hasAction = /\b(built|designed|developed|implemented|reduced|increased|validated|manufactured|tested|analyzed|optimized|led|created)\b/i.test(line);
  const hasEvidence = /\d|\b(by|using|through|resulting|enabling|to support|under)\b/i.test(line);
  return hasAction && hasEvidence && line.length >= 70;
}

export function reviewResume(source: string, discipline: Discipline, versionId = "input"): ReviewSummary {
  const issues: ReviewIssue[] = [];
  const questions: Question[] = [];
  for (const [index, line] of linesOf(source).entries()) {
    if (isSubstantive(line)) continue;
    const vague = /\b(helped|worked on|responsible for|assisted|improved|various|designed|built|tested)\b/i.test(line);
    if (!vague) continue;
    const id = `issue-${index + 1}`;
    issues.push({
      id,
      ruleId: discipline === "software" ? "SWE_IMPACT_001" : "ME_DESIGN_IMPACT_001",
      severity: "high",
      category: discipline === "software" ? "impact" : "design-impact",
      description: "The bullet does not yet establish a specific contribution, engineering method, and result.",
      reasoning: "A reviewer cannot distinguish the candidate's ownership or assess the technical substance from this wording.",
      sourceAnchor: { versionId, exactText: line, occurrence: 0 },
      status: "open",
    });
  }
  for (const issue of issues.slice(0, 3)) {
    questions.push({
      id: `question-${questions.length + 1}`,
      issueIds: [issue.id],
      priority: "high",
      text: discipline === "software"
        ? "What did you personally implement, how did it work technically, and what changed as a result?"
        : "What part did you personally design, which constraints or processes mattered, and how was it validated?",
    });
  }
  return {
    issues,
    questions,
    proposedDirection: issues.map((issue) => `Clarify ${issue.sourceAnchor.exactText} using only verified answers; do not infer missing facts.`),
  };
}
