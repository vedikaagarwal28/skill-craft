# SkillCraft build summary

Updated 7 October 2026. This describes the **separate marketplace proposal branch**; the original `main` branch remains available.

## Working prototype

| Layer | What exists | Evidence |
| --- | --- | --- |
| Database | Six relational tables, keys/checks/indexes, three views, two triggers, a trust-score function, and unique contract-per-job rule | [`database/`](database/), [`backend/tests/schema-smoke.mjs`](backend/tests/schema-smoke.mjs) |
| API | Login by email or phone, role and ownership checks, job/bid/contract/review routes, transaction-safe bid acceptance and cancellation | [`backend/src/`](backend/src/), [`backend/tests/api-flow.mjs`](backend/tests/api-flow.mjs) |
| Frontend | Connected React/Vite marketplace with distinct artisan and employer navigation and working end-to-end flow | [`frontend/src/App.jsx`](frontend/src/App.jsx), [`frontend/tests/demo.spec.js`](frontend/tests/demo.spec.js) |
| Local preview | PGlite runs the PostgreSQL schema and persists demo changes locally | [`backend/scripts/dev-with-pglite.mjs`](backend/scripts/dev-with-pglite.mjs) |

The unused earlier frontend pages have been removed from this proposal branch. They had obsolete request paths and response fields; the live interface is `frontend/src/App.jsx` with API mapping in `frontend/src/marketplace.js`.

## Verification

Run `npm test` in `backend` for self-contained schema and API tests, `npm run test:jest-local` there for the repaired 19 CRUD and 4 concurrency/integrity Jest cases on fresh PGlite databases, `npm run build` in `frontend` for a production build, and `npm run test:e2e` for the browser flow. The native PostgreSQL variant (`npm run test:postgres`) needs a configured PostgreSQL test database and is not claimed as run here. The current API flow includes negative role/ownership cases and checks that cancelling a job rejects pending bids.

## Limits relevant to DBTHON

- Payment is an employer-recorded status, not a payment gateway, escrow, or independent verification.
- SQL roles demonstrate table grants; API checks enforce per-user ownership. Row-level security is not implemented.
- The candidate database innovation is contract-linked, smoothed trust scoring. There is no measured baseline comparison yet.
- Societal earnings figures in earlier drafts were projections from assumptions, not observed outcomes.
- Docker Compose now includes the v2 migrations for fresh database volumes, but it was not run in this environment. The connected local preview in the [README](README.md) was verified.

The [README](README.md) maps the implementation and these gaps directly to the DBTHON 2026 marking rubric.
