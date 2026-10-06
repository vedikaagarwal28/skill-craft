# SkillCraft Micro-Jobs

## Marketplace v2 proposal

This branch turns the original course prototype into a usable local-work marketplace while keeping its six-table PostgreSQL model and transaction-safe bid acceptance. The frontend now has a public landing page, searchable jobs and artisan profiles, role-specific workspaces, job posting, bidding, bid decisions, contracts, payment tracking, and verified reviews. Contact numbers are shared through a contract after a bid is accepted; public artisan profiles do not expose them.

The new interface is intentionally quiet and practical: clear briefs, visible prices, straightforward next steps, and a work record grounded in settled contracts. [See the home preview](docs/marketplace-v2-home.png), [artisan directory](docs/marketplace-v2-artisans.png), and [artisan workspace](docs/marketplace-v2-dashboard.png).

### Try the full app without Docker

Open two terminals from the repository root:

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

Open `http://127.0.0.1:5174`. The preview backend starts a local PostgreSQL-compatible database on port 5433, loads the project schema and seed data, and serves the API on port 5000. Its data stays in the ignored `backend/.test-db/marketplace-v2` directory. The normal Docker Compose setup below still uses PostgreSQL.

Sample accounts use password `password123`: artisan `lakshmi@skillcraft.local`, employer `ramesh@constructionco.in`. New accounts can also be created through the app. A separate browser-only demo is available with `VITE_DEMO_MODE=true` for visual review.

For an existing PostgreSQL database, apply `database/06_proposal_note.sql`, `database/08_unique_contracts.sql`, and `database/02_03_views_triggers_procedures.sql` before running the new frontend. The contract migration preserves existing rows; if an older seed has duplicate contracts for a gig, review those duplicates before adding the unique constraint manually. Recompute existing scores with `SELECT recalculate_trust_score(Artisan_ID) FROM ARTISANS;`.

Run `npm test` in `backend` for self-contained schema and API workflow checks. Run `npm run test:e2e` in `frontend` for the artisan-to-employer browser journey; install a Playwright Chromium browser or set `PLAYWRIGHT_BROWSER_PATH` to an existing Chromium/Edge binary. The earlier PostgreSQL/Jest suite remains available as `npm run test:postgres`.

A hyper-local, database-driven platform connecting rural micro-artisans — handloom weavers, technicians, daily-wage workers — directly to urban gig employers, removing middlemen who currently take 30–50% commission on their work.

Built for **BCSE302P – Database Systems Lab, Societal Digital Innovation Project** (Tracks T9 – Education & Human Skills, T12 – Livelihood & Social Entrepreneurship).

## Problem & Innovation

Rural micro-artisans and blue-collar workers have no formal job platform of their own. LinkedIn and Naukri serve white-collar roles; gig platforms like Urban Company require corporate affiliation and offer no regional-language support, skill-swap networks, or payment protection for micro-payments. Informal WhatsApp/word-of-mouth matching leaves no accountability.

SkillCraft Micro-Jobs is a database-driven platform managing localized skill profiles, dynamic bidding between artisans and employers, transparent payment-verification logs, and a **trust score computed directly from verified transaction history** — not self-reported reviews — giving artisans direct price-negotiation power and a verifiable work history.

## Tech Stack

- **Database:** PostgreSQL 15+ (views, triggers, stored procedures, row-locking transactions)
- **Backend:** Node.js + Express, raw parameterized SQL via `pg` (no ORM — SQL stays visible)
- **Frontend:** React (Vite)
- **Auth:** JWT + bcrypt, three roles (`artisan`, `employer`, `admin`)
- **Testing:** Jest + Supertest
- **Optional:** Docker Compose for one-command local setup

## Architecture

```
React (Vite) frontend
        │  REST/JSON, JWT bearer auth
        ▼
Express.js API (parameterized SQL, RBAC middleware)
        │
        ▼
PostgreSQL (constraints, views, triggers, procedures, indexes)
```

## Database Design

Six tables, normalized to **3NF**:

| Table | Purpose |
|---|---|
| `USERS` | Shared identity for artisans and employers (login, role) |
| `ARTISANS` | Skill profile, location, rate, trust score |
| `GIG_POSTINGS` | Jobs posted by employers |
| `GIG_APPLICATIONS` | In-progress bids on a gig |
| `COMPLETION_CONTRACTS` | Finalized, settled work |
| `RATINGS_REVIEWS` | Post-completion feedback that drives trust score |

