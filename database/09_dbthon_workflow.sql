-- DBTHON proposal: two-party work confirmation, contract event history,
-- indexed discovery, and row-level ownership for the API service role.
-- Safe to rerun against an existing SkillCraft database.

ALTER TABLE COMPLETION_CONTRACTS
  ADD COLUMN IF NOT EXISTS Employer_Paid_At TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS Artisan_Received_At TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS Confirmation_Required BOOLEAN NOT NULL DEFAULT TRUE;

-- Previously paid records came from the earlier employer-only workflow. Keep
-- them visible as legacy records; do not invent an artisan confirmation.
UPDATE COMPLETION_CONTRACTS
SET Confirmation_Required = FALSE
WHERE Payment_Status = 'paid'
  AND Employer_Paid_At IS NULL
  AND Artisan_Received_At IS NULL
  AND Confirmation_Required = TRUE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_paid_requires_two_confirmations'
  ) THEN
    ALTER TABLE COMPLETION_CONTRACTS
      ADD CONSTRAINT contract_paid_requires_two_confirmations
      CHECK (
        NOT Confirmation_Required OR Payment_Status <> 'paid' OR
        (Employer_Paid_At IS NOT NULL AND Artisan_Received_At IS NOT NULL)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS CONTRACT_EVENTS (
  Event_ID BIGSERIAL PRIMARY KEY,
  Contract_ID INTEGER NOT NULL REFERENCES COMPLETION_CONTRACTS(Contract_ID) ON DELETE CASCADE,
  Actor_User_ID INTEGER REFERENCES USERS(User_ID) ON DELETE SET NULL,
  Event_Type VARCHAR(40) NOT NULL CHECK (Event_Type IN (
    'legacy_record', 'contract_created', 'payment_sent', 'receipt_confirmed',
    'payment_confirmed', 'payment_disputed', 'review_added'
  )),
  Event_Detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  Created_At TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract_time
  ON CONTRACT_EVENTS(Contract_ID, Event_ID);

-- The migration records provenance without pretending older payment rows had
-- two independent confirmations.
INSERT INTO CONTRACT_EVENTS (Contract_ID, Event_Type, Event_Detail)
SELECT cc.Contract_ID, 'legacy_record',
       jsonb_build_object('payment_status', cc.Payment_Status)
FROM COMPLETION_CONTRACTS cc
WHERE NOT EXISTS (
  SELECT 1 FROM CONTRACT_EVENTS ev WHERE ev.Contract_ID = cc.Contract_ID
);

CREATE OR REPLACE FUNCTION block_contract_event_rewrite()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Contract history is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_block_contract_event_rewrite ON CONTRACT_EVENTS;
CREATE TRIGGER trg_block_contract_event_rewrite
BEFORE UPDATE OR DELETE ON CONTRACT_EVENTS
FOR EACH ROW EXECUTE FUNCTION block_contract_event_rewrite();

CREATE OR REPLACE FUNCTION app_actor_id()
RETURNS INTEGER LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::INTEGER;
$$;

CREATE OR REPLACE FUNCTION app_actor_role()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.user_role', true), ''), 'guest');
$$;

CREATE OR REPLACE FUNCTION record_contract_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor INTEGER := app_actor_id();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type)
    VALUES (NEW.Contract_ID, actor, 'contract_created');
  ELSE
    IF OLD.Employer_Paid_At IS NULL AND NEW.Employer_Paid_At IS NOT NULL THEN
      INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type)
      VALUES (NEW.Contract_ID, actor, 'payment_sent');
    END IF;
    IF OLD.Artisan_Received_At IS NULL AND NEW.Artisan_Received_At IS NOT NULL THEN
      INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type)
      VALUES (NEW.Contract_ID, actor, 'receipt_confirmed');
    END IF;
    IF OLD.Payment_Status <> 'paid' AND NEW.Payment_Status = 'paid' THEN
      INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type)
      VALUES (NEW.Contract_ID, actor, 'payment_confirmed');
    ELSIF OLD.Payment_Status <> 'disputed' AND NEW.Payment_Status = 'disputed' THEN
      INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type)
      VALUES (NEW.Contract_ID, actor, 'payment_disputed');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_contract_event ON COMPLETION_CONTRACTS;
CREATE TRIGGER trg_record_contract_event
AFTER INSERT OR UPDATE ON COMPLETION_CONTRACTS
FOR EACH ROW EXECUTE FUNCTION record_contract_event();

