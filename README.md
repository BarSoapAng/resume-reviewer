# Draftwise

Draftwise is an open-source technical resume reviewer for software and mechanical engineering students. It compiles an existing one-file LaTeX resume, identifies rubric-backed issues, asks for missing evidence, and proposes edits that can only use facts from the resume or the user's verified answers.

## What is implemented

- Responsive React workspace with CodeMirror, resizable panes, mobile tabs, local autosave, `.tex` import/export, checkpoints, source-linked issues, edit decisions, compiler diagnostics, and PDF preview/download
- Supabase email magic-link and Google/GitHub OAuth session handling
- Node/Fastify application API with authenticated project, review, message, edit, restore, entitlement, and Stripe webhook routes
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

Copy `.env.example` to `.env` and configure Supabase, OpenAI, Stripe, and service URLs. `DATABASE_URL` must be a connection string for this Supabase project; do not leave the placeholder pointed at an unrelated local PostgreSQL server.

Apply the migrations in filename order using the Supabase SQL Editor:

```text
supabase/migrations/202609130001_initial_schema.sql
supabase/migrations/202609130002_persist_review_turns.sql
```

Then install each package:

```bash
npm install
npm --prefix services/api install
npm --prefix services/compiler install
```

Run the isolated compiler, application API, and browser in separate terminals. The API scripts load the root `.env` automatically:

```bash
docker compose -f docker-compose.compiler.yml up --build
npm --prefix services/api run dev
npm run dev
```

Email magic-link authentication works without an external OAuth provider. Google and GitHub buttons require enabling those providers in the Supabase dashboard first.

For production, use the hardened compiler container described in [services/compiler/README.md](./services/compiler/README.md). Do not run untrusted LaTeX in the API process.

## Stripe payments

One payment unlocks one complete review. Customers choose their amount in Stripe Checkout, starting at $1 USD.

In Stripe, create a one-time USD price with **Customer chooses what to pay**, a minimum of **$1**, and a suggested amount of $1. Set these server-only values in the root `.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
REQUIRE_REVIEW_ENTITLEMENT=true
```

Use a price and secret key from the same Stripe test environment. `WEB_ORIGIN` controls the checkout return URL. Keep `REQUIRE_REVIEW_ENTITLEMENT=false` to bypass payments for local reviews; Stripe settings may be empty when payments are disabled.

For local payment testing, forward signed webhooks to the application API:

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:8787/api/webhooks/stripe
```

Copy the listener's `whsec_...` secret into `.env` and restart the API. Start a review while signed in, open Stripe Checkout, and use Stripe's test card `4242 4242 4242 4242` with a future expiry and any CVC. Return to the original app tab and click **I've paid - check again** after payment. Payment email may differ from account email: the API binds the Checkout Session to the signed-in account.

For production, configure a Stripe snapshot webhook destination for those same events at `https://YOUR_API_HOST/api/webhooks/stripe` and use its signing secret with your live secret key and price. Duplicate events grant no additional entitlements.

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

Licensed under AGPL-3.0-or-later.
