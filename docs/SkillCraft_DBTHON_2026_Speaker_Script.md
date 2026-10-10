# SkillCraft DBTHON 2026 — speaker script

Read each section while its matching slide is on screen. The live demonstration on slide 14 includes time for the on-screen actions.

## Slide 1: SkillCraft

Good morning. We are presenting SkillCraft, a working prototype for finding and managing small local jobs. An employer posts a job, artisans offer a price, and one accepted offer becomes a contract. Our central idea is that each decision should leave a connected database record, so the original brief, competing offers, agreement, payment acknowledgments, and review can be traced later. Vedika, Bhavyaveer, and Anuj built this prototype for DBTHON 2026 under the guidance of Siva Sankari. I will show the user journey first, then the database rules that make the record dependable, and finally the evidence and remaining limits.

## Slide 2: The problem

Imagine arranging a repair job through calls and chat. A week later, the employer and worker may struggle to establish which price was accepted, whether another bidder was declined, or whether payment was acknowledged. SkillCraft gives local artisans a place to discover work and gives employers a structured way to compare offers. It stores the whole sequence as linked records instead of relying on scattered messages. This relates to Sustainable Development Goal 8 because access to work and a portable work history could matter economically. That is a design goal: we have not yet measured changes in earnings or access.

## Slide 3: The workflow

Here is one complete example using our seeded accounts, Ramesh the employer and Lakshmi the artisan. Ramesh posts a job with its skill, location, and budget. Lakshmi finds it and submits a bid. Ramesh accepts one offer; the job closes, competing pending bids are rejected, and one contract is created. For a new contract, Ramesh then records that payment was sent, and Lakshmi separately confirms receipt. Only after both actions is the contract marked paid and eligible for a review. When Ramesh reviews the work, the database updates Lakshmi's trust score. Each step remains connected to the original job.

## Slide 4: The two roles

The two accounts share the same underlying job, but they have different actions. Ramesh can post a brief, inspect offers on his own jobs, choose a worker, record payment sent, and review an eligible contract. Lakshmi can search open work, bid, follow the outcome, and confirm receipt on a contract awarded to her. This separation is more than a different menu. The API checks each user's role and ownership, and a restricted database role applies row-level rules to private bids, contracts, and events. For example, another employer cannot inspect or accept bids on Ramesh's job.

## Slide 5: The architecture

This diagram separates what the visitor sees from where the workflow rules live. React and Vite provide the pages and forms. The Express API authenticates requests and checks who is allowed to perform an action. The relational database stores linked records and enforces key rules with constraints, transactions, functions, triggers, and policies. Our local connected preview runs the PostgreSQL-compatible schema in PGlite, which makes the demo self-contained. The Docker setup specifies PostgreSQL 15, but we do not treat a local PGlite result as a native PostgreSQL performance result. The next slide shows the tables behind this architecture.

## Slide 6: The ER model

Read this diagram from the shared USERS table. An artisan profile belongs to a user, while each GIG_POSTINGS row identifies its employer. A job can receive many GIG_APPLICATIONS, but an artisan can bid only once on that job. Accepting an application causes a database trigger to create one COMPLETION_CONTRACTS row for the job and select that artisan. A contract can have one RATINGS_REVIEWS row and many CONTRACT_EVENTS rows. The events preserve the sequence of contract actions. Primary and foreign keys keep the relationships valid; the unique contract-per-job rule prevents a second agreement for the same job. The full model contains seven tables.

## Slide 7: Integrity under competing actions

The hardest moment is when two offers for one job are accepted close together. Our API processes acceptance in a serializable transaction and locks the job row before checking that it is still open. The database trigger closes the job, rejects other pending bids, and creates the contract. A unique constraint on the contract's job ID adds another barrier to a second winner. Amount and status checks reject invalid records, while payment functions enforce the two acknowledgment steps. Our local tests confirm the one-winner behavior in PGlite. Native PostgreSQL server concurrency still needs a separate run, so we do not claim measured throughput here.

## Slide 8: Payment and event history

A single paid flag loses an important distinction: who said that payment happened? For new SkillCraft contracts, the employer first records payment sent. The selected artisan then confirms receipt. The contract changes to paid only after both timestamps exist, and database triggers append events identifying the action and actor. Those event rows cannot be edited or deleted through the supported database path. This is an auditable sequence of user claims, not proof of a bank transfer. Earlier sample contracts that were already paid remain visibly marked as legacy; the migration does not invent an artisan confirmation that never happened.

