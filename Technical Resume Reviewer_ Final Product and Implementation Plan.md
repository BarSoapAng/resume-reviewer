# Technical Resume Reviewer

## 1. Product objective

Build an open-source AI resume reviewer specifically for:

- Software engineering students
- Mechanical engineering students

The product combines:

- expert resume feedback
- conversational questioning
- a LaTeX editor
- live PDF preview
- AI-proposed edits
- version history
- persistent projects

The purpose is both to **teach students why their resume is weak** and to produce a **genuinely excellent final resume**.

The central product principle is:

> The AI improves the quality of the resume by extracting more substance from the student, never by inventing substance for them.

If a bullet lacks metrics, technical detail, ownership, complexity, or outcomes, the reviewer should ask for that information rather than hallucinating it.

---

# 2. Product scope

## Supported in v1

- Software engineering resumes
- Mechanical engineering resumes
- One `.tex` file per resume
- Existing LaTeX resumes only
- AI review
- Conversational follow-up questions
- AI editing
- Accept/reject diffs
- LaTeX editor
- PDF preview
- Compile errors
- User accounts
- Saved resumes
- Version history
- Hosted AI review
- Free self-hosting
- Public review rubric

## Explicitly not supported in v1

- Job-description tailoring
- Resume scores
- Word documents
- Google Docs
- PDF-to-LaTeX conversion
- Multiple `.tex` files
- arbitrary uploaded packages
- cover letters
- non-technical disciplines
- recruiter matching
- job applications
- auto-generated fake metrics
- multi-agent swarms

The narrow scope is intentional.

---

# 3. Main user experience

The application is primarily a desktop workspace.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Resume Name               Software Engineering          Saved ✓     │
├─────────────────┬─────────────────────────┬──────────────────────────┤
│                 │                         │                          │
│ AI Reviewer     │ LaTeX Editor            │ PDF Preview              │
│                 │                         │                          │
│ conversation    │ source                  │ compiled resume          │
│                 │                         │                          │
│ issues          │ AI annotations          │                          │
│                 │                         │                          │
│ questions       │ diff suggestions        │                          │
│                 │                         │                          │
├─────────────────┴─────────────────────────┴──────────────────────────┤
│ Compile ✓                                      Last saved 3 sec ago │
└──────────────────────────────────────────────────────────────────────┘
```

Use resizable panels.

The AI panel can collapse so users can work in an Overleaf-style editor/preview layout.

On narrower screens:

```text
[ AI ] [ Source ] [ Preview ]
```

become tabs rather than squeezing three unusable columns together.

---

# 4. Initial user flow

## Step 1: Start

Landing page has one dominant CTA:

> Review my resume

User can:

- paste LaTeX
- upload a `.tex` file

No account should be required just to load and compile a resume.

---

## Step 2: Compile

The application immediately attempts to compile the resume.

If successful:

- show PDF
- populate source editor
- allow normal editing

If unsuccessful:

- show compiler diagnostics
- highlight relevant source lines

This gives users value before asking for signup or money.

---

## Step 3: Resume type

Ask:

```text
What are you applying for?

○ Software Engineering
○ Mechanical Engineering
```

That determines which review rubric gets loaded.

No job description is requested.

---

## Step 4: Account

When the user starts an AI review:

- require login
- save their current resume
- create review session

Use:

- Google OAuth
- GitHub OAuth
- optionally email magic link

Do not waste early engineering effort building passwords.

---

## Step 5: Hosted review payment

For the hosted version:

> Pay what you want, starting at $1.

Explain:

> The minimum helps cover AI and hosting costs. Anything extra supports development of the open-source project.

Self-hosted users use their own OpenAI API key and do not pay you.

---

# 5. AI review philosophy

The AI should behave like an experienced technical resume reviewer.

It should not immediately rewrite everything.

Its workflow is:

```text
UNDERSTAND
↓
CRITIQUE
↓
IDENTIFY MISSING INFORMATION
↓
ASK QUESTIONS
↓
COLLECT VERIFIED FACTS
↓
PROPOSE IMPROVEMENTS
↓
EDIT
↓
REVIEW AGAIN
↓
FINALIZE
```

The model should explain why something is weak while also eventually fixing it.

---

# 6. Hard AI rules

The reviewer must never invent:

- metrics
- technologies
- users
- request volumes
- team sizes
- percentages
- business outcomes
- performance improvements
- dimensions
- tolerances
- materials
- manufacturing methods
- responsibilities
- technical architecture
- personal ownership

If information is missing, ask.

Example:

### Original

```text
Improved application performance.
```

### Wrong

```text
Reduced latency by 40% through Redis caching.
```

Nothing in the resume supports that.

### Correct

AI asks:

> What was actually slow? Do you remember the before/after latency or another measurable effect? What change did you make technically?

User:

> API calls were around 800 ms. I added Redis caching and they dropped to around 200 ms.

Now the AI can propose:

```text
Reduced API latency from ~800ms to ~200ms by introducing Redis caching...
```

The metric is now grounded.

---

# 7. Reviewer state machine

Do not give an LLM unrestricted control over the workflow.

Application code owns state.

```text
IMPORTED
    ↓
