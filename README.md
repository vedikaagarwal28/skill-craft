# SkillCraft Micro-Jobs

**A local-work marketplace built around a relational database.** Employers post jobs, artisans bid, and one accepted bid becomes a contract. The database keeps the job, competing bids, contract, payment-status record, and review consistent as work moves through that sequence.

This branch is a **DBTHON 2026 prototype proposal**. It is separate from `main`. [Home](docs/marketplace-v2-home.png) · [Artisan directory](docs/marketplace-v2-artisans.png) · [Artisan workspace](docs/marketplace-v2-dashboard.png)

## The problem and the database idea

Small local jobs are often shared through personal contacts and chat groups. An artisan can miss a job outside their network, while an employer has little structured information for comparing offers. A chat thread also does not reliably connect the original brief, every bid, the chosen worker, and the later review.

SkillCraft stores those events as related records. It gives artisans a searchable list of open work and their own bids; employers see their jobs, applicants, hires, and payment-status records. The current database feature that goes beyond basic record keeping is **contract-linked trust**: an employer can review an artisan only after marking a contract paid, and a database trigger recalculates that artisan's score from those reviews. The score uses a three-review, 3.5-star prior so a single five-star review does not immediately yield a perfect score. This is a candidate DBTHON innovation; its distinctiveness and benefit still need comparison with a conventional rating system.

The app does **not** transfer or independently verify money, hold escrow, resolve disputes, or prove that work was completed. “Paid” means the employer recorded that status. Its sample users and jobs are synthetic.

## DBTHON 2026 rubric: what to show

The challenge PDF gives 30 marks across the eight components below. “Evidence now” points to inspectable implementation; “Still needed” is work to agree and measure before the final presentation.

| Component | Marks | Evidence now | Still needed for a strong claim |
| --- | ---: | --- | --- |
| Problem identification & domain relevance | 4 | Local-job workflow above; requirements in [Requirements Spec](docs/Requirements_Spec.md) | Validate the problem with sourced or clearly labeled user evidence |
| Database design & modeling | 5 | [ER diagram](database/ER_DIAGRAM.md), [six-table schema](database/01_schema.sql), keys and checks, [normalization explanation](docs/Normalization_Justification.md) | Correct any diagram/schema mismatches; explain why the stored trust score is derived data |
| DBMS implementation & technical depth | 5 | PostgreSQL schema, three views, two triggers, a PL/pgSQL score function, indexes, parameterized SQL, and `SELECT ... FOR UPDATE` in [bid acceptance](backend/src/controllers/applications.controller.js) | Show live queries and a reproducible concurrent-acceptance test against PostgreSQL |
| Innovation | 4 | [Contract-linked trust recalculation](database/02_03_views_triggers_procedures.sql) and automatic single-winner contract workflow | Select one main database innovation and make its mechanism and benefit explicit |
| Novelty & differentiation | 5 | Reviews are tied to contracts marked paid; score uses a stabilizing prior rather than a plain average | Compare against a conventional baseline and show why this is meaningfully different, not merely a feature list |
| SDG alignment & societal impact | 2 | Intended connection to **SDG 8: Decent Work and Economic Growth** through access to local work and a portable job history | Label earnings and inclusion estimates as projections until supported by measured or sourced data |
| Validation & measurable improvement | 3 | [Schema/API smoke tests](backend/tests/), [browser workflow test](frontend/tests/demo.spec.js) | Add repeatable baseline-versus-proposed measurements; no improvement number is established yet |
| Technology Readiness Level & demonstration | 2 | Working local prototype with seeded accounts and a two-role end-to-end flow | Demonstrate it live; avoid claiming field validation or deployment readiness without a pilot |

### Suggested panel demonstration

1. Show the [ER diagram](database/ER_DIAGRAM.md): an employer posts a job; multiple artisans can bid; one accepted bid creates one contract; a paid-status contract can receive one review.
2. Log in as Ramesh and post a job. Log in as Lakshmi to find it and bid. Return as Ramesh to accept a bid. Show that the gig closes and competing pending bids are rejected.
3. Show the corresponding rows in `GIG_POSTINGS`, `GIG_APPLICATIONS`, and `COMPLETION_CONTRACTS`; point to the trigger and unique constraints that maintain the relationship.
4. Record payment status, add a review, then query the artisan's updated `Trust_Score`. Explain that the score is derived from contract-linked reviews and that payment is currently self-reported.
5. Present a measured comparison only after the baseline, dataset, and repeatable test have been built. Functional tests are evidence that the workflow works; they are not proof of speed, fairness, or economic impact.

## Database model

| Table | Role |
| --- | --- |
| `USERS` | Identity, password hash, and account role |
| `ARTISANS` | Skill, location, rate, and derived trust score |
| `GIG_POSTINGS` | Employer jobs, budget, location, and status |
| `GIG_APPLICATIONS` | Artisan bids and decisions; at most one bid per artisan per job |
| `COMPLETION_CONTRACTS` | Accepted match, agreed amount, and employer-recorded payment status; at most one contract per job |
| `RATINGS_REVIEWS` | One employer review per contract |

The tables are documented as third normal form in [Normalization Justification](docs/Normalization_Justification.md). `ARTISANS.Trust_Score` is deliberately cached derived data; the review trigger updates it. The [SQL implementation](database/02_03_views_triggers_procedures.sql) also defines `Top_Rated_Artisans_View`, `Skill_Category_Earnings_View`, and `Open_Gigs_View` for read-oriented queries.

