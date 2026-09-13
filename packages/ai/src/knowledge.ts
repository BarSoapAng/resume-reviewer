import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";
import { DisciplineSchema, SeveritySchema, type Discipline } from "../../reviewer/src/schemas.js";

export const RubricRuleSchema = z.object({
  id: z.string().min(1),
  applies_to: z.array(DisciplineSchema).min(1),
  severity: SeveritySchema,
  category: z.string().min(1),
  principle: z.string().min(1),
  bad_signals: z.array(z.string()).default([]),
  possible_questions: z.array(z.string()).default([]),
  constraints: z.object({
    may_restructure: z.boolean().default(true),
    may_use_confirmed_information: z.boolean().default(true),
    may_invent_information: z.literal(false),
  }),
});

export type RubricRule = z.infer<typeof RubricRuleSchema>;

const defaultKnowledgeRoot = resolve(fileURLToPath(new URL("../../../knowledge", import.meta.url)));

export async function loadRubric(
  discipline: Discipline,
  knowledgeRoot = defaultKnowledgeRoot,
): Promise<RubricRule[]> {
  const directories = ["general", discipline, "probing"];
  const rules: RubricRule[] = [];
  for (const directory of directories) {
    const path = join(knowledgeRoot, directory);
    const files = (await readdir(path)).filter((file) => file.endsWith(".yaml")).sort();
    for (const file of files) {
      const document = z.object({ rules: z.array(RubricRuleSchema) }).parse(parse(await readFile(join(path, file), "utf8")));
      rules.push(...document.rules.filter((rule) => rule.applies_to.includes(discipline)));
    }
  }
  const ids = new Set<string>();
  for (const rule of rules) {
    if (ids.has(rule.id)) throw new Error(`Duplicate rubric rule: ${rule.id}`);
    ids.add(rule.id);
  }
  return rules;
}