INITIAL_REVIEW
    ↓
PROBING
    ↓
READY_TO_EDIT
    ↓
EDITING
    ↓
FINAL_REVIEW
    ↓
COMPLETE
```

The model may recommend a transition.

The backend validates it.

---

# 8. Determining when enough information exists

The reviewer can move from `PROBING` to `READY_TO_EDIT` when:

1. All high-priority resume issues have either:
   - enough supporting information, or
   - been explicitly skipped by the user.

2. Important bullets have sufficient substance to describe:
   - what happened
   - what the student specifically did
   - how they did it
   - why it mattered

3. Any proposed new factual claims are supported by:
   - the original resume, or
   - explicit user statements.

4. Additional questioning would create diminishing returns rather than meaningfully improve the resume.

The user can always say:

> Just work with what you have.

That stops further probing.

It does **not** relax the no-hallucination rule.

---

# 9. Resume review knowledge system

Your review knowledge should not exist as one giant system prompt.

Build a version-controlled knowledge base.

```text
knowledge/
├── general/
│   ├── philosophy.yaml
│   ├── formatting.yaml
│   ├── education.yaml
│   ├── experience.yaml
│   ├── projects.yaml
│   └── wording.yaml
│
├── software/
│   ├── bullets.yaml
│   ├── projects.yaml
│   ├── internships.yaml
│   ├── technical-depth.yaml
│   └── examples.yaml
│
├── mechanical/
│   ├── bullets.yaml
│   ├── design.yaml
│   ├── manufacturing.yaml
│   ├── testing.yaml
│   └── examples.yaml
│
└── probing/
    ├── software.yaml
    └── mechanical.yaml
```

Example rule:

```yaml
id: SWE_IMPACT_001

applies_to:
  - software

severity: high

principle:
  Strong engineering bullets should make the candidate's
  contribution and resulting impact clear.

bad_signals:
  - vague contribution
  - unclear ownership
  - no technical mechanism
  - no outcome

possible_questions:
  - What part did you personally build?
  - How many users interacted with this?
  - Was there a measurable before and after?
  - What made the implementation difficult?
  - Which technologies were central to the solution?

constraints:
  may_restructure: true
  may_use_confirmed_information: true
  may_invent_information: false
