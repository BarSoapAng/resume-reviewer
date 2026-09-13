# Draftwise

Draftwise is an open-source technical resume reviewer for software and mechanical engineering students. It compiles an existing one-file LaTeX resume, identifies rubric-backed issues, asks for missing evidence, and proposes edits that can only use facts from the resume or the user's verified answers.

## What is implemented

- Responsive React workspace with CodeMirror, resizable panes, mobile tabs, local autosave, `.tex` import/export, checkpoints, source-linked issues, edit decisions, compiler diagnostics, and PDF preview/download
- Supabase Google/GitHub OAuth session handling
- Node/Fastify application API with authenticated project, review, message, edit, restore, entitlement, and Ko-fi webhook routes
- PostgreSQL/Drizzle schema plus Supabase row-level-security migration
- Structured OpenAI Responses reviewer with `store: false`, a deterministic state machine, fact grounding, stale-anchor protection, and version-controlled rubrics
- 50 public golden eval cases split evenly between software and mechanical engineering
- Isolated Tectonic compiler service with untrusted/offline execution, resource limits, ephemeral files, structured diagnostics, and SHA-256 caching
- Unit/API tests, browser smoke tests, and CI

## Repository

```text
src/                  Vite browser client
services/api/         trusted application API
services/compiler/    isolated LaTeX compiler
packages/ai/          OpenAI adapter, prompts, and context builder
packages/reviewer/    schemas, workflow, anchoring, and grounding
knowledge/            public review rubric
evals/                25 software + 25 mechanical golden cases
supabase/migrations/  database schema and RLS
docs/                 architecture and privacy notes
```

## Local setup

Copy `.env.example` to `.env` and configure Supabase, OpenAI, Ko-fi, and service URLs. Then install each package:

```bash
npm install
npm --prefix services/api install
npm --prefix services/compiler install
```

Run the isolated compiler, application API, and browser in separate terminals:

```bash
npm --prefix services/compiler run dev
npm --prefix services/api run dev
npm run dev
```

For production, use the hardened compiler container described in [services/compiler/README.md](./services/compiler/README.md). Do not run untrusted LaTeX in the API process.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run eval
npm --prefix services/api test
npm --prefix services/api run typecheck
npm --prefix services/compiler test
npm --prefix services/compiler run typecheck
npm run test:e2e
```

The E2E command starts the Vite dev server through Playwright. Install its Chromium runtime once with `npx playwright install chromium`.

## Safety invariant

Every AI-produced factual claim must trace to the original resume or an explicit user statement. If the evidence is missing, Draftwise asks; it does not guess.

See [the implementation plan](./Technical%20Resume%20Reviewer_%20Final%20Product%20and%20Implementation%20Plan.md) and [architecture notes](./docs/architecture.md) for product and deployment details.
