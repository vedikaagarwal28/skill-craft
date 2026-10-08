-- ============================================================================
-- SkillCraft Micro-Jobs: Database Schema (3NF)
-- BCSE302P – Database Systems Lab, Societal Digital Innovation Project
-- ============================================================================
-- This schema implements six entities normalized to Third Normal Form (3NF).
-- The current prototype also applies 06_proposal_note.sql, 08_unique_contracts.sql,
-- and 09_dbthon_workflow.sql; migration 09 adds contract events, two-party
-- payment acknowledgement, indexed matching, and row-level security.
-- All foreign keys use explicit ON DELETE/UPDATE rules for data integrity.
-- Every table has meaningful UNIQUE, CHECK, NOT NULL, and default constraints.
-- Indexes are added for common query patterns (skill matching, gig status, etc.).
-- ============================================================================

-- Drop existing objects (safe for dev/testing; remove in production)
DROP TABLE IF EXISTS RATINGS_REVIEWS CASCADE;
DROP TABLE IF EXISTS COMPLETION_CONTRACTS CASCADE;
DROP TABLE IF EXISTS GIG_APPLICATIONS CASCADE;
DROP TABLE IF EXISTS GIG_POSTINGS CASCADE;
DROP TABLE IF EXISTS ARTISANS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

-- ============================================================================
-- Table: USERS
-- ============================================================================
-- Shared identity table for artisans and employers.
-- Role is stored as a CHECK constraint (artisan, employer, admin).
-- Password is stored as bcrypt hash, never plaintext.
-- Phone is UNIQUE to prevent duplicate registrations.
-- ============================================================================
CREATE TABLE USERS (
  User_ID SERIAL PRIMARY KEY,
  Full_Name VARCHAR(255) NOT NULL,
  Phone VARCHAR(20) NOT NULL UNIQUE,
  Email VARCHAR(255) UNIQUE,
  Password_Hash VARCHAR(255) NOT NULL,
  Role VARCHAR(20) NOT NULL 
    CHECK (Role IN ('artisan', 'employer', 'admin')),
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE USERS IS 'Unified identity table for all platform users (artisans, employers, admins). Single login point for all roles.';
COMMENT ON COLUMN USERS.Role IS 'Role determines which operations a user can perform (RBAC). artisan: can bid on gigs; employer: can post gigs; admin: full access.';
COMMENT ON COLUMN USERS.Password_Hash IS 'Bcrypt hash of the password. Never stored plaintext. Always hash before INSERT/UPDATE.';

-- ============================================================================
-- Table: ARTISANS
-- ============================================================================
-- Artisan profile extending USERS table (one-to-one relationship).
-- Each artisan has a skill category, base location (small town/village),
-- regional language, hourly rate, and a trust score computed from reviews.
-- Trust_Score is updated by triggers after each new review.
-- ============================================================================
CREATE TABLE ARTISANS (
  Artisan_ID SERIAL PRIMARY KEY,
  User_ID INTEGER NOT NULL UNIQUE,
  Skill_Category VARCHAR(100) NOT NULL,
  Base_Location VARCHAR(255) NOT NULL,
  Region_Language VARCHAR(50),
  Hourly_Rate NUMERIC(10, 2) NOT NULL CHECK (Hourly_Rate > 0),
  Trust_Score NUMERIC(3, 2) NOT NULL DEFAULT 0.00 CHECK (Trust_Score >= 0 AND Trust_Score <= 5),
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (User_ID) REFERENCES USERS(User_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE ARTISANS IS 'Skill profile for artisans. Extends USERS via User_ID (one-to-one). Trust_Score ranges 0.00–5.00 and is cached from reviews on contracts marked paid by employers.';
COMMENT ON COLUMN ARTISANS.Skill_Category IS 'Handloom weaving, plumbing, electrical, tailoring, carpentry, masonry, etc. Used for skill-matching in gig search.';
COMMENT ON COLUMN ARTISANS.Trust_Score IS 'Computed from paid-status contract reviews with a three-review prior. Updated via trigger after each review; no payment-timing metric is used.';

-- ============================================================================
-- Table: GIG_POSTINGS
-- ============================================================================
-- A job/gig posted by an employer.
-- Status tracks the lifecycle: open (accepting bids) -> closed (gig assigned) -> cancelled.
-- Budget is the employer's budgeted amount; artisans bid with Bid_Amount in GIG_APPLICATIONS.
-- ============================================================================
CREATE TABLE GIG_POSTINGS (
  Gig_ID SERIAL PRIMARY KEY,
  Employer_User_ID INTEGER NOT NULL,
  Skill_Required VARCHAR(100) NOT NULL,
  Description TEXT,
  Address VARCHAR(255) NOT NULL,
  Budget NUMERIC(10, 2) NOT NULL CHECK (Budget > 0),
  Status VARCHAR(20) NOT NULL 
    CHECK (Status IN ('open', 'closed', 'cancelled'))
    DEFAULT 'open',
  Posted_Date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Employer_User_ID) REFERENCES USERS(User_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE GIG_POSTINGS IS 'Jobs posted by employers. Lifecycle: open (accepting bids) -> closed (a bid accepted) or cancelled. Budget is the posted ceiling; actual amount paid may differ based on negotiated bid.';
COMMENT ON COLUMN GIG_POSTINGS.Status IS 'open: accepting bids; closed: a bid has been accepted (gig is assigned); cancelled: employer withdrew the gig.';

-- Index for fast "find open gigs" queries
CREATE INDEX idx_gig_postings_status ON GIG_POSTINGS(Status);

-- Index for fast "find gigs by skill" queries
CREATE INDEX idx_gig_postings_skill ON GIG_POSTINGS(Skill_Required);

-- ============================================================================
-- Table: GIG_APPLICATIONS
-- ============================================================================
-- In-progress bids on a gig. Artisans submit bids; employers accept or reject.
-- Kept separate from COMPLETION_CONTRACTS (normalization benefit):
--   - GIG_APPLICATIONS: negotiation state, temporary data
--   - COMPLETION_CONTRACTS: settled, finalized transaction data
-- This separation avoids transitive dependencies and keeps the schema in 3NF.
-- UNIQUE(Gig_ID, Artisan_ID) ensures each artisan bids once per gig.
-- ============================================================================
CREATE TABLE GIG_APPLICATIONS (
  Application_ID SERIAL PRIMARY KEY,
  Gig_ID INTEGER NOT NULL,
  Artisan_ID INTEGER NOT NULL,
  Bid_Amount NUMERIC(10, 2) NOT NULL CHECK (Bid_Amount > 0),
  Proposal_Note TEXT,
  Application_Status VARCHAR(20) NOT NULL 
    CHECK (Application_Status IN ('pending', 'accepted', 'rejected'))
    DEFAULT 'pending',
  Applied_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(Gig_ID, Artisan_ID),
  FOREIGN KEY (Gig_ID) REFERENCES GIG_POSTINGS(Gig_ID) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (Artisan_ID) REFERENCES ARTISANS(Artisan_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE GIG_APPLICATIONS IS 'Artisan bids on a gig. Lifecycle: pending (waiting) -> accepted (employer picked this bid) or rejected. Kept separate from COMPLETION_CONTRACTS for 3NF normalization.';
COMMENT ON COLUMN GIG_APPLICATIONS.Application_Status IS 'pending: bid submitted, awaiting employer decision; accepted: bid won, contract will be created; rejected: bid declined.';

-- Index for fast "find bids on a gig" queries
CREATE INDEX idx_gig_applications_gig ON GIG_APPLICATIONS(Gig_ID);

-- Index for fast "find artisan's bids" queries
CREATE INDEX idx_gig_applications_artisan ON GIG_APPLICATIONS(Artisan_ID);

-- ============================================================================
-- Table: COMPLETION_CONTRACTS
-- ============================================================================
-- A finalized, settled work contract. Created when a bid is accepted (status='accepted').
-- Tracks payment status (pending, paid, disputed) and completion timestamp.
-- This table contains only confirmed, closed transactions — never speculation or in-flight state.
-- ============================================================================
CREATE TABLE COMPLETION_CONTRACTS (
  Contract_ID SERIAL PRIMARY KEY,
  Gig_ID INTEGER NOT NULL UNIQUE,
  Selected_Artisan_ID INTEGER NOT NULL,
  Final_Amount NUMERIC(10, 2) NOT NULL CHECK (Final_Amount > 0),
  Payment_Status VARCHAR(20) NOT NULL 
    CHECK (Payment_Status IN ('pending', 'paid', 'disputed'))
    DEFAULT 'pending',
  Completion_Timestamp TIMESTAMP,
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Gig_ID) REFERENCES GIG_POSTINGS(Gig_ID) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (Selected_Artisan_ID) REFERENCES ARTISANS(Artisan_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE COMPLETION_CONTRACTS IS 'Contract for an accepted bid. Records the agreed amount, employer-entered payment status, and optional completion timestamp. It does not verify a money transfer.';
COMMENT ON COLUMN COMPLETION_CONTRACTS.Payment_Status IS 'Employer-entered status: pending, paid, or disputed. No gateway confirmation or admin dispute workflow is implemented.';

-- Index for fast "find contracts for artisan" queries
CREATE INDEX idx_completion_contracts_artisan ON COMPLETION_CONTRACTS(Selected_Artisan_ID);

-- ============================================================================
-- Table: RATINGS_REVIEWS
-- ============================================================================
-- Post-completion feedback left by employers for artisans.
-- Each review drives the artisan's Trust_Score (via trigger recalculation).
-- UNIQUE constraint on Contract_ID ensures one review per contract.
-- ============================================================================
CREATE TABLE RATINGS_REVIEWS (
  Review_ID SERIAL PRIMARY KEY,
  Contract_ID INTEGER NOT NULL UNIQUE,
  Rating_Stars INTEGER NOT NULL CHECK (Rating_Stars BETWEEN 1 AND 5),
  Feedback_Text TEXT,
  Review_Date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Contract_ID) REFERENCES COMPLETION_CONTRACTS(Contract_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE RATINGS_REVIEWS IS 'Employer feedback after work completion. Rating_Stars (1–5) directly influences artisan''s Trust_Score. One review per completed contract.';
COMMENT ON COLUMN RATINGS_REVIEWS.Rating_Stars IS 'Stars: 1 (poor) to 5 (excellent). Used to compute Trust_Score as weighted average across all artisan reviews.';

-- Index for fast "find reviews for artisan" (via contract) queries
CREATE INDEX idx_ratings_reviews_contract ON RATINGS_REVIEWS(Contract_ID);

-- ============================================================================
-- Composite Indexes for Common Query Patterns
-- ============================================================================
-- Fast skill-based location-based gig matching (artisans search by skill + location)
CREATE INDEX idx_artisans_skill_location ON ARTISANS(Skill_Category, Base_Location);

-- Fast "find all artisans by skill" queries
CREATE INDEX idx_artisans_skill_category ON ARTISANS(Skill_Category);

-- Fast "find all artisans by location" queries
CREATE INDEX idx_artisans_base_location ON ARTISANS(Base_Location);

-- Fast "find my gigs" for employer
CREATE INDEX idx_gig_postings_employer ON GIG_POSTINGS(Employer_User_ID);

-- ============================================================================
-- End of Schema
-- ============================================================================
-- To load this schema:
--   psql skillcraft -f database/01_schema.sql
--
-- Then load views, triggers, and seed data:
--   psql skillcraft -f database/02_views.sql
--   psql skillcraft -f database/03_triggers_procedures.sql
--   psql skillcraft -f database/04_roles_permissions.sql
--   psql skillcraft -f database/05_seed_data.sql
-- ============================================================================