```

---

# 10. Software engineering rubric

Software reviews should particularly look for:

- ownership
- impact
- scale
- technical complexity
- implementation details
- performance
- reliability
- architecture
- user impact
- developer impact
- meaningful technologies
- specificity
- strong project descriptions

Example questioning:

> You say you built an internal platform. Who used it?

> What part did you personally own?

> Why was Kafka necessary here?

> Did this replace an existing workflow?

> Was there any measurable latency, throughput, adoption, or time-saving result?

The AI should probe technical decisions rather than mechanically asking for numbers on every bullet.

---

# 11. Mechanical engineering rubric

Mechanical reviews should look for:

- design ownership
- CAD
- simulation
- prototyping
- manufacturing
- materials
- tolerances
- constraints
- testing
- iteration
- cost
- weight
- reliability
- performance
- DFM/DFA
- physical results

Questions might include:

> What part of the assembly did you design?

> What manufacturing process was used?

> Were there weight, geometry, tolerance, or cost constraints?

> Did you perform FEA or physical testing?

> What failed during earlier iterations?

> What changed between prototypes?

> What load did the final design withstand?

This must actually be a mechanical-engineering reviewer rather than a software rubric wearing a SolidWorks hat.

---

# 12. Fact ledger

Every piece of supplementary information provided in conversation should become structured data.

```ts
type ResumeFact = {
  id: string;
  projectId: string;

  subject?: string;
  section?: string;

  statement: string;

  source:
    | "resume"
    | "user_message";

  sourceId: string;

  createdAt: string;
};
```

Example:

```json
{
  "subject": "Tesla Outlook Assistant",
  "statement": "Reached more than 3,000 users during its first week",
  "source": "user_message"
}
```

The reviewer should reference this ledger when producing edits.

The conversation is not the source of truth.

The structured fact store is.

---

# 13. Issue model

Each detected issue should be structured.

```ts
type ReviewIssue = {
  id: string;

  ruleId: string;

  severity:
    | "high"
    | "medium"
    | "low";

  category: string;

  description: string;
  reasoning: string;

  sourceAnchor: {
    versionId: string;
    exactText: string;
    occurrence: number;
  };

  status:
    | "open"
    | "probing"
    | "resolved"
    | "skipped";
};
```

Anchoring to exact text is safer than relying only on line numbers because source lines move constantly.

---

# 14. AI questions

Questions should be connected to issues.

Do not produce twenty questions at once.

Ask approximately 1-3 high-value questions per conversational turn.

Example:

> This project sounds significantly more interesting than the bullet currently makes it seem. Two things would help:
>
> 1. How many people used it?
> 2. What technically made handling that traffic difficult?

The goal is conversation, not interrogation by tax form.

---

# 15. Editing model

The AI never directly changes stored LaTeX.

It proposes changes.

Tool:

```ts
proposeResumeEdit({
  versionId,
  issueIds,
  oldText,
  newText,
  explanation
})
```

The backend verifies:

- referenced version still exists
- `oldText` still exists
- source has not changed underneath the proposal
- resulting LaTeX can compile

Then show:

```diff
- Built a dashboard used by engineers.
+ Built React and Grafana observability dashboards used by
+ 15+ engineers, reducing troubleshooting time by 20%.
```

Actions:

```text
Accept
Reject
Edit
Ask why
```

Accepting:

1. applies patch
2. creates new version
3. compiles resume
4. updates issue state
5. refreshes preview

If the document changed after the suggestion was generated:

```text
This suggestion is outdated.
Regenerate
```

Never blindly patch stale source.

---

# 16. Template preservation

By default the AI should only change resume content.

It should avoid changing:

- margins
- fonts
- spacing
- section styling
- colors
- macros
- layout
- template structure

Formatting should only change if:

- something is visibly broken
- content no longer fits reasonably
- the user explicitly requests formatting help

This prevents the AI from enthusiastically redesigning a perfectly good resume for no reason, a behavior apparently encoded somewhere deep in the collective unconscious of language models.

---

# 17. LaTeX parsing

Use:

```text
@unified-latex/unified-latex
```

for parsing LaTeX into an AST where useful.

It is MIT licensed and provides JS/TypeScript parsing and manipulation APIs.

Use it for:

- identifying sections
- extracting text
- understanding commands/environments
- safer source analysis

Do **not** rely on rewriting the entire AST and reprinting it for AI edits.

AI edits should operate against explicit source ranges/text anchors so the original formatting remains intact.

---

# 18. Frontend stack

The frontend starts from `../Node-React-Tailwind-Styled-Template`, with Tailwind removed from the active toolchain.

Use:

```text
Vite
React
TypeScript
styled-components
```

Keep reusable design tokens in `src/lib/styles.ts` and component styles beside their components. Do not add raw Tailwind utility classes. The browser client talks to a separate Node API; routing and server responsibilities do not need to be coupled to the frontend framework.

Package manager:

```text
npm
```

Repository approach:

```text
single Vite app initially
introduce workspaces only when the compiler, API, or shared packages require them
```

---

# 19. LaTeX editor

Use:

```text
CodeMirror 6
@codemirror/legacy-modes/mode/stex
```

The CodeMirror legacy modes package supports LaTeX/sTeX and is MIT licensed.

Features:

- syntax highlighting
- search
- line numbers
- bracket matching
- undo/redo
- compile diagnostics
- issue highlights
- diff decorations
- keyboard shortcuts

Use:

```text
react-resizable-panels
```

for the workspace layout. It provides typed React components for resizable panel groups.

Avoid `codemirror-lang-latex` initially unless you deliberately want its AGPL dependency. Its current package is AGPL-3.0-or-later.

---

# 20. PDF preview

V1 does not need complicated PDF infrastructure.

Return the compiled PDF as a signed URL or blob.

Render it in:

```html
<iframe>
```

or `<object>`.

Later, if source ↔ PDF synchronization becomes valuable, introduce PDF.js + SyncTeX.

Do not build that before users ask for it.

---

# 21. LaTeX compilation service

Never run arbitrary student LaTeX inside the primary web server.

Architecture:

```text
Browser
   │
   ▼
