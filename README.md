# Relay

A live, multi-tenant business messaging workspace with a pink-and-berry landing page, React dashboard, Supabase Auth/Postgres, and backend AI. The user’s updated provider choice is **Groq**, using its OpenAI-compatible Responses API. There is no demo database fallback or browser AI client.

## Run

```sh
npm install
npm run dev
```

- Landing page: http://localhost:5173/
- Owner login: http://localhost:5173/#login
- Private credentials: `.local/owner-credentials.txt` (gitignored).
- API: http://localhost:3001; health: `/healthz`.

The provided Supabase project is linked and both migrations have been applied. An actual owner user and organization membership have been provisioned and verified. The login email is a local alias, not an email inbox. The workspace starts empty so that no fictitious business information or customers appear. Enter verified information in **Settings** and **Business knowledge**.

## Configuration

`.env.development` holds the locally configured project and server secrets; `.env.production` contains only public frontend configuration. Neither is committed. `.env.example` documents the variables. Production deployment must supply its own environment, HTTPS frontend origin, and API URL.

- Supabase: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SERVER_SUPABASE_SECRET_KEY`.
- Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (blank with Vite proxy).
- AI: `AI_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b`, `GROQ_REASONING_EFFORT=low`.
- Optional original provider: `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`.
- Limits: `AI_REQUESTS_PER_MINUTE`, `AI_REQUESTS_PER_DAY`, `AI_MONTHLY_TOKEN_LIMIT`, `AI_MAX_OUTPUT_TOKENS`; per-organization limits live in `ai_settings`.
- Prices per million tokens: `AI_MODEL_PRICING` JSON. Missing model pricing produces a null estimate rather than a fabricated price.
- Meta: `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `TOKEN_ENCRYPTION_KEY` (32 random bytes in base64), `WEBHOOK_BASE_URL`.
- Optional tunnel: `NGROK_AUTH_TOKEN`; business logic never depends on ngrok.