`GIG_APPLICATIONS` is kept separate from `COMPLETION_CONTRACTS` so negotiation data never mixes with finalized transaction data — see `database/ER_DIAGRAM.md` and `docs/Normalization_Justification.md` for the full reasoning.

**Views:** `Top_Rated_Artisans_View`, `Skill_Category_Earnings_View`, `Open_Gigs_View`
**Triggers:** auto-close a gig on bid acceptance; recalculate trust score after each new review
**Concurrency control:** bid acceptance runs inside a `SELECT ... FOR UPDATE` transaction so two employers can't simultaneously accept conflicting bids on the same gig

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker)

### Setup (Docker Compose) — **Recommended**
```bash
git clone https://github.com/vedikaagarwal28/skill-craft.git
cd skill-craft
docker compose up
```

Then:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **PostgreSQL:** localhost:5432

Docker Compose will:
1. Start PostgreSQL with schema, triggers, RBAC, and seed data auto-loaded
2. Start Express backend on port 5000
3. Start React/Vite frontend on port 5173

All services depend on Postgres health check; full startup takes ~15–20 seconds.

### Setup (Local Postgres)
If you prefer to run locally without Docker:

```bash
git clone https://github.com/vedikaagarwal28/skill-craft.git
cd skill-craft

# Copy and fill in environment variables
cp .env.example .env

# Create database and load schema
createdb skillcraft
psql skillcraft -f database/01_schema.sql
psql skillcraft -f database/02_03_views_triggers_procedures.sql
psql skillcraft -f database/04_roles_permissions.sql
psql skillcraft -f database/05_seed_data.sql

# Start backend
cd backend && npm install && npm run dev     # http://localhost:5000

# In another terminal, start frontend
cd frontend && npm install && npm run dev    # http://localhost:5173
```

**Note:** Set `DB_HOST=localhost` in `.env` for local Postgres.

## Running Tests

```bash
cd backend
npm install
npm test
```

**Test Suites:**
- `crud.test.js` (14+ tests): Happy-path workflows — register, login, post gig, bid, accept, pay, review, dashboard queries
- `bidAcceptance.test.js` (6 tests): **Concurrency validation** — fires two simultaneous "accept bid" requests on the same gig and proves exactly one succeeds (409 Conflict on loser), preventing double-booking via row locking (`SELECT ... FOR UPDATE`)

Both suites validate course requirements:
- ✅ Database constraints (FK, UNIQUE, NOT NULL, CHECK)
- ✅ Third Normal Form (3NF) design
- ✅ Views (Top_Rated_Artisans, Skill_Category_Earnings, Open_Gigs)
- ✅ Triggers (auto-close gig on bid acceptance, auto-recalc trust score after review)
- ✅ Stored procedures (recalculate_trust_score)
- ✅ Parameterized queries (no SQL injection)
- ✅ RBAC (role-based access control at application and database levels)
- ✅ Transaction safety with row-level locking (SELECT ... FOR UPDATE)

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Register as artisan or employer |
| POST | `/api/auth/login` | – | Login, returns JWT |
| GET | `/api/artisans/:id` | any | Artisan profile + trust score |
| PATCH | `/api/artisans/:id` | artisan (own) | Update profile |
| POST | `/api/gigs` | employer | Post a gig |
| GET | `/api/gigs` | any | List/filter open gigs |
| GET | `/api/gigs/:id` | any | Gig detail |
| PATCH | `/api/gigs/:id/cancel` | employer (own) | Cancel a gig |
| POST | `/api/gigs/:id/applications` | artisan | Submit a bid |
| GET | `/api/applications/mine` | artisan | My bids |
| PATCH | `/api/applications/:id/accept` | employer (own) | Accept a bid (transaction-safe) |
| PATCH | `/api/applications/:id/reject` | employer (own) | Reject a bid |
| GET | `/api/contracts/mine` | artisan/employer | My contract history |
| PATCH | `/api/contracts/:id/pay` | employer | Mark payment settled |
| POST | `/api/contracts/:id/review` | employer | Leave a rating |
| GET | `/api/dashboard/top-artisans` | any | Top rated artisans view |
| GET | `/api/dashboard/skill-earnings` | any | Earnings by skill category |
| GET | `/api/dashboard/open-gigs` | any | Currently open gigs |