Application API
   │
   ▼
Compile Queue / Request
   │
   ▼
Isolated Compiler Container
   │
   ▼
PDF + Diagnostics
```

Compiler has:

- no database credentials
- no OpenAI credentials
- no Ko-fi secrets
- no application secrets
- restricted filesystem
- memory limits
- CPU limits
- execution timeout
- source size limits
- no shell escape
- ideally no outbound network access

---

# 22. Compiler engine

Start by testing:

```text
Tectonic
```

Run with untrusted mode enabled.

Tectonic explicitly exposes an `--untrusted` mode for hostile input and recommends `TECTONIC_UNTRUSTED_MODE` when processing genuinely untrusted documents.

Production configuration:

```text
TECTONIC_UNTRUSTED_MODE=1
```

Pre-cache required packages into the container.

Then prevent runtime package downloads where practical.

## Before locking this decision

Run at least 50 real student resumes through Tectonic.

Track:

```text
successful compile rate
package compatibility
font compatibility
compile latency
diagnostic quality
```

Target:

```text
≥95% successful compilation
```

If compatibility is materially worse than normal Overleaf resumes:

switch the compiler container to:

```text
TeX Live
latexmk
```

with the same sandbox restrictions.

The compiler abstraction should allow either engine.

---

# 23. Compilation caching

Create a hash:

```text
SHA256(
  latex source
  + compiler version
  + package bundle version
)
```

If already compiled:

return cached output.

Autosave continuously.

Compile:

- after ~700ms inactivity
- immediately after AI edit acceptance
- manually with Cmd/Ctrl + Enter

Do not compile after every keystroke unless you have developed a personal grudge against your infrastructure bill.

---

# 24. AI stack

Use:

```text
OpenAI Responses API
openai Node SDK
Zod
```

Do **not** use LangGraph initially.

Do **not** build a swarm of agents.

This product needs a deterministic workflow with an LLM inside it, not an autonomous civilization.

The Responses API supports custom function tools and structured response formats.

Use Structured Outputs for all machine-consumed responses so outputs conform to defined schemas rather than parsing arbitrary prose.

---

# 25. Model strategy

Initially use one configurable OpenAI review model.

Environment:

```env
OPENAI_REVIEW_MODEL=
OPENAI_EXTRACTION_MODEL=
```

Do not hard-code your architecture to a particular model generation.

Use the stronger review model for:

- reasoning about resume quality
- questioning
- rewrites
- final review

A cheaper model can later handle:

- section extraction
- fact extraction
- classification

Do not optimize model routing before collecting real cost data.

---

# 26. AI tools

Give the reviewer a small explicit tool set.

```text
record_fact
create_issue
resolve_issue
skip_issue
ask_resume_question
propose_resume_edit
request_final_review
```

The model cannot:

```text
write_document
execute_latex
update_database
charge_user
delete_project
```

The application performs those operations.

---

# 27. Reviewer output schema

Example:

```ts
const ReviewTurn = z.object({
  message: z.string(),

  stage: z.enum([
    "initial_review",
    "probing",
    "ready_to_edit",
    "editing",
    "final_review",
    "complete"
  ]),

  issues: z.array(ReviewIssueSchema),

  questions: z.array(QuestionSchema),

  facts: z.array(FactSchema),

  edits: z.array(EditProposalSchema)
});
```

The UI renders structured data separately from conversational text.

---

# 28. Context construction

Each model request should roughly contain:

```text
SYSTEM POLICY
↓
RELEVANT REVIEW RULES
↓
CURRENT RESUME
↓
VERIFIED FACT LEDGER
↓
CURRENT ISSUES
↓
RESOLVED ISSUES
↓
RECENT CONVERSATION
↓
CURRENT USER MESSAGE
```

Do not resend the entire conversation forever.

Maintain a conversation summary after enough turns.

---

# 29. OpenAI data handling

Resume data is sensitive.

Call the Responses API with:

```text
store: false
```

The current Responses API supports explicitly disabling response storage using this parameter.

Avoid sending information irrelevant to review.

For example, the model usually does not need:

- email
- phone number
- street address

Extract the resume body separately where possible.

---

# 30. Database and authentication

Use:

```text
Supabase
```

for:

- PostgreSQL
- authentication
- file/object storage

Use:

```text
Drizzle ORM
```

for:

- schema definitions
- migrations
- application queries

Supabase Auth integrates directly with Postgres authorization and Row Level Security.

Enable RLS on every user-owned table.

Every policy must ensure:

```text
auth.uid() = user_id
```

where appropriate.

The service-role key must never reach the browser.

---

# 31. Database model

## profiles

```text
id
user_id
created_at
```

## resume_projects

```text
id
user_id
title
discipline
current_source
current_version_id
created_at
updated_at
```

`discipline`:

```text
software
mechanical
```

## resume_versions

```text
id
project_id
parent_version_id
latex_source
created_by
reason
created_at
```

`created_by`:

```text
user
ai
system
```

## review_sessions

```text
id
project_id
rubric_version
state
model
started_at
completed_at
```

## review_messages

```text
id
session_id
role
content
created_at
```

## resume_facts

```text
id
project_id
session_id
subject
section
statement
source_type
source_id
created_at
```

## review_issues

```text
id
session_id
rule_id
severity
category
description
reasoning
source_anchor
status
created_at
resolved_at
```

## proposed_edits

```text
id
session_id
base_version_id
old_text
new_text
explanation
status
created_at
```

## usage_events

```text
id
user_id
session_id
model
input_tokens
output_tokens
estimated_cost
created_at
```

## payments

```text
id
user_id
provider
provider_payment_id
email
amount
currency
status
created_at
```

## review_entitlements

```text
id
user_id
payment_id
session_id
status
created_at
```

---

# 32. Versioning behavior

Do not create a database version for every keystroke.

`resume_projects.current_source` is autosaved.

Create immutable versions when:

- resume is initially imported
- AI edit is accepted
- user manually creates checkpoint
- final review completes
- previous version is restored

History UI:

```text
Today

