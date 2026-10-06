# Impact & Technology Readiness Level (TRL) Report
## SkillCraft Micro-Jobs Platform

---

## Executive Summary

SkillCraft Micro-Jobs achieves **TRL 4–5** (Technology Validated in Lab/Relevant Environment). The platform demonstrates:

1. **Database-driven functionality**: Schema, views, triggers, procedures all operational
2. **Transaction-safe concurrency**: Row locking proven to prevent double-booking
3. **End-to-end workflow**: Artisan registration → gig posting → bidding → contract → payment → review
4. **Societal impact**: Eliminates middlemen, enabling artisans to retain 75–90% of earnings (vs. current 50–70%)

**Not TRL 6+** because no live payment integration, mobile-first UI, or multi-region deployment.

---

## Part 1: Societal Impact Analysis

### Problem Revisited: Rural Artisans' Earnings Leakage

**Current State (Without SkillCraft)**
- Handloom weaver in Bhagalpur earns ₹5,000/week gross
- Middleman takes 30–50% commission
- Artisan nets ₹2,500–3,500/week (50–70% retention)
- Annual loss to middleman: ₹39,000–65,000

**With SkillCraft Platform**
- Same handloom weaver lists on platform
- Employer posts gig for ₹5,000
- Weaver bids ₹4,800 (undercuts no middleman, slightly lower than gig budget)
- Employer accepts
- SkillCraft takes 5% platform fee: ₹240
- **Artisan nets ₹4,560 (91% retention)**
- Annual gain: ~₹27,000/year retained (vs. middleman model)

### Impact Metrics (Projected at Scale)

#### Earnings Uplift

| Scenario | Artisans | Avg Hourly Rate | Hrs/Week | Weeks/Year | Current Annual | With SkillCraft | Uplift |
|---|---|---|---|---|---|---|---|
| Base Case | 1 | ₹200 | 40 | 48 | ₹307,200 | ₹365,760 | +₹58,560 (19%) |
| Mid Case | 1 | ₹250 | 40 | 48 | ₹384,000 | ₹456,000 | +₹72,000 (19%) |
| High Case | 1 | ₹300 | 40 | 48 | ₹460,800 | ₹546,000 | +₹85,200 (19%) |

**Assumption**: Platform fee 5%, artisans currently lose 30% to middlemen.

#### Scale Impact (1% Adoption)

- **Target artisans**: 10 million rural micro-artisans in India
- **1% adoption**: 100,000 artisans using SkillCraft
- **Average artisan uplift**: ₹60,000/year
- **Total economic uplift**: **₹6 billion/year**

#### Impact Distribution

| Stakeholder | Benefit |
|---|---|
| **Artisans (100k)** | ₹6 billion/year in retained earnings; improved social mobility |
| **Employers (users)** | Access to vetted talent; 10–20% cost savings vs. middleman market |
| **Government** | Formalization of shadow economy; tax collection potential ₹500M+/year |
| **Cooperatives & NGOs** | Data on artisan skills for targeted training; batch job matching |

### Employment & Dignity Impact

**Beyond Economics:**

1. **Formalization of Work**: Artisans get permanent, verifiable work history (not just word-of-mouth)
   - Leverageable for microfinance credit
   - Counts toward skill certification for government programs

2. **Gender Inclusion**: 66% of informal workers are women
   - Handloom weaving predominantly female (80%+ in some regions)
   - Platform removes social/geographic barriers to finding work

3. **Regional Autonomy**: Artisans choose when/where to work; retain autonomy vs. being middleman employees
   - Support rural-to-urban economic ties without migration
   - Preserve local artisan communities

---

## Part 2: TRL Assessment

### TRL Scale (1–9)

| Level | Definition | Status |
|---|---|---|
| 1 | Basic principles observed | ✓ (Completed in course brief) |
| 2 | Technology concept formulated | ✓ (Problem discovery, requirements) |
| 3 | Proof of concept | ✓ (Database schema + seed data validated) |
| 4 | Technology validated in lab | **✓ ACHIEVED** |
| 5 | Technology validated in relevant environment | **✓ ACHIEVED** |
| 6 | Pilot deployment (small-scale, real users) | ✗ (Not attempted) |
| 7 | Operational deployment (production-ready) | ✗ (Not attempted) |
| 8 | Refinement and improvement (operational) | ✗ (Not attempted) |
| 9 | Proven operational and mature | ✗ (Not attempted) |

### SkillCraft: TRL 4–5 Justification

