# SkillCraft Micro-Jobs

**A local-work marketplace built around a relational database.** Employers post jobs, artisans bid, and one accepted bid becomes a contract. The database keeps the job, competing bids, contract, payment-status record, and review consistent as work moves through that sequence.

This branch is the **working DBTHON 2026 prototype**, separate from `main`. [Editable panel slides](docs/SkillCraft_DBTHON_2026_Panel.pptx) · [View slides as PDF](docs/SkillCraft_DBTHON_2026_Panel.pdf) · [ER diagram](docs/skillcraft-er-diagram.svg) · [Home](docs/marketplace-v2-home.png) · [Artisan directory](docs/marketplace-v2-artisans.png) · [Artisan workspace](docs/marketplace-v2-dashboard.png)

![SkillCraft ER diagram with seven tables, primary and foreign keys, and relationship cardinalities](docs/skillcraft-er-diagram.svg)

[Open the full-size diagram](docs/skillcraft-er-diagram.svg) · [Read the table-by-table explanation](database/ER_DIAGRAM.md)

## The problem and the database idea

Small local jobs are often shared through personal contacts and chat groups. An artisan can miss a job outside their network, while an employer has little structured information for comparing offers. A chat thread also does not reliably connect the original brief, every bid, the chosen worker, and the later review.

SkillCraft stores those events as related records. Artisans search open work and track bids; employers see their jobs, applicants, and hires. **Contract-linked trust** now requires two actions for new contracts: the employer records payment sent, then the selected artisan confirms receipt. Only then is the contract marked paid and eligible for review. A trigger recalculates the artisan's score from contract-linked reviews, using a three-review, 3.5-star prior. An append-only event table records these steps. Indexed skill and location search ranks work and workers by a simple, inspectable 0–3 fit score.

The app does **not** transfer or independently verify money, hold escrow, resolve disputes, or prove that work was completed. “Paid” means both parties recorded the payment in the app for a new contract. Older paid sample contracts remain labeled legacy because they lack independent artisan confirmation. Its sample users and jobs are synthetic.

Artisans can also rate an employer once per paid contract. These reviews appear on that employer's job pages and do not change the artisan's trust score. For an existing PostgreSQL database, apply [migration 10](database/10_employer_reviews.sql) before starting the updated API; fresh Docker and local preview databases load it automatically.

## DBTHON 2026 rubric: what to show

**October 2026 update:** [Migration 09](database/09_dbthon_workflow.sql) adds a seventh table, `CONTRACT_EVENTS`, for append-only contract history; two-party payment acknowledgment for new contracts; indexed skill and location search with a transparent fit score; and row-level security under the restricted API database role. Previously paid seed rows remain labeled legacy because no artisan confirmation was recorded. Neither acknowledgment verifies a bank transfer. The [latest panel deck](docs/SkillCraft_DBTHON_2026_Panel.pptx) reflects this version.

The challenge PDF gives 30 marks across the eight components below. “Evidence now” points to inspectable implementation; “Still needed” is work to agree and measure before the final presentation.

| Component | Marks | Evidence now | Still needed for a strong claim |
| --- | ---: | --- | --- |
| Problem identification & domain relevance | 4 | Local-job workflow above; requirements in [Requirements Spec](docs/Requirements_Spec.md) | Validate the problem with sourced or clearly labeled user evidence |
| Database design & modeling | 5 | [ER diagram](database/ER_DIAGRAM.md), six core tables plus [contract history](database/09_dbthon_workflow.sql), keys and checks, [normalization explanation](docs/Normalization_Justification.md) | Explain why the trust score is cached derived data and why older paid rows are grandfathered |
| DBMS implementation & technical depth | 5 | PostgreSQL triggers/functions, indexed search, row-level security, parameterized SQL, and `SELECT ... FOR UPDATE` in [bid acceptance](backend/src/controllers/applications.controller.js) | Show native PostgreSQL query plans and a reproducible concurrent-acceptance test |
| Innovation | 4 | Two-party acknowledgment, append-only contract events, contract-linked trust, and automatic single-winner workflow | Explain the database-enforced transitions and limits of self-reported payment |
| Novelty & differentiation | 5 | Traceable contract events and restricted database role accompany the stabilized score | Compare against a plain average and an employer-only payment flag using repeatable data |
| SDG alignment & societal impact | 2 | Intended connection to **SDG 8: Decent Work and Economic Growth** through access to local work and a portable job history | Label earnings and inclusion estimates as projections until supported by measured or sourced data |
| Validation & measurable improvement | 3 | [Schema/API and row-security tests](backend/tests/), [browser workflow test](frontend/tests/demo.spec.js) | Add repeatable latency and ranking-quality measurements; no improvement number is established yet |
| Technology Readiness Level & demonstration | 2 | Working local prototype with seeded accounts and a two-role end-to-end flow | Demonstrate it live; avoid claiming field validation or deployment readiness without a pilot |