CREATE OR REPLACE FUNCTION record_review_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type,
                               Event_Detail)
  VALUES (NEW.Contract_ID, app_actor_id(), 'review_added',
          jsonb_build_object('stars', NEW.Rating_Stars));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_review_event ON RATINGS_REVIEWS;
CREATE TRIGGER trg_record_review_event
AFTER INSERT ON RATINGS_REVIEWS
FOR EACH ROW EXECUTE FUNCTION record_review_event();

-- Security-definer functions make the two sides' permitted transitions
-- explicit. The runtime role has no direct UPDATE grant on contracts.
CREATE OR REPLACE FUNCTION record_employer_payment(p_contract_id INTEGER)
RETURNS COMPLETION_CONTRACTS LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  contract_row COMPLETION_CONTRACTS%ROWTYPE;
  owner_id INTEGER;
BEGIN
  SELECT * INTO contract_row FROM COMPLETION_CONTRACTS
  WHERE Contract_ID = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  SELECT Employer_User_ID INTO owner_id FROM GIG_POSTINGS WHERE Gig_ID = contract_row.Gig_ID;
  IF app_actor_role() <> 'employer' OR app_actor_id() IS DISTINCT FROM owner_id THEN
    RAISE EXCEPTION 'Only the hiring employer can record payment' USING ERRCODE = '42501';
  END IF;
  IF contract_row.Payment_Status <> 'pending' OR contract_row.Employer_Paid_At IS NOT NULL THEN
    RAISE EXCEPTION 'Payment has already been recorded' USING ERRCODE = 'P0001';
  END IF;
  UPDATE COMPLETION_CONTRACTS
  SET Employer_Paid_At = CURRENT_TIMESTAMP, Updated_At = CURRENT_TIMESTAMP
  WHERE Contract_ID = p_contract_id RETURNING * INTO contract_row;
  RETURN contract_row;
END $$;

CREATE OR REPLACE FUNCTION confirm_artisan_receipt(p_contract_id INTEGER)
RETURNS COMPLETION_CONTRACTS LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  contract_row COMPLETION_CONTRACTS%ROWTYPE;
  artisan_user_id INTEGER;
BEGIN
  SELECT * INTO contract_row FROM COMPLETION_CONTRACTS
  WHERE Contract_ID = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  SELECT User_ID INTO artisan_user_id FROM ARTISANS
  WHERE Artisan_ID = contract_row.Selected_Artisan_ID;
  IF app_actor_role() <> 'artisan' OR app_actor_id() IS DISTINCT FROM artisan_user_id THEN
    RAISE EXCEPTION 'Only the selected artisan can confirm receipt' USING ERRCODE = '42501';
  END IF;
  IF contract_row.Payment_Status <> 'pending' OR contract_row.Employer_Paid_At IS NULL
     OR contract_row.Artisan_Received_At IS NOT NULL THEN
    RAISE EXCEPTION 'Employer payment record is required first' USING ERRCODE = 'P0001';
  END IF;
  UPDATE COMPLETION_CONTRACTS
  SET Artisan_Received_At = CURRENT_TIMESTAMP, Payment_Status = 'paid',
      Updated_At = CURRENT_TIMESTAMP
  WHERE Contract_ID = p_contract_id RETURNING * INTO contract_row;
  RETURN contract_row;
END $$;

CREATE OR REPLACE FUNCTION dispute_contract_payment(p_contract_id INTEGER)
RETURNS COMPLETION_CONTRACTS LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  contract_row COMPLETION_CONTRACTS%ROWTYPE;
  owner_id INTEGER;
BEGIN
  SELECT * INTO contract_row FROM COMPLETION_CONTRACTS
  WHERE Contract_ID = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE = 'P0002'; END IF;
  SELECT Employer_User_ID INTO owner_id FROM GIG_POSTINGS WHERE Gig_ID = contract_row.Gig_ID;
  IF app_actor_role() <> 'employer' OR app_actor_id() IS DISTINCT FROM owner_id THEN
    RAISE EXCEPTION 'Only the hiring employer can mark a dispute' USING ERRCODE = '42501';
  END IF;
  IF contract_row.Payment_Status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending contracts can be disputed' USING ERRCODE = 'P0001';
  END IF;
  UPDATE COMPLETION_CONTRACTS
  SET Payment_Status = 'disputed', Updated_At = CURRENT_TIMESTAMP
  WHERE Contract_ID = p_contract_id RETURNING * INTO contract_row;
  RETURN contract_row;
