# Software Requirements Specification
## SkillCraft Micro-Jobs Platform

This is the original functional specification, updated for the current prototype on 7 October 2026. Requirements marked **planned** below are not implemented. The [README](../README.md) describes evidence and remaining DBTHON work.

---

## 1. Functional Requirements

### 1.1 Authentication & Authorization

| Req | Description | Priority |
|---|---|---|
| FR-AUTH-1 | Public users can register as artisan or employer; admin self-registration is rejected | HIGH |
| FR-AUTH-2 | System hashes passwords using bcrypt (never store plaintext) | HIGH |
| FR-AUTH-3 | Users can login with email or phone + password | HIGH |
| FR-AUTH-4 | System issues JWT token valid for 7 days | HIGH |
| FR-AUTH-5 | Artisans must provide skill category, location, hourly rate at registration | HIGH |
| FR-AUTH-6 | JWT token verified on all protected endpoints | HIGH |

### 1.2 Artisan Management

| Req | Description | Priority |
|---|---|---|
| FR-ART-1 | Artisan can view own profile (skill, location, rate, trust score) | HIGH |
| FR-ART-2 | Artisan can update own profile (skill, location, rate) | HIGH |
| FR-ART-3 | Artisan trust score recalculated from reviews on contracts marked paid, with a three-review 3.5-star prior | HIGH |
| FR-ART-4 | Any user can view any artisan's public profile (name, skill, location, rate, trust score, reviews) | MEDIUM |
| FR-ART-5 | Planned: hide or explain a score when an artisan has no contract-linked reviews | MEDIUM |
| FR-ART-6 | Employers can search artisan profiles by skill or location | LOW |

### 1.3 Gig Management

| Req | Description | Priority |
|---|---|---|
| FR-GIG-1 | Employer can post a gig (skill required, description, address, budget) | HIGH |
| FR-GIG-2 | Gig created with status='open' by default | HIGH |
| FR-GIG-3 | Any user can search/filter open gigs by skill and location | HIGH |
| FR-GIG-4 | Employer can view all applications on own gigs with artisan profiles | HIGH |
| FR-GIG-5 | Employer can cancel a gig (sets status='cancelled') | MEDIUM |
| FR-GIG-6 | Cancelled gig prevents new bids and auto-rejects pending bids | MEDIUM |
| FR-GIG-7 | Gig shows count of pending applications in list view | MEDIUM |

### 1.4 Bidding & Bid Acceptance

| Req | Description | Priority |
|---|---|---|
| FR-BID-1 | Artisan can submit a positive bid on an open gig; the bid may differ from the posted budget | HIGH |
| FR-BID-2 | Artisan can bid only once per gig (enforced by UNIQUE constraint) | HIGH |
| FR-BID-3 | Artisan can view all own bids with gig details | HIGH |
| FR-BID-4 | Bid has status: 'pending', 'accepted', or 'rejected' | HIGH |
| **FR-BID-5** | **Bid acceptance is transaction-safe: uses SELECT...FOR UPDATE row locking to prevent double-booking** | **CRITICAL** |
| FR-BID-6 | When employer accepts a bid: (1) bid status→'accepted', (2) gig status→'closed', (3) contract created | HIGH |
| FR-BID-7 | When bid accepted, all other pending bids on same gig auto-rejected (via trigger) | HIGH |
| FR-BID-8 | Employer can reject a bid (status→'rejected'); gig remains open for other bids | MEDIUM |

### 1.5 Contracts & Payment

| Req | Description | Priority |
|---|---|---|
| FR-CON-1 | Contract auto-created when bid accepted (records final negotiated amount, payment status) | HIGH |
| FR-CON-2 | Artisan and employer can view contract history | HIGH |
| FR-CON-3 | Payment status tracked: 'pending', 'paid', or 'disputed' | HIGH |
| FR-CON-4 | Employer can mark payment as 'paid' or 'disputed' | HIGH |
| FR-CON-5 | Planned: employer can set a separate work-completion timestamp | MEDIUM |