### Suggested panel demonstration

1. Show the [ER diagram](docs/skillcraft-er-diagram.svg): an employer posts a job; multiple artisans can bid; one accepted bid creates one contract; a paid-status contract can receive one review.
2. Log in as Ramesh and post a job. Log in as Lakshmi to find it and bid. Return as Ramesh to accept a bid. Show that the gig closes and competing pending bids are rejected.
3. Show the corresponding rows in `GIG_POSTINGS`, `GIG_APPLICATIONS`, and `COMPLETION_CONTRACTS`; point to the trigger and unique constraints that maintain the relationship.
4. Record payment sent as Ramesh, confirm receipt as Lakshmi, inspect `CONTRACT_EVENTS`, add a review, then query the artisan's updated `Trust_Score`. Explain that payment is self-reported by both parties.
5. Present a measured comparison only after the baseline, dataset, and repeatable test have been built. Functional tests are evidence that the workflow works; they are not proof of speed, fairness, or economic impact.

## Database model

| Table | Role |
| --- | --- |
| `USERS` | Identity, password hash, and account role |
| `ARTISANS` | Skill, location, rate, and derived trust score |
| `GIG_POSTINGS` | Employer jobs, budget, location, and status |
| `GIG_APPLICATIONS` | Artisan bids and decisions; at most one bid per artisan per job |
| `COMPLETION_CONTRACTS` | Accepted match, agreed amount, payment confirmation timestamps, and status; at most one contract per job |
| `RATINGS_REVIEWS` | One employer review per contract |
| `CONTRACT_EVENTS` | Append-only history of contract creation, payment sent, receipt, dispute, and review |

The six core tables are analyzed for third normal form in [Normalization Justification](docs/Normalization_Justification.md), which also explains the event table's JSONB metadata trade-off. `ARTISANS.Trust_Score` is deliberately cached derived data; the review trigger updates it. The [SQL implementation](database/02_03_views_triggers_procedures.sql) also defines `Top_Rated_Artisans_View`, `Skill_Category_Earnings_View`, and `Open_Gigs_View` for read-oriented queries.

The stack is PostgreSQL-compatible SQL for data, Node.js/Express for the API, and React/Vite for the interface. The API uses the `pg` driver with parameterized SQL. Local preview uses PGlite to run the same schema; the Docker configuration uses PostgreSQL 15.

An accepted bid is processed in a serializable transaction. The API locks the job row with `SELECT ... FOR UPDATE`, checks that it is still open, then accepts the bid. A trigger closes the job, creates a contract, and rejects other pending bids. A unique contract-per-job constraint supplies an additional integrity rule. [Schema smoke](backend/tests/schema-smoke.mjs) checks the trigger and seeded relationships; [API flow](backend/tests/api-flow.mjs) checks the post-to-review journey and negative role cases. The [Jest concurrency test](backend/tests/bidAcceptance.test.js) checks the one-winner outcome; the result is produced by the combined transaction, row lock, trigger, and constraint, not attributed to the lock alone.

