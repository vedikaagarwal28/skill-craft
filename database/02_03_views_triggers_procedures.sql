-- ============================================================================
-- SkillCraft Micro-Jobs: Views, Triggers, and Stored Procedures
-- BCSE302P – Database Systems Lab, Societal Digital Innovation Project
-- ============================================================================
-- This file implements:
-- 1. Views for dashboards and reporting
-- 2. Trigger to auto-close gigs and reject conflicting bids on acceptance
-- 3. Stored procedure to recalculate trust scores from review history
-- 4. Trigger to automatically recalculate trust score after each review
-- ============================================================================

-- ============================================================================
-- VIEW 1: Top_Rated_Artisans_View
-- ============================================================================
-- Shows artisans sorted by trust score (highest first), along with their
-- average rating, skill category, and location.
-- Used by: Admin dashboard, employer search for high-quality artisans.
-- ============================================================================

CREATE OR REPLACE VIEW Top_Rated_Artisans_View AS
SELECT
  a.Artisan_ID,
  u.Full_Name,
  a.Skill_Category,
  a.Base_Location,
  a.Trust_Score,
  ROUND(AVG(rr.Rating_Stars)::NUMERIC, 2) AS avg_rating,
  COUNT(rr.Review_ID) AS total_reviews,
  COUNT(cc.Contract_ID) AS total_contracts_completed
FROM ARTISANS a
JOIN USERS u ON a.User_ID = u.User_ID
LEFT JOIN COMPLETION_CONTRACTS cc ON cc.Selected_Artisan_ID = a.Artisan_ID
LEFT JOIN RATINGS_REVIEWS rr ON rr.Contract_ID = cc.Contract_ID AND cc.Payment_Status = 'paid'
GROUP BY a.Artisan_ID, u.Full_Name, a.Skill_Category, a.Base_Location, a.Trust_Score
ORDER BY a.Trust_Score DESC, COUNT(rr.Review_ID) DESC;

COMMENT ON VIEW Top_Rated_Artisans_View IS 'Dashboard view: artisans ranked by trust score (derived from verified reviews). Supports finding high-quality, reliable workers.';

-- ============================================================================
-- VIEW 2: Skill_Category_Earnings_View
-- ============================================================================
-- Shows by skill category:
--   - Average bid amount (what artisans ask for)
--   - Average final settled amount (what they actually earn)
--   - Difference: the "middleman markup" that direct platform removes
-- Used by: Impact analysis, employer budgeting, artisan income projections.
-- ============================================================================

CREATE OR REPLACE VIEW Skill_Category_Earnings_View AS
SELECT
  gp.Skill_Required,
  COUNT(DISTINCT ga.Application_ID) AS total_bids,
  ROUND(AVG(ga.Bid_Amount)::NUMERIC, 2) AS avg_bid_amount,
  ROUND(AVG(cc.Final_Amount)::NUMERIC, 2) AS avg_settled_amount,
  ROUND(
    (AVG(cc.Final_Amount) - AVG(ga.Bid_Amount))::NUMERIC,
    2
  ) AS amount_difference,
  ROUND(
    ((AVG(cc.Final_Amount) - AVG(ga.Bid_Amount)) / AVG(ga.Bid_Amount) * 100)::NUMERIC,
    2
  ) AS percent_premium,
  COUNT(DISTINCT cc.Contract_ID) AS completed_contracts
FROM GIG_POSTINGS gp
LEFT JOIN GIG_APPLICATIONS ga ON gp.Gig_ID = ga.Gig_ID
LEFT JOIN COMPLETION_CONTRACTS cc ON gp.Gig_ID = cc.Gig_ID
GROUP BY gp.Skill_Required
ORDER BY avg_settled_amount DESC;

COMMENT ON VIEW Skill_Category_Earnings_View IS 'Impact view: shows average bid vs. final amount by skill category. Negative difference means settlement < bid (artisans renegotiate down). Demonstrates direct-to-employer connection effect.';

-- ============================================================================
-- VIEW 3: Open_Gigs_View
-- ============================================================================
-- Shows currently open gigs with employer name and count of active bids.
-- Used by: Gig board, artisan job search, employer monitoring.
-- ============================================================================

CREATE OR REPLACE VIEW Open_Gigs_View AS
SELECT
  gp.Gig_ID,
  gp.Skill_Required,
  gp.Address,
  gp.Budget,
  gp.Posted_Date,
  u.Full_Name AS employer_name,
  COUNT(ga.Application_ID) AS pending_applications,
  MAX(ga.Bid_Amount) AS highest_bid,
  MIN(ga.Bid_Amount) AS lowest_bid
FROM GIG_POSTINGS gp
JOIN USERS u ON gp.Employer_User_ID = u.User_ID
LEFT JOIN GIG_APPLICATIONS ga ON gp.Gig_ID = ga.Gig_ID 
  AND ga.Application_Status = 'pending'
WHERE gp.Status = 'open'
GROUP BY gp.Gig_ID, gp.Skill_Required, gp.Address, gp.Budget, 
         gp.Posted_Date, u.Full_Name
ORDER BY gp.Posted_Date DESC;

COMMENT ON VIEW Open_Gigs_View IS 'Live gig board: shows open gigs with bid count, highest/lowest offer, and employer info. Helps artisans find opportunities and employers track interest.';

