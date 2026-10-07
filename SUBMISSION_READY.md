# SkillCraft demo and submission status

Updated 7 October 2026. This is a **working local prototype and review branch**, not a claim that every DBTHON evaluation item is complete. See the [rubric map and limitations](README.md#dbthon-2026-rubric-what-to-show).

## Run the connected demo

From the repository root, run `npm run dev:preview` inside `backend` and `npm run dev -- --host 127.0.0.1 --port 5174` inside `frontend`. Open `http://127.0.0.1:5174`.

| Role | Email | Password |
| --- | --- | --- |
| Artisan | `lakshmi@skillcraft.local` | `password123` |
| Employer | `ramesh@constructionco.in` | `password123` |

These are synthetic sample accounts. The backend accepts either email or phone as the sign-in identity. The browser-only `VITE_DEMO_MODE=true` path is for visual review and does not prove database behavior.

## Demonstration sequence

1. Ramesh posts a job and Lakshmi finds it and bids.
2. Ramesh accepts one bid. Show the accepted application, closed gig, and one contract in SQL.
3. Show that another pending bid is rejected, or cancel a separate open job and show its pending bids become rejected.
4. Ramesh records payment sent; Lakshmi confirms receipt. Inspect the append-only `CONTRACT_EVENTS` history, then have Ramesh review the paid contract.
5. Show the trigger-updated trust score. Explain the transaction, `SELECT ... FOR UPDATE`, unique constraints, indexed matching, and row-level ownership rules.

## Checks and open evidence

Run `npm test` and `npm run test:jest-local` from `backend`, then `npm run build` and `npm run test:e2e` from `frontend`. The [testing report](docs/Testing_Validation_Report.md) lists exact scope; the native PostgreSQL/Jest variant remains available separately.

The [current panel deck](docs/SkillCraft_DBTHON_2026_Panel.pptx) presents the implemented innovation and the rubric. Before claiming measured improvement, compare indexed search and ranking with a defined baseline on a repeatable dataset. The app has no escrow, real payment integration, independent bank proof, field pilot, or measured earnings uplift.
