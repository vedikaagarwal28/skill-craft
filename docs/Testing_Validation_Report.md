# Testing and validation report

Updated 7 October 2026. This report distinguishes **tests run by the default commands** from earlier tests that require a separate PostgreSQL test database.

| Command | Coverage | Status / scope |
| --- | --- | --- |
| `cd backend && npm test` | `schema-smoke.mjs` loads schema and seed, checks accounts, ownership, trust score, accepted-bid trigger and unique contracts; `api-flow.mjs` starts the API and checks registration, login, posting, bidding, ownership, cancellation, contracts, review and private fields | Self-contained; uses an in-memory PostgreSQL-compatible PGlite database |
| `cd frontend && npm run build` | Production bundle and module resolution | Build check, not a database test |
| `cd frontend && npm run test:e2e` | Browser-only app workflow and long-text/mobile regression | Uses Playwright's visual demo mode; does not prove API/database behavior |
| `cd backend && npm run test:jest-local` | Jest/Supertest suite: 19 CRUD tests and 4 concurrency/integrity tests | Fresh PGlite database per suite; checks behavior but does not measure PostgreSQL server concurrency |
| `cd backend && npm run test:postgres` | Same Jest/Supertest tests against native PostgreSQL | Requires a separately configured PostgreSQL test database; do not describe as passed unless actually run |

## API checks that matter to the rubric

- **Routes and field mapping:** `/api/artisans/1`, `/api/gigs`, `/api/gigs/mine`, and the authenticated job detail return usable records. The active frontend maps lowercase `pg` response fields in `frontend/src/marketplace.js`.
- **Access control:** artisan posting a job and employer bidding return 403; public admin registration returns 400; a second employer cannot cancel, inspect bids on, or accept a bid for another employer's job. Public artisan profiles omit phone and email.
- **Cancellation:** an open job with two pending bids becomes cancelled, both bids become rejected, and a later bid fails.
- **Accepted bid:** a job receives one contract; competing pending bids are rejected by the database trigger. The API uses both serializable isolation and a gig-row lock. A losing concurrent request may receive 409 from a closed-status check or a serialization conflict; the response code alone does not prove which mechanism won.
- **Review score:** a review requires a contract marked paid by the employer; the database trigger recalculates the cached artisan trust score.

## Evidence still needed for DBTHON

The current tests establish functional behavior in controlled local conditions. They do not measure query latency, index benefit, ranking quality, fraud reduction, concurrency throughput, security against a hostile user, or societal impact. For the final panel, define a conventional baseline, data size, repeat count, and metric before claiming an improvement.
