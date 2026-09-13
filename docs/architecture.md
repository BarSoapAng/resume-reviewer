# Architecture

Draftwise separates trusted application code from hostile LaTeX execution.

```text
Browser -> Application API -> Supabase
                   |
                   +-> OpenAI Responses API (store: false)
                   |
                   +-> isolated compiler service -> Tectonic --untrusted
```

The browser may compile an anonymous draft but must authenticate before creating a persisted project or starting an AI review. The application API owns workflow transitions, entitlement checks, versions, and edit acceptance. The model can only return structured review actions; it cannot write a document, execute LaTeX, mutate persistence, charge a user, or delete a project.

## Trust boundaries

- The compiler receives one bounded `.tex` string and has no application, database, payment, or AI credentials.
- Production must run the compiler container without outbound networking, with a read-only root filesystem, ephemeral work directories, CPU/RAM limits, and a hard timeout.
- The Supabase secret key is server-only. User operations are checked in the API and protected again by row-level security.
- Ko-fi webhooks are token-validated and idempotent by provider payment ID.
- OpenAI requests omit contact details where possible and use `store: false`.
- Analytics and error reports must never contain source, resume text, messages, names, or email addresses.

## Core invariant

Any factual substance in an edit must trace to the imported resume or a fact explicitly supplied by the user. The reviewer state machine and edit validator reject unsupported or stale proposals. Missing evidence results in a question, not a guessed achievement.

## Production deployment

Deploy the Vite bundle as static assets, the application API on a Node-compatible host, Supabase for PostgreSQL/Auth/Storage, and the compiler on an isolated container platform. Set all values documented in `.env.example`; only variables prefixed `VITE_` may enter the browser bundle.