14:32  AI rewrite
       Improved Tesla bullet

14:29  AI rewrite
       Added project metrics

14:15  Initial upload
```

Users can restore any snapshot.

---

# 33. Monetization

Hosted version:

```text
Editor                      Free
LaTeX compilation           Free
Account/storage              Free
Self-hosting                 Free

Hosted AI resume review      $1 minimum
                             Pay what you want
```

Use:

```text
Ko-fi
```

for MVP payment handling.

Ko-fi can send an HTTP webhook when payments occur.

Ko-fi also collects the supporter's email as part of a payment.

Therefore, for MVP:

1. User signs into the resume app.
2. They click `Start AI review`.
3. If no entitlement exists, show Ko-fi payment page.
4. Tell them to use the same email as their resume-review account.
5. Ko-fi sends payment webhook.
6. Backend records the payment.
7. Match payment email to account email.
8. Grant one review entitlement.
9. UI polls/refetches entitlement state.
10. Review unlocks.

If emails do not match:

```text
Payment not automatically matched.
Contact/support recovery flow.
```

Do not build a wallet.

Do not build virtual credits.

Do not build subscriptions.

Not yet.

Ko-fi's free mode currently takes 0% on one-time tips, although Stripe/PayPal processing fees still apply.

---

# 34. Review entitlement semantics

One payment unlocks:

> One complete resume review session.

Not one message.

A review session includes:

- initial review
- follow-up questions
- rewrites
- reasonable iteration
- final review

Internally enforce abuse limits such as:

```text
30 AI turns
reasonable token ceiling
one resume project
```

Do not show users a token meter unless necessary.

The point is to make their resume good, not reproduce a prepaid phone plan from 2007.

---

# 35. API routes

```text
POST /api/projects
GET  /api/projects/:id
PATCH /api/projects/:id
DELETE /api/projects/:id

POST /api/projects/:id/compile

POST /api/projects/:id/reviews
GET  /api/reviews/:id
POST /api/reviews/:id/messages

POST /api/edits/:id/accept
POST /api/edits/:id/reject

POST /api/versions/:id/restore

POST /api/webhooks/kofi

GET /api/account/entitlements
```

Use SSE/streaming for AI text responses.

---

# 36. Repository structure

For the current frontend milestone, keep the template's simple root layout:

```text
resume-reviewer/
├── src/
│   ├── components/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

When backend packages are introduced, migrate toward the following service-oriented structure. Do not add empty workspace directories before they are needed.

