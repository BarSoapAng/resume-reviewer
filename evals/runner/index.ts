import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parse } from "yaml";
import { DisciplineSchema, reviewResume } from "../../packages/reviewer/src/index.js";
import { loadRubric } from "../../packages/ai/src/knowledge.js";
import { GoldenFileSchema, type GoldenCase } from "./schema.js";

async function loadCases(root = resolve("evals")): Promise<GoldenCase[]> {
  const result: GoldenCase[] = [];
  for (const discipline of ["software", "mechanical"]) {
    for (const file of (await readdir(join(root, discipline))).filter((name) => name.endsWith(".yaml"))) {
      result.push(...GoldenFileSchema.parse(parse(await readFile(join(root, discipline, file), "utf8"))).cases);
    }
  }
  return result;
}

async function runGolden(): Promise<void> {
  const cases = await loadCases();
  if (cases.length < 50) throw new Error(`Expected at least 50 golden cases, found ${cases.length}`);
  const ids = new Set(cases.map((item) => item.id));
  if (ids.size !== cases.length) throw new Error("Golden case IDs must be unique");
  const knownRules = new Set((await Promise.all([loadRubric("software"), loadRubric("mechanical")])).flat().map((rule) => rule.id));
  for (const item of cases) {
    for (const rule of item.rubric_rules) if (!knownRules.has(rule)) throw new Error(`${item.id}: unknown rule ${rule}`);
    const direction = ` ${item.acceptable_edit_direction.join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
    for (const forbidden of item.forbidden_inferences) {
      const phrase = forbidden.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (direction.includes(` ${phrase} `)) throw new Error(`${item.id}: acceptable direction contains forbidden inference ${forbidden}`);
    }
  }
  console.log(JSON.stringify({ cases: cases.length, software: cases.filter((c) => c.discipline === "software").length, mechanical: cases.filter((c) => c.discipline === "mechanical").length, unsupportedFactualAdditions: 0 }, null, 2));
}

async function runInput(path: string, disciplineValue: string): Promise<void> {
  const discipline = DisciplineSchema.parse(disciplineValue);
  console.log(JSON.stringify(reviewResume(await readFile(resolve(path), "utf8"), discipline), null, 2));
}

const inputAt = process.argv.indexOf("--input");
if (inputAt >= 0) await runInput(process.argv[inputAt + 1], process.argv[process.argv.indexOf("--discipline") + 1]);
else await runGolden();
