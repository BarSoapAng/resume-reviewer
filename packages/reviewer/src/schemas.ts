import { z } from "zod";

export const DisciplineSchema = z.enum(["software", "mechanical"]);
export const ReviewStageSchema = z.enum([
  "imported",
  "initial_review",
  "probing",
  "ready_to_edit",
  "editing",
  "final_review",
  "complete",
]);
export const SeveritySchema = z.enum(["high", "medium", "low"]);
export const IssueStatusSchema = z.enum(["open", "probing", "resolved", "skipped"]);

export const SourceAnchorSchema = z.object({
  versionId: z.string().min(1),
  exactText: z.string().min(1),
  occurrence: z.number().int().nonnegative(),
});

export const ResumeFactSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  subject: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  statement: z.string().min(1),
  source: z.enum(["resume", "user_message"]),
  sourceId: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const ReviewIssueSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  severity: SeveritySchema,
  category: z.string().min(1),
  description: z.string().min(1),
  reasoning: z.string().min(1),
  sourceAnchor: SourceAnchorSchema,
  status: IssueStatusSchema,
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  issueIds: z.array(z.string().min(1)).min(1),
  text: z.string().min(1),
  priority: SeveritySchema,
});

export const FactCitationSchema = z.object({
  factId: z.string().min(1),
  claim: z.string().min(1),
});

export const EditProposalSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  issueIds: z.array(z.string().min(1)).min(1),
  oldText: z.string().min(1),
  newText: z.string().min(1),
  explanation: z.string().min(1),
  citations: z.array(FactCitationSchema),
});

export const ReviewTurnSchema = z.object({
  message: z.string(),
  stage: ReviewStageSchema.exclude(["imported"]),
  issues: z.array(ReviewIssueSchema),
  questions: z.array(QuestionSchema).max(3),
  facts: z.array(ResumeFactSchema),
  edits: z.array(EditProposalSchema),
  recommendedTransition: ReviewStageSchema.optional(),
});

export type Discipline = z.infer<typeof DisciplineSchema>;
export type ReviewStage = z.infer<typeof ReviewStageSchema>;
export type ResumeFact = z.infer<typeof ResumeFactSchema>;
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type EditProposal = z.infer<typeof EditProposalSchema>;
export type ReviewTurn = z.infer<typeof ReviewTurnSchema>;
