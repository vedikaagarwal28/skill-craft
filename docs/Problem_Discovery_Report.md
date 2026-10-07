# Problem discovery and proposed solution

Updated 7 October 2026. This report is the team's **problem framing**, not evidence of completed field research. Earlier draft interview, survey, competitor-fee, and earnings numbers were not backed by source material in this repository and should not be presented as verified facts.

## Who and what

SkillCraft focuses on artisans who take short local jobs and employers who need to hire them. The working hypothesis is that jobs passed through personal contacts or chat groups are difficult to discover and compare outside a person's existing network. The same conversation can lose the link between the original brief, competing prices, the chosen worker, and the outcome.

The selected domain is local skilled work: carpentry, masonry, weaving, plumbing, electrical work, and tailoring. It matters as a database problem because every job may have many bids, but should have at most one accepted worker and one contract. Searchable skills and locations, ownership rules, state transitions, and contract-linked reputation all depend on consistent data.

## Existing approach and limitation

Word of mouth and messaging are familiar and low-friction, but they do not provide a shared structured record for jobs, bids, decisions, contracts, and reviews. Conventional review averages may also give a new worker a perfect score after one rating or allow ratings unrelated to completed jobs. These are design motivations to test, not measured comparisons with named products.

## Current prototype

Employers post jobs and review bids. Artisans browse jobs and submit one bid per job. Accepting a bid closes the job, creates one contract, and rejects competing pending bids. The API enforces role and ownership rules; PostgreSQL constraints and triggers maintain key relationships. After an employer records a contract as paid, they can leave one review. A trigger recalculates a smoothed score from contract-linked reviews. See [schema](../database/01_schema.sql), [trigger/function](../database/02_03_views_triggers_procedures.sql), and [README demo](../README.md#suggested-panel-demonstration).

The current app does **not** process money, verify a bank transfer, hold escrow, arbitrate disputes, certify skills, or offer regional-language interfaces. The score is derived from employer-entered records. Those limits matter when explaining trust to a panel.

## Validation needed

Before making a societal or competitive claim, interview or observe prospective users with consent, cite any third-party statistics, and compare a baseline workflow against SkillCraft on a defined task. Plausible measures are time to find a suitable job, share of bids with a complete work record, duplicate assignments prevented, and user understanding of the payment-status label. A measured result should include sample size and method.

The intended societal link is **SDG 8: Decent Work and Economic Growth**. The prototype demonstrates a possible mechanism for broader access to local work and a portable record; actual income or inclusion benefits remain unmeasured.