-- ============================================================================
-- STORED PROCEDURE: recalculate_trust_score(artisan_id)
-- ============================================================================
-- Recomputes an artisan's trust score from their review history.
-- Formula: paid-contract reviews with a modest prior, so one review cannot
-- immediately produce a perfect score. Employer payment delays never lower an
-- artisan's score.
-- Called by: trigger after each new review insertion.
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_trust_score(
  p_artisan_id INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_review_count INTEGER;
  v_rating_sum NUMERIC;
  v_trust_score NUMERIC(3, 2);
BEGIN
  -- Count only feedback tied to a settled, verified contract.
  SELECT
    COUNT(rr.Review_ID), COALESCE(SUM(rr.Rating_Stars), 0)
    INTO v_review_count, v_rating_sum
  FROM RATINGS_REVIEWS rr
  JOIN COMPLETION_CONTRACTS cc ON rr.Contract_ID = cc.Contract_ID
  WHERE cc.Selected_Artisan_ID = p_artisan_id
    AND cc.Payment_Status = 'paid';

  IF v_review_count > 0 THEN
    -- Three virtual 3.5-star reviews steady the score for new artisans.
    v_trust_score := ((v_rating_sum + 10.5) / (v_review_count + 3))::NUMERIC(3, 2);
  ELSE
    v_trust_score := 0.00;
  END IF;

  -- Clamp to [0.00, 5.00]
  v_trust_score := LEAST(5.00, GREATEST(0.00, v_trust_score));

  -- Update the artisan's trust score
  UPDATE ARTISANS
  SET Trust_Score = v_trust_score,
      Updated_At = CURRENT_TIMESTAMP
  WHERE Artisan_ID = p_artisan_id;

  RAISE NOTICE 'Trust score for artisan % recalculated to %', p_artisan_id, v_trust_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_trust_score(INTEGER) IS 
'Recomputes artisan trust score from paid-contract reviews with a modest prior. Employer payment timing does not penalize artisans.';

-- ============================================================================
-- TRIGGER: after_review_insert_recalc_trust_score
-- ============================================================================
-- Automatically recalculates artisan trust score whenever a new review is inserted.
-- Ensures trust score stays current without manual intervention.
-- ============================================================================

CREATE OR REPLACE FUNCTION after_review_insert_recalc_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  v_artisan_id INTEGER;
BEGIN
  -- Get the artisan ID from the contract
  SELECT Selected_Artisan_ID INTO v_artisan_id
  FROM COMPLETION_CONTRACTS
  WHERE Contract_ID = NEW.Contract_ID;

  -- Recalculate trust score for this artisan
  PERFORM recalculate_trust_score(v_artisan_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_review_insert_recalc_trust_score ON RATINGS_REVIEWS;
CREATE TRIGGER trg_after_review_insert_recalc_trust_score
AFTER INSERT ON RATINGS_REVIEWS
FOR EACH ROW
EXECUTE FUNCTION after_review_insert_recalc_trust_score();

COMMENT ON TRIGGER trg_after_review_insert_recalc_trust_score ON RATINGS_REVIEWS IS
'Automatically recalculates trust score after each new review. Keeps scores current.';

-- ============================================================================
-- TRIGGER: after_application_accept_close_gig_and_reject_others
-- ============================================================================
-- When an application's status is changed to 'accepted':
-- 1. Set the gig status to 'closed' (no more bids accepted)
-- 2. Create a COMPLETION_CONTRACT record
-- 3. Reject all other pending applications on the same gig
--
-- This ensures a gig cannot be double-booked and keeps state consistent.
-- ============================================================================

CREATE OR REPLACE FUNCTION after_application_accept_close_gig_and_reject_others()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed TO 'accepted'
  IF NEW.Application_Status = 'accepted' AND 
     (OLD.Application_Status IS NULL OR OLD.Application_Status != 'accepted') THEN

    -- Close the gig
    UPDATE GIG_POSTINGS
    SET Status = 'closed',
        Updated_At = CURRENT_TIMESTAMP
    WHERE Gig_ID = NEW.Gig_ID;

    -- Create a completion contract (if not already exists)
    INSERT INTO COMPLETION_CONTRACTS 
      (Gig_ID, Selected_Artisan_ID, Final_Amount, Payment_Status)
    SELECT 
      NEW.Gig_ID,
      NEW.Artisan_ID,
      NEW.Bid_Amount,
      'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM COMPLETION_CONTRACTS 
      WHERE Gig_ID = NEW.Gig_ID
    );

    -- Reject all other pending applications on this gig
    UPDATE GIG_APPLICATIONS
    SET Application_Status = 'rejected',
        Updated_At = CURRENT_TIMESTAMP
    WHERE Gig_ID = NEW.Gig_ID
      AND Application_ID != NEW.Application_ID
      AND Application_Status = 'pending';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_application_accept_close_gig_and_reject_others 
  ON GIG_APPLICATIONS;
CREATE TRIGGER trg_after_application_accept_close_gig_and_reject_others
AFTER UPDATE ON GIG_APPLICATIONS
FOR EACH ROW
EXECUTE FUNCTION after_application_accept_close_gig_and_reject_others();

COMMENT ON TRIGGER trg_after_application_accept_close_gig_and_reject_others ON GIG_APPLICATIONS IS
'When a bid is accepted: (1) close the gig, (2) create contract, (3) auto-reject other pending bids. Prevents double-booking.';

-- ============================================================================
-- End of Views, Triggers, and Procedures
-- ============================================================================
-- To load this file:
--   psql skillcraft -f database/02_views.sql
--   psql skillcraft -f database/03_triggers_procedures.sql
--
-- Verify views:
--   SELECT * FROM Top_Rated_Artisans_View;
--   SELECT * FROM Skill_Category_Earnings_View;
--   SELECT * FROM Open_Gigs_View;
--
-- Test trust score recalculation:
--   SELECT recalculate_trust_score(1);
--   SELECT Artisan_ID, Trust_Score FROM ARTISANS WHERE Artisan_ID = 1;
-- ============================================================================
