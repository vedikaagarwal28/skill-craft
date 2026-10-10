-- One independent artisan review of the employer per paid contract.
CREATE TABLE IF NOT EXISTS EMPLOYER_REVIEWS (
  Review_ID SERIAL PRIMARY KEY,
  Contract_ID INTEGER NOT NULL UNIQUE REFERENCES COMPLETION_CONTRACTS(Contract_ID) ON DELETE CASCADE,
  Rating_Stars INTEGER NOT NULL CHECK (Rating_Stars BETWEEN 1 AND 5),
  Feedback_Text TEXT CHECK (char_length(Feedback_Text) <= 1000),
  Review_Date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW Employer_Public_Reviews AS
SELECT er.Review_ID, er.Rating_Stars, er.Feedback_Text, er.Review_Date,
       gp.Employer_User_ID AS employer_id, au.Full_Name AS artisan_name,
       gp.Skill_Required
FROM EMPLOYER_REVIEWS er
JOIN COMPLETION_CONTRACTS cc ON cc.Contract_ID = er.Contract_ID
JOIN GIG_POSTINGS gp ON gp.Gig_ID = cc.Gig_ID
JOIN ARTISANS a ON a.Artisan_ID = cc.Selected_Artisan_ID
JOIN USERS au ON au.User_ID = a.User_ID;

GRANT SELECT, INSERT ON EMPLOYER_REVIEWS TO skillcraft_runtime;
GRANT USAGE, SELECT ON SEQUENCE employer_reviews_review_id_seq TO skillcraft_runtime;
GRANT SELECT ON Employer_Public_Reviews TO skillcraft_runtime;
ALTER TABLE EMPLOYER_REVIEWS ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS runtime_employer_reviews_read ON EMPLOYER_REVIEWS;
CREATE POLICY runtime_employer_reviews_read ON EMPLOYER_REVIEWS
  FOR SELECT TO skillcraft_runtime USING (TRUE);
DROP POLICY IF EXISTS runtime_employer_reviews_create ON EMPLOYER_REVIEWS;
CREATE POLICY runtime_employer_reviews_create ON EMPLOYER_REVIEWS
  FOR INSERT TO skillcraft_runtime WITH CHECK (
    app_actor_role() = 'artisan' AND EXISTS (
      SELECT 1 FROM COMPLETION_CONTRACTS cc
      JOIN ARTISANS a ON a.Artisan_ID = cc.Selected_Artisan_ID
      WHERE cc.Contract_ID = EMPLOYER_REVIEWS.Contract_ID
        AND cc.Payment_Status = 'paid' AND a.User_ID = app_actor_id()
    )
  );

CREATE OR REPLACE FUNCTION record_employer_review_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO CONTRACT_EVENTS (Contract_ID, Actor_User_ID, Event_Type, Event_Detail)
  VALUES (NEW.Contract_ID, app_actor_id(), 'review_added',
          jsonb_build_object('stars', NEW.Rating_Stars, 'reviewed_role', 'employer'));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_employer_review_event ON EMPLOYER_REVIEWS;
CREATE TRIGGER trg_record_employer_review_event AFTER INSERT ON EMPLOYER_REVIEWS
FOR EACH ROW EXECUTE FUNCTION record_employer_review_event();
