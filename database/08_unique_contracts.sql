-- Preserve existing data. Add the one-contract-per-job rule where possible.
-- If an older seed left duplicate contracts, review those rows before applying
-- this constraint manually; this migration never deletes them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM COMPLETION_CONTRACTS GROUP BY Gig_ID HAVING COUNT(*) > 1
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'completion_contracts_gig_id_key'
  ) THEN
    ALTER TABLE COMPLETION_CONTRACTS
      ADD CONSTRAINT completion_contracts_gig_id_key UNIQUE (Gig_ID);
  END IF;
END $$;
