# AI Tourism Intelligence & Heritage Management Platform

PRD-aligned local prototype for the golden path: site QR/manual entry, tourist issue report, deterministic enrichment, and a protected government dashboard.

## Run locally

1. Copy `.env.example` to `.env` and replace all secrets.
2. Run `pnpm install`.
3. In one terminal run `pnpm dev:api`; in another run `pnpm dev`.
4. Open `http://localhost:5173`. The government login uses the credentials in `.env`.

The API refuses to start with default secrets outside development. The sample data is intentionally synthetic. This starter uses in-memory data only; PostgreSQL, migrations, object storage, asynchronous jobs, and production deployment are planned next and are not represented as completed.

## Security baseline in this starter

- JWT authentication and role checks for government routes
- rate-limited login and report submission routes
- request validation, payload limits, and image MIME/size limits
- private, non-enumerated report identifiers
- no production secret fallback
- security headers and restricted CORS

## Current scope

Implemented: T18-style vertical slice and partial T40-T43 product shell.

Not implemented: persistent storage, object-storage lifecycle, CV model execution, real location ingestion, WebSockets, RAG/LLM, approvals, and external action automation.