#### TRL 4: Technology Validated in Lab

**Criteria**: Working technology in controlled environment; proof of concept demonstrated.

**Evidence**:
- ✓ PostgreSQL schema (01_schema.sql) created and validated locally
- ✓ Seed data (05_seed_data.sql) with 15 artisans, 10 employers, 20 gigs, 30 bids, 8 unique contracts inserted successfully
- ✓ Views (Top_Rated_Artisans_View, Skill_Category_Earnings_View, Open_Gigs_View) queried and return correct results
- ✓ Triggers tested: gig auto-close on bid acceptance, bid auto-rejection, contract auto-creation all work
- ✓ Stored procedure (recalculate_trust_score) tested: trust score recalculates after review insertion
- ✓ Backend API (Express.js) all endpoints functional with parameterized queries
- ✓ CRUD workflows pass all tests (registration, login, post gig, bid, accept, review)

**Conclusion**: All database and backend subsystems validated to work correctly in lab (local machine with PostgreSQL).

#### TRL 5: Technology Validated in Relevant Environment

**Criteria**: Technology tested with realistic scenarios in environment similar to intended use.

**Evidence**:
- ✓ **Concurrency Test**: Two simultaneous bid acceptances on same gig; row locking prevents double-booking
  - Simulates realistic scenario: two employers trying to accept conflicting bids at same instant
  - Proves transaction safety (SERIALIZABLE isolation + SELECT...FOR UPDATE)
  - This is the most critical, complex requirement and it works
  
- ✓ **Realistic synthetic data**: 
  - 15 artisans with plausible skill categories (handloom weaving, plumbing, electrical work, etc.)
  - 10 employers in varied industries
  - 20 gigs with realistic descriptions and budgets
  - Bid amounts vary (some below budget, some at budget) — realistic human behavior
  
- ✓ **End-to-end workflow**:
  - Register as artisan + employer (separate roles)
  - Employer posts gig → Artisan finds & bids → Employer accepts → Contract created → Payment marked → Review posted → Trust score updates
  - All steps validated; no workflow breaks
  
- ✓ **RBAC Enforcement**:
  - Artisan cannot post gigs (403 error when role≠employer)
  - Employer cannot bid (403 when role≠artisan)
  - Access control works as intended
  
- ✓ **Database Integrity**:
  - Constraints enforced: can't insert budget ≤ 0, bid amount ≤ 0, trust score > 5, rating outside 1–5
  - Foreign keys prevent orphaned records
  - UNIQUE constraints prevent duplicates (phone, email, gig_id+artisan_id)

**Conclusion**: Technology demonstrated to work correctly in realistic use-case environment. Lab validation extended to realistic workflow testing.

### Why Not TRL 6+?

**TRL 6** requires pilot deployment with real users and real money. SkillCraft does not have:
- Real UPI/NEFT payment gateway (mocked in tests)
- Mobile-first UI (current: desktop React, not optimized for mobile)
- SMS/WhatsApp notifications (English-only web UI)
- Regional language support (fields exist, but UI is English)
- Production-grade DevOps (no CI/CD, no container orchestration, no monitoring)
- Real user feedback loop

**Timeline to TRL 6**: ~3–6 months of additional development (payment integration, mobile app, regional languages, production hardening).

---

## Part 3: Roadmap to Higher TRL

### Phase 1: TRL 5 → 6 (Pilot Deployment) [3–4 months]

**Goal**: 500–1000 real artisans and employers in 2–3 Indian cities (e.g., Bhagalpur, Salem, Surat).

**Deliverables**:
- [ ] Real UPI payment gateway (NPCI sandbox → production)
- [ ] Mobile app (React Native or Flutter) for artisans; responsive web for employers
- [ ] SMS notifications via Twilio for bid updates, payments
- [ ] Regional language UI: Hindi, Tamil, Gujarati, Marathi
- [ ] Admin dashboard for dispute resolution
- [ ] Detailed compliance: GST registration, data privacy (DPDP Act), payment regulations (RBI)

**Validation**:
- 500 artisans active; 100+ gigs posted/month
- Average bid acceptance rate ≥ 60% (gig success metric)
- Trust score used in hiring decision (employer feedback)
- Payment success rate ≥ 95% (no fraud/disputes)

### Phase 2: TRL 6 → 7 (Operational Deployment) [6–12 months]

**Goal**: 5,000–10,000 artisans and employers; profitable operations.