```text
resume-reviewer/
│
├── apps/
│   └── web/
│       └── src/
│           ├── components/
│           └── lib/
│
├── services/
│   └── compiler/
│       ├── Dockerfile
│       └── src/
│
├── packages/
│   ├── ai/
│   │   ├── prompts/
│   │   ├── tools/
│   │   └── schemas/
│   │
│   ├── database/
│   │
│   ├── latex/
│   │
│   ├── reviewer/
│   │
│   ├── shared/
│   │
│   └── ui/
│
├── knowledge/
│   ├── general/
│   ├── software/
│   ├── mechanical/
│   └── probing/
│
├── evals/
│   ├── software/
│   ├── mechanical/
│   └── runner/
│
├── supabase/
│   └── migrations/
│
├── docs/
│
├── docker-compose.yml
└── package.json
```

---

# 37. Evaluation framework

This must be treated as part of the product, not optional QA.

Create a golden dataset from resumes you have personally reviewed.

Each example contains:

```yaml
resume:
  ...

expected_issues:
  - ...

important_questions:
  - ...

forbidden_inferences:
  - ...

acceptable_edit_direction:
  - ...

rubric_rules:
  - SWE_IMPACT_001
```

Include:

- obviously weak bullets
- subtly weak bullets
- already excellent bullets
- software projects
- internships
- mechanical design teams
- CAD projects
- manufacturing work
- research
- leadership
- education sections

Start with:

```text
50 cases
```

Then continually add failures found in production.

---

# 38. Quality metrics

Track reviewer quality separately from product metrics.

## Reviewer metrics

```text
Issue precision
Issue recall
Hallucination rate
Question usefulness
Edit acceptance rate
Expert edit approval rate
Compile success after edit
```

The most important:

```text
Hallucination rate → ~0%
```

and:

```text
Expert approval rate of proposed edits
```

Your rubric should be judged against your own reviews.

---

# 39. Product analytics

Use:

```text
PostHog
```

Track events like:

```text
resume_imported
resume_compiled
review_started
issue_opened
question_answered
edit_proposed
edit_accepted
edit_rejected
review_completed
payment_started
payment_completed
```

Never include actual resume text in analytics payloads.

---

# 40. Error monitoring

Use:

```text
Sentry
```

Scrub:

- LaTeX source
- names
- email addresses
- resume text
- AI conversation content

from telemetry by default.

---

# 41. Testing stack

Use:

```text
Vitest
Playwright
```

Test:

### Unit

- issue state transitions
- entitlement logic
- source anchoring
- patch generation
- fact extraction
- Ko-fi webhook handling
- version creation

### Integration

- compile service
- OpenAI structured output
- Supabase RLS
- webhook → entitlement

### E2E

```text
upload resume
→ compile
→ login
→ start review
→ answer question
→ receive edit
→ accept edit
→ recompile
→ restore version
```

---

# 42. Security

Treat LaTeX as hostile input.

Compiler:

```text
isolated process
untrusted mode
no shell escape
CPU limit
RAM limit
timeout
ephemeral files
no application secrets
network restricted
```

Application:

```text
RLS
CSRF protection where applicable
rate limiting
webhook validation
input-size limits
OpenAI rate limits
ownership checks on every project operation
```

Use:

```text
Upstash Redis
@upstash/ratelimit
```

for public endpoint abuse control if necessary.

---

# 43. Privacy requirements

Users must be able to:

```text
delete resume
delete project
delete account
export .tex
download PDF
```

Product policy:

> Resume content is never used to train our own models or create evaluation datasets without explicit opt-in.

Do not silently turn student resumes into training data just because someone clicked through a Terms page nobody has read since 2009.

---

# 44. Open-source license

Recommended:

```text
AGPL-3.0
```

Reason:

People can:

- inspect
- modify
- self-host
- contribute

but hosted modifications generally remain subject to AGPL's source-sharing requirements.

That better matches the project's philosophy than MIT if you care about closed SaaS clones.

Keep:

```text
knowledge/
evals/public/
```

open as well.

Your strongest differentiator should be the quality of the review methodology rather than hiding prompts.

---

# 45. Development phases

# Phase 0: Encode the reviewer

## Goal

Prove that your resume-review knowledge can actually be transferred into a model.

## Build

Create:

```text
knowledge/general
knowledge/software
knowledge/mechanical
knowledge/probing
```

Write first-pass rubric.

Create at least:

```text
25 software eval cases
25 mechanical eval cases
```

Implement simple CLI:

```text
npm run eval
```

Input:

```text
resume
discipline
```

Output:

```text
issues
questions
proposed direction
```

## Test

Compare model output against your own review.

Measure:

- missed issues
- bad advice
- unnecessary questions
- hallucinations

## Exit criteria

Do not proceed until:

