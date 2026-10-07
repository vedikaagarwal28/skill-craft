# Impact and technology readiness

Updated 7 October 2026. This is an evidence-based status note for the local prototype. It replaces earlier projections presented as achieved outcomes.

## Observed in the prototype

- A local employer and artisan can complete the post → bid → accept → contract → recorded payment status → review workflow.
- Database constraints prevent duplicate artisan bids and duplicate contracts for one job. A transaction and trigger coordinate bid acceptance, and cancellation rejects pending bids.
- Tests run the schema, API flow, and browser interface in controlled local conditions. See the [testing report](Testing_Validation_Report.md).

These observations support a **lab prototype** claim. They do not establish field reliability, production readiness, or a specific numeric Technology Readiness Level without applying a chosen TRL framework and its criteria.

## Intended societal outcome

SkillCraft aims to give artisans direct access to local opportunities and a work history tied to contracts. This aligns with **SDG 8**. The application contains no commission calculation, payment gateway, escrow, direct income measurement, or evidence that users earn more. The earlier “₹6 billion/year” figure depended on assumed adoption and income uplift and is **a scenario, not an observed or validated result**. Do not use it as a measured outcome in the panel presentation.

## What would validate impact

1. Document a baseline: how a comparable group currently finds jobs and records agreements.
2. Define measures such as successful matches, time to first qualified bid, duplicate assignments, payment-status understanding, and worker-reported earnings.
3. Collect data with user consent over a defined pilot period and report sample sizes, missing data, and uncertainty.
4. Compare the same measures for the prototype and baseline. Distinguish the effects of the database mechanism from the effect of simply having a website.

Until then, present impact as **expected**, not proven. Treat trust-score fairness, fraudulent employer reports, access for low-connectivity users, and dispute handling as open risks.
