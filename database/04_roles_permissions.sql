-- ============================================================================
-- SkillCraft Micro-Jobs: Database-Level RBAC (Role-Based Access Control)
-- BCSE302P – Database Systems Lab, Societal Digital Innovation Project
-- ============================================================================
-- This file demonstrates database-native RBAC using PostgreSQL roles and grants.
-- In production, the application connects via a single pooled service account.
-- These roles are created here for evaluation and demonstration purposes,
-- showing understanding of database-level security and RBAC principles.
--
-- Application-layer RBAC (Express middleware, JWT-based) is the primary layer
-- and is implemented in backend/middleware/requireRole.js.
-- ============================================================================

-- ============================================================================
-- Create PostgreSQL roles (if they don't exist)
-- ============================================================================

-- Create application roles (if not already exist)
DO $$
BEGIN
  CREATE ROLE app_artisan WITH LOGIN PASSWORD 'artisan_password';
  EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Role app_artisan already exists';
END
$$;

DO $$
BEGIN
  CREATE ROLE app_employer WITH LOGIN PASSWORD 'employer_password';
  EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Role app_employer already exists';
END
$$;

DO $$
BEGIN
  CREATE ROLE app_admin WITH LOGIN PASSWORD 'admin_password';
  EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Role app_admin already exists';
END
$$;

-- ============================================================================
-- ARTISAN Role Permissions
-- ============================================================================
-- Artisans can:
-- - READ: own user profile, all artisans (to see competitors), all gigs, applications, contracts
-- - WRITE: own applications (create new bids), own contracts (mark complete)
-- - Cannot: post gigs, delete anything, modify other users' data
-- ============================================================================

-- Grant basic connect permission
GRANT CONNECT ON DATABASE skillcraft TO app_artisan;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO app_artisan;

-- Grant read access to tables
GRANT SELECT ON USERS, ARTISANS, GIG_POSTINGS, GIG_APPLICATIONS, 
  COMPLETION_CONTRACTS, RATINGS_REVIEWS TO app_artisan;

-- Grant insert on GIG_APPLICATIONS (submit bids)
GRANT INSERT ON GIG_APPLICATIONS TO app_artisan;

-- Grant update on own applications (via application code validation)
-- Note: Row-level security would enforce this at DB level; here we rely on app layer
GRANT UPDATE ON GIG_APPLICATIONS TO app_artisan;

-- Grant update on COMPLETION_CONTRACTS to mark payment received, completion status
GRANT UPDATE ON COMPLETION_CONTRACTS TO app_artisan;

-- Grant read on views
GRANT SELECT ON Top_Rated_Artisans_View, Skill_Category_Earnings_View, 
  Open_Gigs_View TO app_artisan;

-- Grant usage on sequences (for INSERT operations)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_artisan;

-- ============================================================================
-- EMPLOYER Role Permissions
-- ============================================================================
-- Employers can:
-- - READ: own gigs, applications on own gigs, own contracts, all artisans, all reviews
-- - WRITE: own gigs (create, update, cancel), applications on own gigs (accept/reject),
--   contracts (mark paid, set dispute), leave reviews
-- - Cannot: view/modify other employers' gigs, delete anything
-- ============================================================================

-- Grant basic connect permission
GRANT CONNECT ON DATABASE skillcraft TO app_employer;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO app_employer;

-- Grant read access to tables
GRANT SELECT ON USERS, ARTISANS, GIG_POSTINGS, GIG_APPLICATIONS, 
  COMPLETION_CONTRACTS, RATINGS_REVIEWS TO app_employer;

-- Grant insert and update on GIG_POSTINGS (post and manage gigs)
GRANT INSERT ON GIG_POSTINGS TO app_employer;
GRANT UPDATE ON GIG_POSTINGS TO app_employer;

-- Grant update on GIG_APPLICATIONS (accept/reject bids)
GRANT UPDATE ON GIG_APPLICATIONS TO app_employer;

-- Grant insert and update on COMPLETION_CONTRACTS (manage contracts, mark paid)
GRANT INSERT ON COMPLETION_CONTRACTS TO app_employer;
GRANT UPDATE ON COMPLETION_CONTRACTS TO app_employer;

-- Grant insert on RATINGS_REVIEWS (leave reviews)
GRANT INSERT ON RATINGS_REVIEWS TO app_employer;

-- Grant read on views
GRANT SELECT ON Top_Rated_Artisans_View, Skill_Category_Earnings_View, 
  Open_Gigs_View TO app_employer;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_employer;

-- ============================================================================
-- ADMIN Role Permissions
-- ============================================================================
-- Admins have full access to all tables (all operations).
-- Can audit, modify, or delete any record.
-- ============================================================================

-- Grant basic connect permission
GRANT CONNECT ON DATABASE skillcraft TO app_admin;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO app_admin;

-- Grant all permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_admin;

-- Grant all permissions on views
GRANT SELECT ON Top_Rated_Artisans_View, Skill_Category_Earnings_View, 
  Open_Gigs_View TO app_admin;

-- Grant all permissions on sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- ============================================================================
-- Important Notes on RBAC Implementation
-- ============================================================================
--
-- 1. PRODUCTION DEPLOYMENT:
--    In production, do NOT connect as individual app_artisan/app_employer/app_admin roles.
--    Instead, use a single pooled service account (e.g., "skillcraft_app") that has
--    sufficient permissions. Application-layer RBAC (JWT + middleware) enforces
--    role-based restrictions.
--
-- 2. WHY BOTH LAYERS?
--    - Application-layer RBAC is faster (no DB roundtrip) and more flexible.
--    - Database-layer RBAC provides defense-in-depth against code bypasses and
--      offers fine-grained control (row-level security, column-level security).
--
-- 3. ROW-LEVEL SECURITY (RLS):
--    For production, enable RLS policies:
--      ALTER TABLE USERS ENABLE ROW LEVEL SECURITY;
--      CREATE POLICY users_can_see_own_profile ON USERS
--        USING (User_ID = current_user_id())
--        WITH CHECK (User_ID = current_user_id());
--    (This requires application context passing, e.g., via SET LOCAL session vars.)
--
-- 4. TESTING THESE ROLES:
--    psql -U app_artisan skillcraft -c "SELECT * FROM ARTISANS LIMIT 1;"
--    psql -U app_employer skillcraft -c "SELECT * FROM GIG_POSTINGS LIMIT 1;"
--    psql -U app_admin skillcraft -c "DELETE FROM RATINGS_REVIEWS WHERE Review_ID = 999;"
--
-- ============================================================================
-- End of RBAC
-- ============================================================================
