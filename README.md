# GovSpend Nexus AI — Local MVP

Government financial intelligence and audit-prioritisation console. This implementation follows the supplied blueprint's core trust boundary: deterministic scoring and masked evidence first; grounded explanations and authorised human decisions second.

## What is implemented

- React/Vite auditor console whose overview, transactions, reconciliation, vendor intelligence and audit queue are loaded from API data.
- Persistent synthetic transaction dataset in `data/transactions.json`, generated reproducibly with `pnpm generate:data`.
- Local Express API with signed JWT sessions, RBAC permission checks, transaction ingestion and dynamic case derivation.
- Deterministic weighted, confidence-gated risk scoring with versioned policy weights.
- Masked case records, vendor graph endpoint and grounded explanation contract.
- Human case actions and maker-checker unmask request guardrail (self-approval is blocked).
- Append-only hash-chained audit entries for logins, reads, explanations, actions and unmask requests.
- Vercel-compatible serverless API entry at `api/[...path].js`.

## Run locally

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
2. Install dependencies with `pnpm install`.
3. In one terminal, run `pnpm dev:api`.
4. In another terminal, run `pnpm dev`.
5. Set `AUTH_DEPARTMENT_ID`, `AUTH_OFFICER_ID` and a strong `AUTH_PASSWORD` in `.env`, then open `http://localhost:5173` and sign in with those values.

## Verification

Run `pnpm build` for the frontend production build. The local API health endpoint is available at `http://localhost:8787/api/health`.

## Deployment note

The Vercel deployment is suitable for synthetic MVP data and API logic only. Add `JWT_SECRET`, `AUTH_DEPARTMENT_ID`, `AUTH_OFFICER_ID`, `AUTH_PASSWORD` and `ALLOWED_ORIGIN` in Vercel Project Settings → Environment Variables before signing in. Vercel functions are stateless, so locally ingested records persist to the JSON dataset whereas a Vercel runtime resets memory between invocations. Before a real government deployment, replace the single test login and JSON data store with OIDC/MFA, PostgreSQL/Redis, a KMS-backed isolated ledger, managed policy corpus, production logging, and independently reviewed network controls. No real PII should be entered into this MVP.

## Groq AI explanation setup

The API calls Groq only for the AI Auditor explanation. Deterministic scoring always runs first, and the model receives masked fields plus calculated evidence only. Its returned citations are checked against evidence IDs before display; if Groq is not configured or fails, the server returns the deterministic explanation instead.

1. In the Groq console, revoke any key previously shared in chat and create a replacement key.
2. Locally, put it in `.env` as `GROQ_API_KEY=...` and run `pnpm dev:api`.
3. For Vercel, open **Project → Settings → Environment Variables**, add `GROQ_API_KEY` and `GROQ_MODEL=llama-3.3-70b-versatile` for Production, Preview and Development, then redeploy.

Never put provider keys in source files, `.env.example`, browser code, or GitHub.