END $$;

-- Authenticated parties can see a partner's phone only after a contract exists.
CREATE OR REPLACE FUNCTION contract_partner_phone(p_partner_user_id INTEGER)
RETURNS VARCHAR LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT u.Phone FROM USERS u
  WHERE u.User_ID = p_partner_user_id
    AND EXISTS (
      SELECT 1 FROM COMPLETION_CONTRACTS cc
      JOIN GIG_POSTINGS gp ON gp.Gig_ID = cc.Gig_ID
      JOIN ARTISANS a ON a.Artisan_ID = cc.Selected_Artisan_ID
      WHERE (gp.Employer_User_ID = app_actor_id() AND a.User_ID = p_partner_user_id)
         OR (a.User_ID = app_actor_id() AND gp.Employer_User_ID = p_partner_user_id)
    )
  LIMIT 1;
$$;

-- Readable score remains a cached result; review updates run as the owner so
-- an employer never receives direct UPDATE rights on another artisan's row.
ALTER FUNCTION recalculate_trust_score(INTEGER) SECURITY DEFINER;
ALTER FUNCTION recalculate_trust_score(INTEGER) SET search_path = public;
ALTER FUNCTION after_review_insert_recalc_trust_score() SECURITY DEFINER;
ALTER FUNCTION after_review_insert_recalc_trust_score() SET search_path = public;

-- Indexes support exact skill selection and token-based place/keyword search.
CREATE INDEX IF NOT EXISTS idx_open_gigs_skill_folded
  ON GIG_POSTINGS (LOWER(Skill_Required), Posted_Date DESC)
  WHERE Status = 'open';
CREATE INDEX IF NOT EXISTS idx_open_gigs_search
  ON GIG_POSTINGS USING GIN
  (to_tsvector('simple', COALESCE(Skill_Required, '') || ' ' ||
                         COALESCE(Address, '') || ' ' || COALESCE(Description, '')))
  WHERE Status = 'open';
CREATE INDEX IF NOT EXISTS idx_artisans_skill_folded
  ON ARTISANS (LOWER(Skill_Category), LOWER(Base_Location));
CREATE INDEX IF NOT EXISTS idx_artisans_search
  ON ARTISANS USING GIN
  (to_tsvector('simple', COALESCE(Skill_Category, '') || ' ' ||
                         COALESCE(Base_Location, '')));

-- These owner-run views expose only public reputation facts, even when the
-- signed-in caller cannot read another person's private contract row.
CREATE OR REPLACE VIEW Artisan_Public_Stats AS
SELECT a.Artisan_ID,
  COUNT(DISTINCT cc.Contract_ID) AS total_contracts_completed,
  COUNT(DISTINCT rr.Review_ID) AS total_reviews
FROM ARTISANS a
LEFT JOIN COMPLETION_CONTRACTS cc ON cc.Selected_Artisan_ID = a.Artisan_ID
LEFT JOIN RATINGS_REVIEWS rr ON rr.Contract_ID = cc.Contract_ID
GROUP BY a.Artisan_ID;

CREATE OR REPLACE VIEW Artisan_Public_Reviews AS
SELECT rr.Review_ID, rr.Rating_Stars, rr.Feedback_Text, rr.Review_Date,
  u.Full_Name AS employer_name, gp.Skill_Required, cc.Final_Amount,
  cc.Selected_Artisan_ID AS artisan_id
FROM RATINGS_REVIEWS rr
JOIN COMPLETION_CONTRACTS cc ON cc.Contract_ID = rr.Contract_ID
JOIN GIG_POSTINGS gp ON gp.Gig_ID = cc.Gig_ID
JOIN USERS u ON u.User_ID = gp.Employer_User_ID;

DO $$ BEGIN
  CREATE ROLE skillcraft_runtime NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The pooled service login assumes the restricted role for API requests.
DO $$ BEGIN
  EXECUTE format('GRANT skillcraft_runtime TO %I', current_user);
END $$;

GRANT USAGE ON SCHEMA public TO skillcraft_runtime;
GRANT SELECT (User_ID, Full_Name, Role) ON USERS TO skillcraft_runtime;
REVOKE ALL ON ARTISANS FROM skillcraft_runtime;
GRANT SELECT ON ARTISANS TO skillcraft_runtime;
GRANT UPDATE (Skill_Category, Base_Location, Region_Language, Hourly_Rate, Updated_At)
  ON ARTISANS TO skillcraft_runtime;