```text
0 unsupported factual additions in golden tests

major issues consistently discovered

questions resemble questions you would personally ask

strong existing bullets are usually left alone
```

This is the highest-priority phase.

---

# Phase 1: LaTeX workspace

## Goal

Build a useful resume editor without AI.

## Build

Frontend:

```text
Vite + React + TypeScript
styled-components
CodeMirror
resizable panes
PDF preview
```

The checked-in frontend shell also includes a representative reviewer panel so the three-pane interaction can be designed in context. Until the AI backend exists, that content remains local demo state and must not be presented as a completed review service.

Compiler service:

```text
Tectonic
Docker
sandbox
```

Features:

```text
paste LaTeX
upload .tex
edit source
compile
view PDF
compile errors
autosave locally
```

No account required.

## Compiler spike

Run 50 real resumes.

If Tectonic compatibility is unacceptable, swap implementation behind compiler interface.

## Exit criteria

User can:

```text
paste real resume
edit it
compile it
see PDF
see useful compilation errors
```

with reliable performance.

---

# Phase 2: Read-only AI reviewer

## Goal

Have the AI understand and critique the resume without editing it.

## Build

OpenAI Responses API integration.

Implement:

```text
INITIAL_REVIEW
```

Generate structured:

```text
issues
severity
reasoning
source anchors
```

Show issues in AI panel.

Clicking issue highlights corresponding LaTeX.

No follow-up conversation yet.

No edits yet.

## Exit criteria

For golden test resumes:

```text
review quality is comparable to manual rubric
high-priority issues are reliably surfaced
no invented claims
```

---

# Phase 3: Conversational probing

## Goal

Turn generic weak bullets into substantive material through questioning.

## Build

Implement:

```text
PROBING
```

Add:

```text
chat
fact ledger
issue state
question generation
conversation summaries
```

When student answers:

```text
extract facts
attach facts to issue
decide whether more information is necessary
```

Questions should be adaptive.

Example:

```text
AI: How many people used it?

User: About 2,000.

AI: Was that company-wide or within your team?

User: Company-wide.

AI records both facts.
```

## Exit criteria

Given weak bullets, the AI gathers approximately the same supporting details you would ask for manually.

No fabricated information enters the fact ledger.

---

# Phase 4: AI editing and diffs

## Goal

Produce the improved resume.

## Build

Implement:

```text
READY_TO_EDIT
EDITING
```

Add:

```text
proposed edits
diff UI
accept
reject
manual edit
stale suggestion detection
automatic compilation
```

Every accepted AI change creates a version.

If compilation fails:

```text
do not persist as accepted final version
show failure
allow revert
```

## Exit criteria

The AI can take:

```text
weak resume
+
conversation
+
verified facts
```

and produce substantially better bullets without changing factual meaning.

Accepted edits consistently compile.

---

# Phase 5: Final review and version history

## Goal

Turn iterative edits into a polished finished resume.

## Build

Implement:

```text
FINAL_REVIEW
COMPLETE
```

AI performs complete pass for:

- repetition
- consistency
- verbosity
- weak remaining bullets
- section balance
- formatting anomalies
- technical credibility

Add:

```text
version history
restore
manual checkpoint
download .tex
download PDF
```

## Exit criteria

A student can go from raw resume to finished downloadable resume entirely inside the product.

---

# Phase 6: Authentication and cloud persistence

## Goal

Make the hosted application usable across sessions.

## Build

Supabase:

```text
Auth
Postgres
Storage
RLS
```

Add:

```text
Google login
GitHub login
saved projects
saved conversations
saved versions
delete project
delete account
```

Anonymous workspace can migrate into user's account after signup.

## Exit criteria

Users can:

```text
leave
return
continue review
access only their own data
delete all their information
```

---

# Phase 7: Hosted payments

## Goal

Cover API and hosting costs.

## Build

Ko-fi integration.

Flow:

```text
Start review
↓
No entitlement
↓
Ko-fi payment
↓
Webhook
↓
Match payment email
↓
Create entitlement
↓
Unlock AI review
```

Minimum:

```text
$1
```

Copy:

> Pay what you want, starting at $1.

Add reasonable review usage limits internally.

Self-hosted version remains free.

## Exit criteria

A stranger can:

```text
create account
pay
automatically unlock review
finish resume
```

without you manually touching anything.

---

# Phase 8: Production hardening

## Goal

Make it safe to publicly launch.

## Build

Add:

```text
rate limiting
compiler abuse protection
Sentry
PostHog
privacy policy
terms
account deletion
usage tracking
cost tracking
webhook idempotency
retry handling
OpenAI failure recovery
database backups
```

