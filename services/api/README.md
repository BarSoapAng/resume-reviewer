# Application API

The API is a separate Node process. It authenticates bearer tokens with Supabase Auth, performs an explicit owner check on every user-owned operation, proxies compilation to the isolated compiler service, and keeps database access behind `Repository`.

Copy `.env.example`, apply `supabase/migrations`, then use the local scripts:

```bash
cd services/api
npm install
npm run dev
```

`POST /api/compile` is intentionally anonymous. AI review routes require authentication and an available entitlement. Ko-fi sends either JSON or its standard URL-encoded `data` field to `POST /api/webhooks/kofi`; duplicate transaction IDs are acknowledged without issuing another entitlement.

The default server adapter uses the repository's current project source, the versioned knowledge rubric, and the OpenAI structured reviewer. Set `OPENAI_API_KEY` and `OPENAI_REVIEW_MODEL` before enabling review messages.