GRANT SELECT, INSERT, UPDATE ON GIG_POSTINGS TO skillcraft_runtime;
GRANT SELECT, INSERT, UPDATE ON GIG_APPLICATIONS TO skillcraft_runtime;
GRANT SELECT, INSERT ON COMPLETION_CONTRACTS TO skillcraft_runtime;
GRANT SELECT, INSERT ON RATINGS_REVIEWS TO skillcraft_runtime;
GRANT SELECT ON CONTRACT_EVENTS TO skillcraft_runtime;
GRANT SELECT ON Top_Rated_Artisans_View, Skill_Category_Earnings_View,
  Open_Gigs_View, Artisan_Public_Stats, Artisan_Public_Reviews TO skillcraft_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skillcraft_runtime;
REVOKE EXECUTE ON FUNCTION record_employer_payment(INTEGER),
  confirm_artisan_receipt(INTEGER), dispute_contract_payment(INTEGER),
  contract_partner_phone(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_employer_payment(INTEGER),
  confirm_artisan_receipt(INTEGER), dispute_contract_payment(INTEGER),
  contract_partner_phone(INTEGER) TO skillcraft_runtime;
REVOKE EXECUTE ON FUNCTION recalculate_trust_score(INTEGER) FROM PUBLIC, skillcraft_runtime;

ALTER TABLE ARTISANS ENABLE ROW LEVEL SECURITY;
ALTER TABLE GIG_POSTINGS ENABLE ROW LEVEL SECURITY;
ALTER TABLE GIG_APPLICATIONS ENABLE ROW LEVEL SECURITY;
ALTER TABLE COMPLETION_CONTRACTS ENABLE ROW LEVEL SECURITY;
ALTER TABLE RATINGS_REVIEWS ENABLE ROW LEVEL SECURITY;
ALTER TABLE CONTRACT_EVENTS ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runtime_artisans_read ON ARTISANS;
CREATE POLICY runtime_artisans_read ON ARTISANS FOR SELECT TO skillcraft_runtime USING (TRUE);
DROP POLICY IF EXISTS runtime_artisans_write ON ARTISANS;
CREATE POLICY runtime_artisans_write ON ARTISANS FOR UPDATE TO skillcraft_runtime
  USING (User_ID = app_actor_id() AND app_actor_role() = 'artisan')
  WITH CHECK (User_ID = app_actor_id() AND app_actor_role() = 'artisan');

DROP POLICY IF EXISTS runtime_gigs_read ON GIG_POSTINGS;
CREATE POLICY runtime_gigs_read ON GIG_POSTINGS FOR SELECT TO skillcraft_runtime USING (TRUE);
DROP POLICY IF EXISTS runtime_gigs_create ON GIG_POSTINGS;
CREATE POLICY runtime_gigs_create ON GIG_POSTINGS FOR INSERT TO skillcraft_runtime
  WITH CHECK (Employer_User_ID = app_actor_id() AND app_actor_role() = 'employer');
DROP POLICY IF EXISTS runtime_gigs_write ON GIG_POSTINGS;
CREATE POLICY runtime_gigs_write ON GIG_POSTINGS FOR UPDATE TO skillcraft_runtime
  USING (Employer_User_ID = app_actor_id() AND app_actor_role() = 'employer')
  WITH CHECK (Employer_User_ID = app_actor_id() AND app_actor_role() = 'employer');

DROP POLICY IF EXISTS runtime_bids_read ON GIG_APPLICATIONS;
CREATE POLICY runtime_bids_read ON GIG_APPLICATIONS FOR SELECT TO skillcraft_runtime
  USING (
    app_actor_role() = 'admin' OR
    EXISTS (SELECT 1 FROM ARTISANS a WHERE a.Artisan_ID = GIG_APPLICATIONS.Artisan_ID AND a.User_ID = app_actor_id()) OR
    EXISTS (SELECT 1 FROM GIG_POSTINGS g WHERE g.Gig_ID = GIG_APPLICATIONS.Gig_ID AND g.Employer_User_ID = app_actor_id())
  );
DROP POLICY IF EXISTS runtime_bids_create ON GIG_APPLICATIONS;
CREATE POLICY runtime_bids_create ON GIG_APPLICATIONS FOR INSERT TO skillcraft_runtime
  WITH CHECK (
    app_actor_role() = 'artisan' AND
    EXISTS (SELECT 1 FROM ARTISANS a WHERE a.Artisan_ID = GIG_APPLICATIONS.Artisan_ID AND a.User_ID = app_actor_id()) AND
    EXISTS (SELECT 1 FROM GIG_POSTINGS g WHERE g.Gig_ID = GIG_APPLICATIONS.Gig_ID AND g.Status = 'open')
  );
DROP POLICY IF EXISTS runtime_bids_write ON GIG_APPLICATIONS;
CREATE POLICY runtime_bids_write ON GIG_APPLICATIONS FOR UPDATE TO skillcraft_runtime
  USING (app_actor_role() = 'employer' AND EXISTS (
    SELECT 1 FROM GIG_POSTINGS g WHERE g.Gig_ID = GIG_APPLICATIONS.Gig_ID AND g.Employer_User_ID = app_actor_id()
  ))
  WITH CHECK (app_actor_role() = 'employer' AND EXISTS (
    SELECT 1 FROM GIG_POSTINGS g WHERE g.Gig_ID = GIG_APPLICATIONS.Gig_ID AND g.Employer_User_ID = app_actor_id()
  ));

DROP POLICY IF EXISTS runtime_contracts_read ON COMPLETION_CONTRACTS;
CREATE POLICY runtime_contracts_read ON COMPLETION_CONTRACTS FOR SELECT TO skillcraft_runtime
  USING (
    app_actor_role() = 'admin' OR
    EXISTS (SELECT 1 FROM ARTISANS a WHERE a.Artisan_ID = COMPLETION_CONTRACTS.Selected_Artisan_ID AND a.User_ID = app_actor_id()) OR
    EXISTS (SELECT 1 FROM GIG_POSTINGS g WHERE g.Gig_ID = COMPLETION_CONTRACTS.Gig_ID AND g.Employer_User_ID = app_actor_id())
  );
DROP POLICY IF EXISTS runtime_contracts_create ON COMPLETION_CONTRACTS;
CREATE POLICY runtime_contracts_create ON COMPLETION_CONTRACTS FOR INSERT TO skillcraft_runtime
  WITH CHECK (app_actor_role() = 'employer' AND EXISTS (
    SELECT 1 FROM GIG_POSTINGS g WHERE g.Gig_ID = COMPLETION_CONTRACTS.Gig_ID AND g.Employer_User_ID = app_actor_id()
  ));

DROP POLICY IF EXISTS runtime_reviews_read ON RATINGS_REVIEWS;
CREATE POLICY runtime_reviews_read ON RATINGS_REVIEWS FOR SELECT TO skillcraft_runtime USING (TRUE);
DROP POLICY IF EXISTS runtime_reviews_create ON RATINGS_REVIEWS;
CREATE POLICY runtime_reviews_create ON RATINGS_REVIEWS FOR INSERT TO skillcraft_runtime
  WITH CHECK (app_actor_role() = 'employer' AND EXISTS (
    SELECT 1 FROM COMPLETION_CONTRACTS cc
    JOIN GIG_POSTINGS g ON g.Gig_ID = cc.Gig_ID
    WHERE cc.Contract_ID = RATINGS_REVIEWS.Contract_ID
      AND cc.Payment_Status = 'paid' AND g.Employer_User_ID = app_actor_id()
  ));

DROP POLICY IF EXISTS runtime_events_read ON CONTRACT_EVENTS;
CREATE POLICY runtime_events_read ON CONTRACT_EVENTS FOR SELECT TO skillcraft_runtime
  USING (app_actor_role() = 'admin' OR EXISTS (
    SELECT 1 FROM COMPLETION_CONTRACTS cc
    JOIN GIG_POSTINGS g ON g.Gig_ID = cc.Gig_ID
    JOIN ARTISANS a ON a.Artisan_ID = cc.Selected_Artisan_ID
    WHERE cc.Contract_ID = CONTRACT_EVENTS.Contract_ID
      AND (g.Employer_User_ID = app_actor_id() OR a.User_ID = app_actor_id())
  ));

COMMENT ON TABLE CONTRACT_EVENTS IS 'Append-only contract history. Older rows are marked legacy_record; new paid status needs both parties to confirm.';
COMMENT ON COLUMN COMPLETION_CONTRACTS.Confirmation_Required IS 'TRUE for new contracts. FALSE only for imported paid records from the earlier employer-only workflow.';
