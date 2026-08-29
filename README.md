# GovSpend Nexus AI — Local MVP

Government financial intelligence and audit-prioritisation console. This implementation follows the supplied blueprint's core trust boundary: deterministic scoring and masked evidence first; grounded explanations and authorised human decisions second.

## What is implemented

- React/Vite auditor console with the full seeded investigation journey.
- Local Express API with signed JWT sessions, RBAC permission checks and jurisdiction scoping.
- Deterministic weighted, confidence-gated risk scoring with versioned policy weights.
- Masked case records, benchmark endpoint, vendor graph endpoint and grounded explanation contract.
- Human case actions and maker-checker unmask request guardrail (self-approval is blocked).
- Append-only hash-chained audit entries for logins, reads, explanations, actions and unmask requests.
- Vercel-compatible serverless API entry at `api/[...path].js`.

## Run locally

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
2. Install dependencies with `pnpm install`.
3. In one terminal, run `pnpm dev:api`.
4. In another terminal, run `pnpm dev`.
5. Open `http://localhost:5173` and use the prefilled demo credentials.

## Verification

Run `pnpm build` for the frontend production build. The local API health endpoint is available at `http://localhost:8787/api/health`.

## Deployment note

The Vercel deployment is suitable for the synthetic MVP data and local API logic. Before a real government deployment, replace the local secret and in-memory stores with OIDC/MFA, PostgreSQL/Redis, a KMS-backed isolated ledger, managed policy corpus, production logging, and independently reviewed network controls. No real PII should be entered into this MVP.
