# Database Normalization Justification
## SkillCraft Micro-Jobs: Third Normal Form (3NF) Analysis

---

## Overview

The SkillCraft database schema consists of **six tables**, all normalized to **Third Normal Form (3NF)**. This document walks through each table, demonstrates its normalization, and explains the design decisions that keep the schema in 3NF while maintaining real-world applicability.

---

## Normalization Levels: Quick Recap

1. **1NF (First Normal Form)**: No repeating groups; all attributes atomic
2. **2NF (Second Normal Form)**: 1NF + No partial dependencies (non-key attrs depend on entire key)
3. **3NF (Third Normal Form)**: 2NF + No transitive dependencies (non-key attrs don't depend on other non-key attrs)

---

## Table-by-Table Analysis

### 1. **USERS Table**

#### Structure
```sql
USERS (
  User_ID SERIAL PRIMARY KEY,
  Full_Name VARCHAR(255) NOT NULL,
  Phone VARCHAR(20) NOT NULL UNIQUE,
  Email VARCHAR(255) UNIQUE,
  Password_Hash VARCHAR(255) NOT NULL,
  Role VARCHAR(20) NOT NULL CHECK (Role IN ('artisan','employer','admin')),
  Created_At TIMESTAMP,
  Updated_At TIMESTAMP
)
```

#### 1NF Check: ✓ PASS
- All attributes are atomic (no multi-valued or composite attributes)
- No repeating groups (e.g., no "PhoneNumbers" array or "Addresses" repeating row)

#### 2NF Check: ✓ PASS
- Primary key: User_ID (surrogate key)
- All non-key attributes depend on User_ID
- Example: Full_Name depends on User_ID (knows name when given user), not part of primary key
- No partial dependencies (single-column key eliminates this risk)

#### 3NF Check: ✓ PASS
- No non-key attribute depends on another non-key attribute
- Full_Name doesn't depend on Phone or Email
- Phone is independent attribute
- Role (artisan/employer) doesn't depend on Name or any other non-key field; it's independent
- **Conclusion: USERS is in 3NF**

#### Design Rationale: Why USERS Exists

**Original sketch** (from problem statement) had separate ARTISANS and EMPLOYERS tables without a shared USERS table:
```
ARTISANS (Artisan_ID, Name, Phone, ...)  -- password, login logic?
EMPLOYERS (Employer_ID, Name, Phone, ...) -- password, login logic?
```

**Problem**: Duplication of Name, Phone, Password_Hash, and login logic across two tables. Violates DRY principle and creates maintenance burden.

**Solution**: Extract shared identity into USERS table. Both artisans and employers reference USERS(User_ID):
```
USERS (User_ID, Name, Phone, Password_Hash, Role, ...)
ARTISANS (Artisan_ID, User_ID FK, Skill_Category, ...)
```

**Benefit**: Single login system, no duplicate credentials, cleaner 3NF design.

---

### 2. **ARTISANS Table**

#### Structure
```sql
ARTISANS (
  Artisan_ID SERIAL PRIMARY KEY,
  User_ID INTEGER NOT NULL UNIQUE,  -- FK to USERS
  Skill_Category VARCHAR(100),
  Base_Location VARCHAR(255),
  Region_Language VARCHAR(50),
  Hourly_Rate NUMERIC(10,2) CHECK (Hourly_Rate > 0),
  Trust_Score NUMERIC(3,2) CHECK (Trust_Score BETWEEN 0 AND 5),
  Created_At TIMESTAMP,
  Updated_At TIMESTAMP
)
```

#### 1NF Check: ✓ PASS
- All attributes atomic
- User_ID is a foreign key reference, not a repeating group

#### 2NF Check: ✓ PASS
- Primary key: Artisan_ID
- All non-key attributes depend on Artisan_ID (e.g., skill_category is the skill for this artisan)
- User_ID is also a foreign key; depends on Artisan_ID (each artisan record has exactly one user)

#### 3NF Check: ✓ PASS
- Skill_Category is independent (doesn't depend on other non-key attrs)
- Base_Location is independent
- Region_Language is independent
- Hourly_Rate is independent
- Trust_Score depends on Artisan_ID (computed from reviews, not from other attributes in this table)
- **No transitive dependency**: Skill_Category doesn't depend on Hourly_Rate, etc.
- **Conclusion: ARTISANS is in 3NF**

#### One-to-One Relationship with USERS
- UNIQUE constraint on User_ID enforces one-to-one: each artisan has exactly one USERS record
- Employer records don't have an EMPLOYERS table (they're just USERS with Role='employer')
- This asymmetry is intentional: only artisans need a skill profile

---

### 3. **GIG_POSTINGS Table**

#### Structure
```sql
GIG_POSTINGS (
  Gig_ID SERIAL PRIMARY KEY,
  Employer_User_ID INTEGER NOT NULL FK -> USERS,
  Skill_Required VARCHAR(100),
  Description TEXT,
  Address VARCHAR(255),
  Budget NUMERIC(10,2) CHECK (Budget > 0),
  Status VARCHAR(20) CHECK (Status IN ('open','closed','cancelled')) DEFAULT 'open',
  Posted_Date TIMESTAMP,
  Updated_At TIMESTAMP
)
```

#### 1NF Check: ✓ PASS
- All attributes atomic (no repeating groups, no multi-valued fields)

#### 2NF Check: ✓ PASS
- Primary key: Gig_ID
- All non-key attributes depend on Gig_ID
- Skill_Required depends on Gig_ID (each gig requires a specific skill)
- Budget depends on Gig_ID (each gig has a budget)
- Status depends on Gig_ID (each gig has a current status)

#### 3NF Check: ✓ PASS
- Skill_Required doesn't depend on Address or Budget
- Address doesn't depend on Skill_Required or Budget
- Budget doesn't depend on Address or Skill_Required
- Status doesn't depend on any other non-key attribute (it evolves independently)
- **Conclusion: GIG_POSTINGS is in 3NF**

---

### 4. **GIG_APPLICATIONS Table**

#### Structure
```sql
GIG_APPLICATIONS (
  Application_ID SERIAL PRIMARY KEY,
  Gig_ID INTEGER NOT NULL FK -> GIG_POSTINGS,
  Artisan_ID INTEGER NOT NULL FK -> ARTISANS,
  Bid_Amount NUMERIC(10,2) CHECK (Bid_Amount > 0),
  Application_Status VARCHAR(20) CHECK (...IN 'pending','accepted','rejected'),
  Applied_At TIMESTAMP,
  Updated_At TIMESTAMP,
  UNIQUE (Gig_ID, Artisan_ID)  -- each artisan bids once per gig
)
```

#### 1NF Check: ✓ PASS
- All attributes atomic
- No repeating groups

#### 2NF Check: ✓ PASS
- Primary key: Application_ID (surrogate key)
- Composite natural key would be (Gig_ID, Artisan_ID)
- All non-key attributes depend on Application_ID:
  - Bid_Amount: the amount bid by artisan on this gig
  - Application_Status: the status of *this* application
  - Applied_At: when *this* bid was submitted

#### 3NF Check: ✓ PASS
- Bid_Amount doesn't depend on Application_Status or vice versa (bid amount decided at time of bidding, status is just decision state)
- Applied_At is a timestamp, independent of other attrs
- No transitive dependency
- **Conclusion: GIG_APPLICATIONS is in 3NF**

#### **Critical Design Decision: Separation from COMPLETION_CONTRACTS**

This is the **key normalization insight** of the SkillCraft schema.

**Naive Design (Anti-pattern, violates 3NF):**
```sql
-- BAD: mixing bid negotiation with contract settlement
GIG_APPLICATIONS (
  Application_ID PK,
  Gig_ID FK,
  Artisan_ID FK,
  Bid_Amount,        -- what artisan offered
  Status,             -- pending/accepted/rejected
  Final_Amount,       -- only filled if accepted ← transitive dependency!
  Payment_Status,     -- only filled if accepted ← transitive dependency!
  Completion_Date,    -- only filled if completed ← transitive dependency!
)
```

**Problem**: 
- If Status='pending', then Final_Amount, Payment_Status, and Completion_Date are NULL
- These non-key attrs (Final_Amount, Payment_Status) transitively depend on Status
  - "Know Payment_Status only if you know Status='accepted' or 'paid'"
  - Violates 3NF: non-key attrs shouldn't depend on other non-key attrs

**SkillCraft Solution (3NF-compliant):**

1. **GIG_APPLICATIONS**: Tracks bid negotiation only
   - Application_ID, Gig_ID, Artisan_ID, Bid_Amount, Application_Status, Applied_At
   - Clean, no transitive deps; all attrs are about "this bid"

2. **COMPLETION_CONTRACTS**: Tracks settled work only
   - Contract_ID, Gig_ID, Selected_Artisan_ID, Final_Amount, Payment_Status, Completion_Timestamp
   - Clean, no transitive deps; all attrs are about "this settled contract"

**Benefit**: 
- Each table has a single, well-defined purpose
- No NULL columns; if a contract doesn't exist, the COMPLETION_CONTRACTS row doesn't exist
- 3NF maintained
- Queries are clearer: "Show pending bids" vs. "Show settled contracts"

---

### 5. **COMPLETION_CONTRACTS Table**

#### Structure
```sql
COMPLETION_CONTRACTS (
  Contract_ID SERIAL PRIMARY KEY,
  Gig_ID INTEGER NOT NULL FK -> GIG_POSTINGS,
  Selected_Artisan_ID INTEGER NOT NULL FK -> ARTISANS,
  Final_Amount NUMERIC(10,2) CHECK (Final_Amount > 0),
  Payment_Status VARCHAR(20) CHECK (...'pending','paid','disputed') DEFAULT 'pending',
  Completion_Timestamp TIMESTAMP,
  Created_At TIMESTAMP,
  Updated_At TIMESTAMP
)
```

#### 1NF Check: ✓ PASS
- All attributes atomic

#### 2NF Check: ✓ PASS
- Primary key: Contract_ID
- All non-key attrs depend on Contract_ID (this is the contract for a specific gig+artisan)

#### 3NF Check: ✓ PASS
- Final_Amount depends on Contract_ID (amount for *this* contract), not on Payment_Status
- Payment_Status depends on Contract_ID (status of *this* contract), not on Final_Amount
- Completion_Timestamp is independent
- **No transitive dependency**
- **Conclusion: COMPLETION_CONTRACTS is in 3NF**

---

### 6. **RATINGS_REVIEWS Table**

#### Structure
```sql
RATINGS_REVIEWS (
  Review_ID SERIAL PRIMARY KEY,
  Contract_ID INTEGER NOT NULL UNIQUE FK -> COMPLETION_CONTRACTS,
  Rating_Stars INTEGER NOT NULL CHECK (Rating_Stars BETWEEN 1 AND 5),
  Feedback_Text TEXT,
  Review_Date TIMESTAMP,
  Created_At TIMESTAMP
)
```

#### 1NF Check: ✓ PASS
- All attributes atomic
- Feedback_Text is a single text field, not repeating comments

#### 2NF Check: ✓ PASS
- Primary key: Review_ID
- All non-key attrs depend on Review_ID
- Rating_Stars: the rating for *this* review
- Feedback_Text: the feedback for *this* review
- Review_Date: when *this* review was created

#### 3NF Check: ✓ PASS
- Rating_Stars doesn't depend on Feedback_Text or vice versa
- Review_Date is independent
- **No transitive dependency**
- **Conclusion: RATINGS_REVIEWS is in 3NF**

#### UNIQUE Constraint on Contract_ID
- UNIQUE enforces one-to-one: each contract has at most one review
- Prevents duplicate ratings for the same work

---

## Cross-Table Normalization Check

### No Transitive Dependencies Across Tables

Example check:
- Artisan.Hourly_Rate doesn't depend on GIG_POSTINGS.Budget (independent tables)
- GIG_APPLICATIONS.Bid_Amount doesn't transitively depend on GIG_POSTINGS.Budget (independent, even though related)
- ARTISANS.Trust_Score doesn't depend on RATINGS_REVIEWS.Rating_Stars at table design level (computed by trigger, not stored dependency)

**Conclusion: No cross-table transitive dependencies found. Schema maintains 3NF integrity.**

---

## Summary: Why 3NF?

### Benefits Achieved

1. **Elimenation of Redundancy**: No data duplication (e.g., artisan name not stored in every application record)
2. **Update Anomalies Prevented**: Changing artisan skill category updates one ARTISANS row, not scattered copies
3. **Insertion Anomalies Prevented**: Can insert a gig without waiting for bids or contracts
4. **Deletion Anomalies Prevented**: Deleting a review doesn't orphan artisan or contract records
5. **Query Clarity**: Each table has clear purpose; joins are straightforward
6. **Trigger Logic Simplified**: Bid acceptance trigger updates GIG_POSTINGS and GIG_APPLICATIONS (not a messy combined table)

### Trade-offs

- **Slight increase in joins**: Queries often join USERS + ARTISANS, GIG_POSTINGS + GIG_APPLICATIONS, etc.
  - Mitigated by indexes and reasonable cardinalities
  - In the 10M+ row range, query optimization crucial; 3NF design actually enables faster indexing

---

## Conclusion

**SkillCraft database is rigorously normalized to 3NF.** The schema avoids:
- Repeating groups and multi-valued attributes (1NF issue) ✓
- Partial dependencies (2NF issue) ✓
- Transitive dependencies (3NF issue) ✓

The key insight—**separating GIG_APPLICATIONS (negotiation) from COMPLETION_CONTRACTS (settlement)**—is a textbook application of 3NF to a real-world problem. This design keeps the schema clean, efficient, and maintainable while supporting the complex business logic of artisan bidding, selection, contract management, and rating.

---

**Document Version**: 1.0  
**Date**: 31 August 2026  
**Course**: BCSE302P – Database Systems Lab, Societal Digital Innovation Project