Create CI:

```text
lint
typecheck
unit tests
Playwright
review evals
```

Any PR modifying:

```text
knowledge/
packages/reviewer/
packages/ai/
```

must run the evaluation suite.

## Exit criteria

No known critical security issues.

No resume can access another user's data.

Hostile LaTeX cannot access application secrets.

AI regressions are detected before merge.

---

# Phase 9: Private beta

## Goal

Find out what students actually do rather than what everyone involved confidently imagined they would do.

Recruit:

```text
20-30 SWE students
10-20 mechanical students
```

Watch:

- where they get confused
- questions they refuse to answer
- suggestions they reject
- compilation failures
- whether they understand AI reasoning
- whether final resumes actually improve

Personally re-review their before/after resumes.

Compare:

```text
your manual final resume
vs
product final resume
```

Any major disagreement becomes a new eval case.

## Exit criteria

You would personally be comfortable recommending the resulting resumes.

---

# Phase 10: Public launch

Launch only after the review quality is defensible.

Primary positioning:

> An open-source technical resume reviewer built from hundreds of real resume reviews.

Secondary positioning:

> It doesn't invent your achievements. It asks until it understands them.

Primary audiences:

```text
engineering students
university engineering communities
hackathon communities
CS clubs
design teams
internship applicants
```

---

# 46. Things to build after launch

Only after seeing demand:

## PDF import

Convert uploaded resumes into editable source.

## Better LaTeX language support

Autocomplete and AST-aware editing.

## Source ↔ PDF synchronization

Click resume bullet → source location.

## Resume memory

Students record accomplishments during internships.

Later:

> Add what you did today.

Then when internship ends, the reviewer already has:

```text
metrics
projects
technical decisions
impact
```

This could become a separate major feature.

## Additional templates

Only if users actually struggle with templates.

## Additional disciplines

Only after SWE and mechanical are excellent.

---

# 47. Key architecture

The Vite browser client calls a separate Node application/API layer. References to the “Next.js Application” below should be read as the application API rather than a frontend-framework requirement.

```text
                         OpenAI
                           ▲
                           │
                           │
Browser ─────► Application API ─────────► Supabase
   │                    │                   │
   │                    │                   ├─ Auth
   │                    │                   ├─ Postgres
   │                    │                   └─ Storage
   │                    │
   │                    ├──────────────► Ko-fi webhook
   │                    │
   │                    ▼
   │             Compiler Service
   │                    │
   │                    ▼
   │              Tectonic sandbox
   │
   └──── CodeMirror + PDF Preview
```

---

# 48. Technology summary

```text
Frontend
Vite
React
TypeScript
styled-components
CodeMirror 6
react-resizable-panels

LaTeX
@unified-latex/unified-latex
Tectonic
Docker

AI
OpenAI Responses API
OpenAI Node SDK
Zod

Database
PostgreSQL
Supabase
Drizzle ORM

Authentication
Supabase Auth

Storage
Supabase Storage

Payments
Ko-fi

Analytics
PostHog

Monitoring
Sentry

Rate limiting
Upstash Redis

Testing
Vitest
Playwright

Repository
npm
single application initially

Hosting
Vercel or Cloudflare Pages: web
Node-compatible host: application API
Supabase: database/auth/storage
Cloud Run or Fly.io: compiler
```

---

# 49. Core invariant

Every AI-produced sentence that introduces factual substance must trace back to:

```text
ORIGINAL RESUME
       OR
VERIFIED USER STATEMENT
```

Conceptually:

```text
final claim
    ↓
fact ledger
    ↓
resume / user message
```

If the model cannot establish that chain:

```text
ASK
```

not:

```text
GUESS
```

That rule should exist at the prompt layer, tool layer, evaluation layer, and product-design layer.

---

# 50. Definition of v1

V1 is complete when a software or mechanical engineering student can:

```text
1. Paste a one-file LaTeX resume
2. See it compile
3. Start an expert review
4. Understand what is weak and why
5. Answer targeted follow-up questions
6. Give the reviewer missing technical substance
7. Receive grounded rewrite suggestions
8. Accept or reject every change
9. See changes immediately in the PDF
10. Restore previous versions
11. Finish with a substantially improved resume
12. Download the final .tex and PDF
```

Nothing else is required for the first real product.

The product wins if students leave with both:

> **a better understanding of how to communicate their engineering work**

and

> **a resume you would personally consider excellent.**
