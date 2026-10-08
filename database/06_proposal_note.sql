-- Run once against an existing SkillCraft database before deploying the new UI.
ALTER TABLE GIG_APPLICATIONS ADD COLUMN IF NOT EXISTS Proposal_Note TEXT;