**Deliverables**:
- [ ] Expand to 10 cities across India
- [ ] AI-powered skill matching (recommendation engine)
- [ ] Insurance product: work accidents, payment disputes
- [ ] Artisan education: skill certification courses
- [ ] Cooperative integrations: bulk gig bidding
- [ ] Real-time payment via escrow service (e.g., Razorpay escrow)

**Validation**:
- Platform sustainable on 5% commission
- Zero fraud incidents; 99.9% payment success rate
- NPS (Net Promoter Score) ≥ 50 (customer satisfaction)
- Regulatory compliance in 10+ states

### Phase 3: TRL 7 → 8 (Refinement) [12+ months]

**Goal**: Market leader in rural artisan-to-employer gig platform; profitability and scale.

---

## Part 4: Roadmap & Sustainability

### Technology Roadmap

#### Version 1.1 (Q4 2026: Real Payment Integration)
- Integrate Razorpay/NPCI for real UPI payments
- Implement escrow: payment held by platform until both parties confirm
- Dispute resolution UI: admin reviews and releases escrow

#### Version 2.0 (Q2 2027: Mobile & Localization)
- React Native mobile app for Android/iOS
- Regional language UI (Hindi, Tamil, Gujarati, Marathi)
- SMS/WhatsApp notifications
- Offline-first support (common in rural India)

#### Version 3.0 (Q4 2027: AI & Ecosystem)
- AI skill-matching recommendation engine
- Artisan certification & training partnerships
- Insurance product: work accident coverage, payment protection
- Cooperative dashboard: group bids, aggregated analytics

### Business Model

**Freemium with Transaction Fees**:
- Artisan listing: Free
- Gig posting: Free (employers)
- Successful transaction: 5% platform fee (split: 2.5% artisan, 2.5% employer incentive)
- Premium tier (artisans): ₹99/month for featured listings, advanced analytics

**Revenue at Scale (1% adoption)**:
- 100,000 artisans
- 10,000 transactions/month
- ₹5,000 avg transaction amount
- **Monthly transaction volume**: ₹500 crore
- **Platform revenue (5%)**: ₹2.5 crore/month = ₹30 crore/year
- **Operating cost** (eng, ops, customer support): ~₹5 crore/year
- **Gross margin**: 83%

### Sustainability Indicators

| Metric | Target (TRL 6) | Target (TRL 7) |
|---|---|---|
| Monthly Active Users (Artisans) | 1,000 | 10,000 |
| Gigs Posted/Month | 100 | 1,000 |
| Transaction Success Rate | 95% | 99.5% |
| Average Trust Score | 3.5 | 4.2 |
| Customer Acquisition Cost | ₹100 | ₹50 |
| Lifetime Value (Artisan) | ₹10,000 | ₹50,000 |
| CAC Payback Period | 12 months | 6 months |

---

## Part 5: Risk Assessment

### Technical Risks

| Risk | Mitigation |
|---|---|
| **Database scalability** (millions of rows) | Horizontal partitioning by region; read replicas for views |
| **Payment fraud** | Escrow model + verification (video proof of work) |
| **Rating manipulation** | Anomaly detection; prevent reviewing without payment confirmed |
| **DDoS attacks** | CDN (Cloudflare); rate limiting per user |

### Market Risks

| Risk | Mitigation |
|---|---|
| **Adoption (artisans don't register)** | On-ground ambassadors in pilot cities; co-marketing with cooperatives |
| **User retention** | Strong trust score system; reliable payment processing |
| **Competitor entry** | First-mover advantage + network effects (more artisans → more employers) |
| **Regulatory (labor laws)** | SkillCraft is platform (not employer); artisans are independent. Compliance with gig worker guidelines as they evolve |

---

## Conclusion

SkillCraft Micro-Jobs achieves **TRL 4–5** and demonstrates clear path to TRL 6–7 (operational platform). The core technology (PostgreSQL, transaction-safe bidding, trust scoring) is proven; what remains is production hardening, payment integration, and mobile UX.

The societal impact is substantial: **₹6 billion/year potential uplift** for rural artisans at 1% adoption, with long-term vision of formalizing India's 10M+ micro-artisan workforce.

---

**Report Date**: 31 August 2026  
**Version**: 1.0  
**Course**: BCSE302P – Database Systems Lab, Societal Digital Innovation Project

**Authors**: Vedika Agarwal, Bhavyaveer Kumar, Anuj Deshpande  
**Faculty Guide**: Siva Sankari  
**Academic Year**: 2026–2027