### 1.6 Reviews & Trust Score

| Req | Description | Priority |
|---|---|---|
| FR-REV-1 | Employer can leave a 1–5 star review after recording the contract as paid | HIGH |
| FR-REV-2 | Employer can add optional feedback text with review | MEDIUM |
| FR-REV-3 | Each contract can have at most one review (enforced by UNIQUE constraint) | HIGH |
| **FR-REV-4** | **Trust score auto-recalculated after each review via trigger using paid-status reviews and a three-review prior** | **CRITICAL** |
| FR-REV-5 | Artisan can view public reviews linked to their contracts | MEDIUM |
| FR-REV-6 | Reviews visible to all users to help employer hiring decisions | MEDIUM |

### 1.7 Dashboard & Reporting

| Req | Description | Priority |
|---|---|---|
| FR-DASH-1 | Top Rated Artisans view: all artisans ranked by trust score desc | MEDIUM |
| FR-DASH-2 | Skill Category Earnings view: avg bid, avg final amount, difference by skill | MEDIUM |
| FR-DASH-3 | Open Gigs view: current open gigs with bid count | MEDIUM |
| FR-DASH-4 | Planned: dedicated admin dashboard | MEDIUM |

### 1.8 RBAC (Role-Based Access Control)

| Req | Description | Priority |
|---|---|---|
| FR-RBAC-1 | Artisan can submit bids and view own bids/contracts; public artisan profiles and reviews are readable by all | HIGH |
| FR-RBAC-2 | Employer can only: post gigs, view own gigs, accept/reject bids on own gigs, view own contracts, leave reviews | HIGH |
| FR-RBAC-3 | Planned: admin deactivation and dispute-resolution tools; seeded admin role is for demonstration only | MEDIUM |
| FR-RBAC-4 | Attempting to access unauthorized resource returns 403 Forbidden | HIGH |

---

## 2. Non-Functional Requirements

### 2.1 Data Integrity & Constraints

| Req | Description | Priority |
|---|---|---|
| NFR-DI-1 | All monetary amounts must be > 0 (checked via CHECK constraints) | HIGH |
| NFR-DI-2 | Phone number is unique per user (no duplicate registrations) | HIGH |
| NFR-DI-3 | Email is unique if provided | MEDIUM |
| NFR-DI-4 | Trust score constrained to [0.00, 5.00] range | HIGH |
| NFR-DI-5 | Status fields restricted to valid enums (open/closed/cancelled, pending/paid/disputed, etc.) | HIGH |
| NFR-DI-6 | Foreign keys with ON DELETE CASCADE maintain referential integrity | HIGH |

### 2.2 Security

| Req | Description | Priority |
|---|---|---|
| NFR-SEC-1 | All passwords hashed with bcrypt (min 10 rounds) | CRITICAL |
| NFR-SEC-2 | All database queries use parameterized queries ($1, $2, ...) to prevent SQL injection | CRITICAL |
| NFR-SEC-3 | Planned for deployment: require a non-default JWT secret; local preview has a fixed development fallback | CRITICAL |
| NFR-SEC-4 | CORS enabled only for whitelisted frontend domains | HIGH |
| NFR-SEC-5 | Error messages do not leak SQL syntax or system internals | HIGH |
| NFR-SEC-6 | Planned for deployment: enforce HTTPS; local demo uses HTTP | MEDIUM |

### 2.3 Performance & Scalability

| Req | Description | Priority |
|---|---|---|
| NFR-PERF-1 | Indexes on commonly queried columns: Skill_Category, Base_Location, Status, Gig_ID, User_ID | HIGH |
| NFR-PERF-2 | Composite index on (Skill_Category, Base_Location) for fast skill+location matching | HIGH |
| NFR-PERF-3 | Database connection pooling (`pg` Pool, default maximum 10 connections) | HIGH |
| NFR-PERF-4 | Planned: benchmark the views before deciding whether caching is needed | MEDIUM |
| NFR-PERF-5 | Planned target: API response time < 1s for 95% of queries under defined load | MEDIUM |