## Project Structure

```
skillcraft-microjobs/
├── database/                     # Schema, views, triggers, seed data
│   ├── 01_schema.sql             # 6 tables (3NF), constraints, indexes
│   ├── 02_03_views_triggers_procedures.sql  # 3 views, 2 triggers, 1 stored procedure
│   ├── 04_roles_permissions.sql  # Database-level RBAC
│   ├── 05_seed_data.sql          # Realistic synthetic data (artisans, gigs, applications, contracts, reviews)
│   └── ER_DIAGRAM.md             # Mermaid ER diagram with normalization justification
│
├── backend/                      # Express.js REST API
│   ├── src/
│   │   ├── db.js                 # PostgreSQL connection pool with transaction support
│   │   ├── index.js              # Express app, middleware, route registration
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication
│   │   │   └── requireRole.js    # RBAC middleware
│   │   ├── controllers/          # Business logic (auth, artisans, gigs, applications, contracts, reviews, dashboard)
│   │   └── routes/               # REST endpoints
│   ├── tests/
│   │   ├── crud.test.js          # Happy-path CRUD tests
│   │   └── bidAcceptance.test.js # Concurrency test (row locking proof)
│   ├── jest.config.js            # Test configuration
│   ├── package.json              # Dependencies (express, pg, bcryptjs, jsonwebtoken, etc.)
│   └── Dockerfile                # Node.js 18 Alpine container
│
├── frontend/                     # React/Vite UI
│   ├── src/
│   │   ├── App.jsx               # Routes (login, register, dashboards, gigs, contracts)
│   │   ├── pages/                # Login, Register, ArtisanDashboard, EmployerDashboard, AdminDashboard, GigBoard, GigDetail, ContractHistory
│   │   ├── components/           # Navbar (reusable UI components)
│   │   ├── api/client.js         # Axios instance with JWT interceptor
│   │   └── *.css                 # Styling (Auth, Dashboard, Pages, Navbar)
│   ├── vite.config.js            # Vite configuration
│   ├── package.json              # React, React Router, Axios
│   ├── index.html                # HTML entry point
│   └── Dockerfile                # Node.js 18 Alpine container
│
├── docs/                         # Course deliverable documentation
│   ├── Problem_Discovery_Report.md          # Problem statement, innovation, evidence, gaps
│   ├── Requirements_Spec.md                 # Functional & non-functional requirements
│   ├── Normalization_Justification.md       # 3NF analysis for each table
│   ├── Testing_Validation_Report.md         # Test-to-requirement mapping
│   └── Impact_and_TRL_Report.md             # Societal impact (₹6B potential), TRL 4–5 justification
│
├── .env.example                  # Environment template (DB credentials, JWT secret)
├── .gitignore                    # Node.js ignores (node_modules, .env, logs)
├── docker-compose.yml            # One-command setup (Postgres, backend, frontend)
└── README.md                     # This file
```

## Team

| Name | Registration No. | Contribution |
|---|---|---|
| Vedika Agarwal | 24BCE2601 | Database schema design, triggers, trust-score/bidding logic |
| Bhavyaveer Kumar | 24BCE2252 | Application development and database integration |
| Anuj Deshpande | 24BCE0794 | Evidence gathering, testing, validation, and reporting |

Faculty Guide: Siva Sankari | Academic Year: 2026–2027

## Course Deliverable Mapping

| Course Deliverable | Location in this repo |
|---|---|
| Problem Discovery Report | `docs/Problem_Discovery_Report.md` |
| Innovation Proposal | `docs/Problem_Discovery_Report.md` (§3) |
| Software Requirements | `docs/Requirements_Spec.md` |
| Database Design | `database/01_schema.sql`, `database/ER_DIAGRAM.md`, `docs/Normalization_Justification.md` |
| Application Prototype | `backend/`, `frontend/` |
| Testing & Validation | `backend/tests/`, `docs/Testing_Validation_Report.md` |
| Impact & TRL Report | `docs/Impact_and_TRL_Report.md` |
| Expo Presentation | build separately from this repo (poster/pitch deck) |

## Roadmap

- Regional-language user interface
- Real UPI/payment gateway integration for live transactions
- Expand to additional skill categories and regions

## License

MIT