Signed-in marketplace requests assume the restricted `skillcraft_runtime` database role and pass the verified user ID and role as transaction-local settings. [Row-level policies](database/09_dbthon_workflow.sql) restrict bids, contracts, reviews, and contract history; column grants block direct trust-score edits. Public reputation facts come from limited views. JWT authentication, password hashing, API checks, and parameterized SQL remain part of the security boundary.

These read-only queries make the live database changes visible during a panel demo:

```sql
SELECT Gig_ID, Skill_Required, Status FROM GIG_POSTINGS ORDER BY Gig_ID DESC LIMIT 5;
SELECT Gig_ID, Artisan_ID, Bid_Amount, Application_Status
  FROM GIG_APPLICATIONS ORDER BY Application_ID DESC LIMIT 5;
SELECT Contract_ID, Gig_ID, Selected_Artisan_ID, Payment_Status
  FROM COMPLETION_CONTRACTS ORDER BY Contract_ID DESC LIMIT 5;
SELECT Contract_ID, Event_Type, Actor_User_ID, Created_At
  FROM CONTRACT_EVENTS ORDER BY Event_ID DESC LIMIT 8;
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

The frontend also has a [public interactive preview](https://anuj-deshpande.github.io/skillcraft-bcse302p-demo/) hosted on GitHub Pages. Use the sign-in page's role buttons to try both sides, or open the [clean-start link](https://anuj-deshpande.github.io/skillcraft-bcse302p-demo/?reset=1#/) before recording. This build uses `VITE_DEMO_MODE=true` and stores sample actions in the visitor's browser. It does **not** use the backend database and should not be used as evidence of the DBMS implementation; use the connected local prototype above for that part.

The repository also has a Docker Compose setup for PostgreSQL on port 5432, the API on 5000, and the frontend on 5173. Its fresh-volume initialization includes the v2 migrations. Existing PostgreSQL databases need the non-destructive [proposal-note](database/06_proposal_note.sql), [unique-contract](database/08_unique_contracts.sql), and [DBTHON workflow](database/09_dbthon_workflow.sql) migrations in that order. Review duplicate contracts manually if the unique constraint cannot be added. Do not run the destructive `01_schema.sql` against existing data.

## Verify the prototype

```bash
cd backend
npm test
```

This runs the self-contained schema, audit, row-security, search, and API workflow checks. `npm run test:jest-local` runs 20 CRUD and 4 concurrency/integrity Jest cases against fresh PGlite databases; this checks behavior but does not reproduce PostgreSQL server concurrency. With a separately configured PostgreSQL test database, `npm run test:postgres` runs the same Jest suite. In `frontend`, run `npm run build` and `npm run test:e2e`; Playwright needs Chromium installed or `PLAYWRIGHT_BROWSER_PATH` set to a local Chromium/Edge executable.

## Current evaluation limits

- Indexed matching and the 0–3 fit ranking are deterministic, but query latency at scale and ranking quality have not been measured against a baseline.
- Both payment acknowledgments and employer reviews are self-reported; there is no bank integration or fairness/abuse-resistance study.
- Row-level policies have PGlite and API tests here; native PostgreSQL concurrency and security behavior should be checked before a deployment claim.
- Prior reports in [`docs/`](docs/) include estimates and assertions from the original course proposal. Treat them as background or hypotheses until their sources and measurements are verified for DBTHON.

## Team and project files

| Contributor | Registration number | Listed contribution in the original project |
| --- | --- | --- |
| Vedika Agarwal | 24BCE2601 | Schema, triggers, trust-score and bidding logic |
| Bhavyaveer Kumar | 24BCE2252 | Application and database integration |
| Anuj Deshpande | 24BCE0794 | Evidence, testing, validation, and reporting |

Faculty guide: Siva Sankari · Academic year: 2026–2027. Original course deliverables remain in [`docs/`](docs/), with the [requirements](docs/Requirements_Spec.md), [testing report](docs/Testing_Validation_Report.md), and [impact/TRL report](docs/Impact_and_TRL_Report.md) available for review. License: MIT.