## Slide 9: Trust score

Reviews are connected to contracts, and a new contract must be paid before it can be reviewed. We then recalculate the artisan's stored score from eligible reviews. The formula starts with the equivalent of three virtual reviews at three and a half stars, so one new five-star review produces about 3.88, not a perfect five. This reduces the swing from a single early review. A database trigger runs the calculation after a review is inserted, keeping the displayed score in step with the record. The prior is a deliberate design choice; we have not tested whether it improves fairness or predicts future work quality.

## Slide 10: Search and privacy

SkillCraft also uses the database for discovery. Search can filter jobs or artisans by skill and match location or keywords using indexed queries. A simple fit score gives two points for the same skill and one for the same city, for a total from zero to three. Anyone can inspect why a result ranked where it did; this is a rule, not an AI prediction. For private data, the API uses a restricted database role and passes the signed-in identity to row-level policies. Public reputation comes through limited views, while private bids, contracts, events, and account fields have narrower access.

## Slide 11: Validation

We separate three kinds of evidence. Schema and API tests exercise the job-to-review journey, ownership rules, contract events, and payment transition against fresh PGlite databases. A separate Jest suite has twenty CRUD cases and four integrity or concurrent-acceptance cases, also on PGlite. The two browser checks cover interface behavior in visual demo mode, so they do not prove a live database connection. Together, these checks support functional behavior in a controlled local setup. They do not establish a search speed-up, ranking quality, native PostgreSQL concurrency, or social impact. Those claims need a baseline, repeatable dataset, measurements, and a native server run.

## Slide 12: Rubric criteria one to four

The first four rubric lines total eighteen available marks; these are criteria, not points already awarded to us. For the problem and domain, we show the broken chat-based workflow and the two user roles. For database design, we show the seven-table ER model, keys, constraints, and normalization rationale. For DBMS depth, we can point to the acceptance transaction, trigger, views, indexes, and row policies in the SQL. For innovation, the clearest evidence is the two-party payment sequence and append-only contract history. If the panel asks for proof, we can move from each claim to a table, SQL rule, or live action.

## Slide 13: Rubric criteria five to eight

The remaining four criteria total twelve available marks. On novelty, our comparison is with a simple employer-only paid flag and a plain review average; it is a design comparison, not a measured market advantage. On SDG alignment, we can explain the intended route to fairer access and portable history, while acknowledging that outcomes are unmeasured. On validation, we have passing functional tests but still need a native PostgreSQL benchmark and labeled matching examples. On readiness, we can run a two-account local demonstration, but there has been no field pilot. Matching each claim to its present evidence is how we intend to answer the panel fairly.

## Slide 14: Connected live demonstration

Now I will use the connected preview with two seeded accounts. As Ramesh, I post a new job with a distinctive title and budget. I switch to Lakshmi, search for that job, and submit a bid. Back as Ramesh, I accept her offer; we can see the job close and one contract appear. I record payment sent, then switch to Lakshmi to confirm receipt. The contract becomes paid, so Ramesh can leave a review. Finally, I show the event sequence and updated trust score. This is the actual API and database path, not the browser-only visual demo. I will pause at each transition to show the record it produced.

## Slide 15: Likely panel questions

Three questions deserve direct answers. First, can two artisans both win one job? The transaction, job-row lock, trigger, and unique contract rule work together to prevent that outcome; our local test checks it, and a native server run remains. Second, does paid mean money was verified? No. It means the employer reported sending payment and the artisan reported receiving it. Third, where is the measured improvement? We have not claimed one. We still need a defined baseline, enough data, repeated native PostgreSQL queries, and labeled examples for ranking quality. These limits help keep the prototype's claims precise.

## Slide 16: Conclusion

SkillCraft's contribution is a connected, enforceable record of a local job: the brief, every bid, one chosen worker, a contract, two payment acknowledgments, and a review. The working prototype demonstrates this through two roles and seven related tables. The database carries the important guarantees, including one contract per job, ownership rules, append-only events, and automatic trust-score updates. The next work is to measure search performance and match quality on a defined baseline, repeat security and concurrency checks on native PostgreSQL, and learn from a real pilot. SkillCraft records user claims about payment; it does not transfer or independently verify money. Thank you; we welcome questions.