The stack is PostgreSQL-compatible SQL for data, Node.js/Express for the API, and React/Vite for the interface. The API uses the `pg` driver with parameterized SQL. Local preview uses PGlite to run the same schema; the Docker configuration uses PostgreSQL 15.

An accepted bid is processed in a serializable transaction. The API locks the job row with `SELECT ... FOR UPDATE`, checks that it is still open, then accepts the bid. A trigger closes the job, creates a contract, and rejects other pending bids. A unique contract-per-job constraint supplies an additional integrity rule. [Schema smoke](backend/tests/schema-smoke.mjs) checks the trigger and seeded relationships; [API flow](backend/tests/api-flow.mjs) checks the post-to-review journey and negative role cases. The [Jest concurrency test](backend/tests/bidAcceptance.test.js) checks the one-winner outcome; the result is produced by the combined transaction, row lock, trigger, and constraint, not attributed to the lock alone.

Security is primarily enforced by JWT authentication, API role checks, ownership checks, password hashing, and parameterized SQL. [PostgreSQL roles](database/04_roles_permissions.sql) demonstrate table-level grants; the app connects through a pooled service account. Database row-level security is **not** implemented, so these demonstration roles do not isolate each user's rows by themselves.

These read-only queries make the live database changes visible during a panel demo:

```sql
SELECT Gig_ID, Skill_Required, Status FROM GIG_POSTINGS ORDER BY Gig_ID DESC LIMIT 5;
SELECT Gig_ID, Artisan_ID, Bid_Amount, Application_Status
  FROM GIG_APPLICATIONS ORDER BY Application_ID DESC LIMIT 5;
SELECT Contract_ID, Gig_ID, Selected_Artisan_ID, Payment_Status
  FROM COMPLETION_CONTRACTS ORDER BY Contract_ID DESC LIMIT 5;
SELECT Artisan_ID, Full_Name, Trust_Score, total_reviews
  FROM Top_Rated_Artisans_View LIMIT 5;
```

## Run the connected prototype

Use two terminals from the repository root. You need Node.js 18+ and npm. The preview command starts a persistent local PostgreSQL-compatible database through PGlite, loads the project's PostgreSQL schema and synthetic seed data, and serves the Express API on port 5000.

```bash
cd backend
npm install
npm run dev:preview
```

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Open **http://127.0.0.1:5174**. The preview database listens on port 5433 and stores local data in ignored `backend/.test-db/marketplace-v2`. To try both roles, use the synthetic seed accounts with password `password123`:

| Role | Email | What to inspect |
| --- | --- | --- |
| Artisan | `lakshmi@skillcraft.local` | Find work, send bids, track agreements |
| Employer | `ramesh@constructionco.in` | Post jobs, compare bids, record hires and payment status |

The frontend also has an optional browser-only visual demo with `VITE_DEMO_MODE=true`. It does **not** use the backend database and should not be used for the DBMS demonstration.

The repository also has a Docker Compose setup for PostgreSQL on port 5432, the API on 5000, and the frontend on 5173. Its fresh-volume initialization now includes the v2 migrations; Docker was not available in this review environment, so **the local preview above is the verified walkthrough**. Existing PostgreSQL databases need the non-destructive [proposal-note](database/06_proposal_note.sql) and [unique-contract](database/08_unique_contracts.sql) migrations, plus the updated views and triggers, before using this branch. Review duplicate contracts manually if the unique constraint cannot be added. Do not run the destructive `01_schema.sql` against existing data.

## Verify the prototype

```bash
cd backend
npm test
```

This runs the self-contained schema and API workflow checks. `npm run test:jest-local` runs the 19 CRUD and 4 concurrency/integrity Jest cases against fresh PGlite databases; this checks behavior but does not reproduce PostgreSQL server concurrency. With a separately configured PostgreSQL test database, `npm run test:postgres` runs the same Jest suite. In `frontend`, run `npm run build` and `npm run test:e2e`; Playwright needs Chromium installed or `PLAYWRIGHT_BROWSER_PATH` set to a local Chromium/Edge executable.

## Current evaluation limits

- There is no baseline comparison or measured query latency, scale, ranking quality, security outcome, or earnings uplift in this branch yet.
- The trust score depends on employer-entered payment status and employer reviews; it is not independently verified and has not been tested for fairness or abuse resistance.
- The SQL role grants are demonstrative. User ownership is checked by the API; database row-level security is future work.
- Prior reports in [`docs/`](docs/) include estimates and assertions from the original course proposal. Treat them as background or hypotheses until their sources and measurements are verified for DBTHON.

## Team and project files

| Contributor | Registration number | Listed contribution in the original project |
| --- | --- | --- |
| Vedika Agarwal | 24BCE2601 | Schema, triggers, trust-score and bidding logic |
| Bhavyaveer Kumar | 24BCE2252 | Application and database integration |
| Anuj Deshpande | 24BCE0794 | Evidence, testing, validation, and reporting |

Faculty guide: Siva Sankari · Academic year: 2026–2027. Original course deliverables remain in [`docs/`](docs/), with the [requirements](docs/Requirements_Spec.md), [testing report](docs/Testing_Validation_Report.md), and [impact/TRL report](docs/Impact_and_TRL_Report.md) available for review. License: MIT.