### 2.4 Availability & Reliability

| Req | Description | Priority |
|---|---|---|
| NFR-AVAIL-1 | Bid acceptance uses SERIALIZABLE isolation and a gig-row lock; cancellation locks the same row | CRITICAL |
| NFR-AVAIL-2 | Graceful shutdown on SIGTERM/SIGINT (close connections, release pool) | HIGH |
| NFR-AVAIL-3 | `/health` returns 200 while the API process is running; it does not check database health | MEDIUM |
| NFR-AVAIL-4 | Planned: database backups before schema changes | MEDIUM |

### 2.5 Usability

| Req | Description | Priority |
|---|---|---|
| NFR-USE-1 | All error responses include descriptive message and HTTP status code | HIGH |
| NFR-USE-2 | API documentation via OpenAPI/Swagger (optional, lower priority) | LOW |
| NFR-USE-3 | Frontend login/register flow intuitive and responsive | MEDIUM |

### 2.6 Maintainability

| Req | Description | Priority |
|---|---|---|
| NFR-MAINT-1 | Code structured with clear separation: routes, controllers, middleware, db | HIGH |
| NFR-MAINT-2 | Database comments document each table and column purpose | HIGH |
| NFR-MAINT-3 | Stored procedures/triggers commented with expected behavior | HIGH |
| NFR-MAINT-4 | Environment configuration via .env, not hardcoded | HIGH |
| NFR-MAINT-5 | Git history with logical, descriptive commits | MEDIUM |

### 2.7 Testing & Validation

| Req | Description | Priority |
|---|---|---|
| NFR-TEST-1 | CRUD operations tested (register, login, post gig, bid, accept, review) | HIGH |
| NFR-TEST-2 | Concurrent accepts tested for a single-winner result; isolation, lock, trigger, and constraint act together | **CRITICAL** |
| NFR-TEST-3 | Planned: define and measure workflow coverage against the requirements | MEDIUM |
| NFR-TEST-4 | Tests use separate test database to avoid production data pollution | HIGH |

---

## 3. Constraints & Assumptions

### Constraints

1. **Database**: PostgreSQL 15+ (not MySQL or SQLite)
2. **Language**: JavaScript/Node.js for backend, React for frontend
3. **No heavy ORM**: Raw parameterized SQL, not Prisma/Sequelize/TypeORM
4. **Payment**: No real payment gateway; employers record a status in the prototype
5. **Authentication**: JWT-based, no OAuth/SSO (scope: demo)
6. **Regional Languages**: Placeholder support (field stored, UI English-only in this version)

### Assumptions

1. Users have basic smartphone/computer and internet connectivity
2. Artisans are comfortable using a mobile app (future version; current: web only)
3. Trust-score usefulness and fairness need user study and adversarial testing before a launch claim
4. Platform operates in single region/timezone initially
5. Employers are willing to use web interface to post gigs and accept bids

---

## 4. Acceptance Criteria

### Must-Have (MVP)

- [x] Database schema in 3NF with all constraints
- [x] Auth: register, login, JWT token
- [x] Artisans: profile management
- [x] Gigs: post, search, filter
- [x] Bids: submit, list, accept (transaction-safe), reject
- [x] Contracts: view history, mark payment
- [x] Reviews: post, view; auto-calculate trust score
- [x] RBAC: artisan/employer API roles and ownership checks; public admin signup blocked
- [x] Dashboard: top artisans, skill earnings, open gigs views
- [x] Tests: current schema/API flow and browser checks; separate PostgreSQL concurrency suite retained
- [x] Docs: problem report, requirements, normalization, testing, impact

### Nice-to-Have (v2)

- Mobile-first UI (current: desktop React)
- Real UPI/NEFT payment gateway
- SMS/WhatsApp notifications
- Regional language UI
- Dispute resolution workflows
- Admin dashboard UI for dispute handling
- Email verification on signup
- Password reset flow

---

**Specification Date**: 31 August 2026  
**Version**: 1.0  
**Course**: BCSE302P – Database Systems Lab
