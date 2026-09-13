import { z } from "zod";
import { DisciplineSchema } from "../../packages/reviewer/src/schemas.js";

export const GoldenCaseSchema = z.object({
  id: z.string().min(1),
  discipline: DisciplineSchema,
  resume: z.string().min(1),
  expected_issues: z.array(z.string()).min(1),
  important_questions: z.array(z.string()).min(1),
  forbidden_inferences: z.array(z.string()).min(1),
  acceptable_edit_direction: z.array(z.string()).min(1),
  rubric_rules: z.array(z.string()).min(1),
  strong_example: z.boolean().default(false),
});

export const GoldenFileSchema = z.object({ cases: z.array(GoldenCaseSchema) });
export type GoldenCase = z.infer<typeof GoldenCaseSchema>;