Groq model and Responses integration were checked against [Groq Responses documentation](https://console.groq.com/docs/responses-api), [structured outputs](https://console.groq.com/docs/structured-outputs), and [the model page](https://console.groq.com/docs/model/openai/gpt-oss-20b). Actual authenticated model listing and live generation passed. The OpenAI option uses an environment-selected model, with the example verified against [GPT-4.1 mini documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## What is implemented

- Landing page, responsive dashboard, actual Supabase sign-in/sign-up and organization onboarding.
- Unified inbox, manual replies, human handoff, assignment, internal handoff notes and notifications.
- Assistant configuration, business hours, test chat, verified knowledge, deterministic keyword rules.
- Draft creation/editing/regeneration/approval/deletion, explicit social-post scheduling, usage analytics/export and team invitations.
- Signed Meta webhook ingress, persistent webhook jobs, account routing, transactional inbound idempotency, outbox, bounded processing and delivery recovery.
- Facebook Login OAuth for Pages and linked Instagram professional accounts; encrypted page access tokens; backend send and publishing adapters.
- All 11 specified AI operations in one service, structured decisions, bounded history with extractive compaction, usage reservations and actual usage tracking.

## Security and behavior

Every API request verifies the Supabase user with the auth server and looks up current organization membership. A workspace selector never grants membership. SQL composite foreign keys prevent cross-organization references. All 19 public tables have RLS. Browser roles get scoped reads only; provider credentials, OAuth states, webhook jobs and outbox have no browser grants. Usage and request audit tables are admin-only. All privileged RPCs are service-only.

Customer-facing AI responses are assembled from owner-verified fact excerpts selected by the model. This deliberately limits free-form paraphrasing, including personality effects, in exchange for a deterministic factual boundary. AI marketing drafts have text checks and always require owner review. Customer history and summaries remain untrusted user-level data, not business facts.

Global and tenant AI admission limits use PostgreSQL advisory locks and conservative token reservations. Unknown usage after a timeout keeps the reservation. No automatic provider retry can silently exceed the budget. Logs contain metadata, not customer messages or credentials.

Handoff cancels pending automated replies. Already in-flight network sends cannot be recalled. Meta provides no universal exactly-once send guarantee: ambiguous sends are marked `needs_review` and are never automatically resent. Inbound events are uniquely constrained; a crashed worker’s already-stored message is handed off instead of generating a duplicate reply. Replies are restricted to the standard 24-hour messaging window.

The worker runs inside the dedicated API process. Keep that process running; do not deploy it as an ephemeral frontend function. Worker claims are transactional and support multiple replicas. Basic HTTP rate limiting is per process; AI spend limits are database-global.

## Routes

All business/AI endpoints require verified authentication; writes to settings, knowledge, automation, publishing, team, and AI generation require owner/admin access.

```
POST /api/onboarding
GET  /api/dashboard
GET  /api/conversations/:id/messages
POST /api/conversations/:id/messages
PATCH /api/conversations/:id
PUT /api/settings, /api/business
POST /api/knowledge, /api/automations
PUT, DELETE /api/knowledge/:id, /api/automations/:id
POST /api/drafts
PATCH, DELETE /api/drafts/:id
POST /api/team
PATCH /api/notifications/:id
POST /api/meta/connect
DELETE /api/accounts/:id
GET /api/meta/callback
GET, POST /api/meta/webhook
POST /api/ai/chat, /api/ai/test, /api/ai/classify
POST /api/ai/summarize, /api/ai/handoff
POST /api/ai/generate-faqs, /api/ai/generate-business-profile
POST /api/ai/generate-welcome-message, /api/ai/generate-fallback-message
POST /api/ai/generate-post-caption, /api/ai/generate-automation-suggestions
GET /api/ai/usage, /api/ai/health
```

The webhook uses Meta signature authentication; OAuth callback uses expiring, single-use state bound to an HttpOnly browser cookie and current admin membership. Test/chat generation endpoints do not send customer messages. Only the worker or explicit manual reply flow can enqueue live messages.

## Files and database

- `src/`: landing page, shared live API store, authentication, dashboard pages, responsive styles.
- `server/`: Express API, auth, repository, AI abstraction, Meta adapter and durable worker.
- `shared/contracts.ts`: shared TypeScript and Zod contracts.
- `supabase/migrations/202609190001_initial.sql`: 19 tables, indexes, RLS, quotas, ingestion, handoff and outbox RPCs.
- `supabase/migrations/202609190002_hardening.sql`: atomic account binding, owner onboarding, admin usage policies, interrupted-delivery recovery.
- `tests/`: unit/service/API tests, PostgreSQL migration/RLS tests using PGlite, desktop/mobile Playwright tests.
- `scripts/`: private owner provisioning and live verification helpers. Provisioning is idempotent; it does not reset an existing password.
- `DESIGN.md`: installed by `npx getdesign@latest add uber`, with the requested palette adaptation documented.
- `public/images/relay-studio.png`: custom artwork created with the built-in Imagegen tool. Prompt: editorial illustration of a Filipina business owner at a flower studio with a pink laptop, cream desk, blush/berry palette, no text or logos.

## Verification

```sh
npm run lint
npm test
npm run build
npm run test:e2e
npx tsx scripts/live-smoke.ts
```

Verified: actual owner sign-in and membership, live dashboard, real Groq Responses generation, persisted provider usage, cross-tenant request rejection, 63 automated backend/database tests, and 4 desktop/mobile browser tests covering landing, login, dashboard and actual AI test chat. Frontend source and build are checked for server secrets. No customer messages were sent by verification; test usage is explicitly flagged.

## Remaining external setup / limits

- **Meta credentials, app review/permissions, and a public webhook URL have not been supplied.** Real Facebook/Instagram messages and post publishing cannot be verified until these are configured and a business account is connected. `Connect a channel` reports this rather than pretending to connect.
- The fresh workspace has no client business facts or connected social accounts. Add real content before enabling customer-facing automation.
- Deployment to Vercel/a dedicated API host is not performed. The running site is local.
- Dashboard lists currently load the latest 200 records; analytics show that recent window. Add pagination/aggregation for larger production workloads.
- Social account discovery handles the first 100 Pages. Instagram post publishing needs a public HTTPS image; container readiness failures require review. Failed/ambiguous posts remain reviewable and are never blindly retried.
- Generated facts are not automatically promoted into verified knowledge. Review and add them explicitly.

There is no claim that live Meta delivery is operational before that setup is complete.
