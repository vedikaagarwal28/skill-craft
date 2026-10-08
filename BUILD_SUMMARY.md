# SkillCraft build summary

Updated 7 October 2026. This describes the **separate marketplace proposal branch**; the original `main` branch remains available.

## Working prototype

| Layer | What exists | Evidence |
| --- | --- | --- |
| Database | Seven relational tables, keys/checks/indexes, append-only contract events, two-party payment confirmation, row-level security, a trust-score function, and unique contract-per-job rule | [`database/`](database/), [`backend/tests/schema-smoke.mjs`](backend/tests/schema-smoke.mjs) |
| API | Login by email or phone, role and ownership checks, job/bid/contract/review routes, transaction-safe bid acceptance and cancellation | [`backend/src/`](backend/src/), [`backend/tests/api-flow.mjs`](backend/tests/api-flow.mjs) |
| Frontend | Connected React/Vite marketplace with distinct artisan and employer navigation and working end-to-end flow | [`frontend/src/App.jsx`](frontend/src/App.jsx), [`frontend/tests/demo.spec.js`](frontend/tests/demo.spec.js) |
| Local preview | PGlite runs the PostgreSQL schema and persists demo changes locally | [`backend/scripts/dev-with-pglite.mjs`](backend/scripts/dev-with-pglite.mjs) |

The unused earlier frontend pages have been removed from this proposal branch. They had obsolete request paths and response fields; the live interface is `frontend/src/App.jsx` with API mapping in `frontend/src/marketplace.js`.

## Verification

Run `npm test` in `backend` for self-contained schema and API tests, `npm run test:jest-local` for 20 CRUD and 4 concurrency/integrity cases, `npm run build` in `frontend`, and `npm run test:e2e` for the browser flow. The native PostgreSQL variant (`npm run test:postgres`) needs a configured PostgreSQL test database and is not claimed as run here.

## Limits relevant to DBTHON

- New paid contracts require both employer payment-sent and artisan receipt records. These are user claims, not a payment gateway, escrow, or bank verification.
- A restricted API database role and row-level policies enforce ownership in addition to API checks.
- The candidate innovation combines two-party acknowledgment, append-only history, and contract-linked trust scoring. No measured baseline comparison is claimed yet.
- Societal earnings figures in earlier drafts were projections from assumptions, not observed outcomes.
- Docker Compose now includes the v2 migrations for fresh database volumes, but it was not run in this environment. The connected local preview in the [README](README.md) was verified.

The [README](README.md) maps the implementation and gaps to the marking rubric. The [new panel slides](docs/SkillCraft_DBTHON_2026_Panel.pptx) reflect this iteration.
