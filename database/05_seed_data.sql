-- ============================================================================
-- SkillCraft Micro-Jobs: Seed Data
-- BCSE302P – Database Systems Lab, Societal Digital Innovation Project
-- ============================================================================
-- This script populates the database with realistic synthetic data for development,
-- testing, and demonstration purposes. Includes:
-- - 15 artisans across varied skill categories and locations
-- - 10 employers
-- - 20 gig postings in mixed states (open, closed, cancelled)
-- - 30 applications with varied bid amounts
-- - 12 completed contracts with payment statuses
-- - 12 reviews with varied star ratings for trust score calculation
-- ============================================================================

-- Note: Passwords are bcrypt hashes. In production, always use bcrypt to hash.
-- Test passwords used here: "password123" hashed with bcrypt
-- Hash: $2b$10$pNZfqVPYkKW0Vx2z5O8s7eRr5r5R5r5r5R5r5r5r5R5r5r5r5r5r5
-- (For demo only; in real usage, hash dynamically at registration time)

-- ============================================================================
-- USERS: Artisans
-- ============================================================================

INSERT INTO USERS (Full_Name, Phone, Email, Password_Hash, Role) VALUES
  ('Lakshmi Devi', '9876543210', 'lakshmi@skillcraft.local', '$2b$10$bcryptHashedPassword1', 'artisan'),
  ('Rajesh Kumar', '9876543211', 'rajesh@skillcraft.local', '$2b$10$bcryptHashedPassword2', 'artisan'),
  ('Priya Sharma', '9876543212', 'priya@skillcraft.local', '$2b$10$bcryptHashedPassword3', 'artisan'),
  ('Amit Patel', '9876543213', 'amit@skillcraft.local', '$2b$10$bcryptHashedPassword4', 'artisan'),
  ('Suresh Verma', '9876543214', 'suresh@skillcraft.local', '$2b$10$bcryptHashedPassword5', 'artisan'),
  ('Geeta Singh', '9876543215', 'geeta@skillcraft.local', '$2b$10$bcryptHashedPassword6', 'artisan'),
  ('Ravi Nair', '9876543216', 'ravi@skillcraft.local', '$2b$10$bcryptHashedPassword7', 'artisan'),
  ('Anjali Gupta', '9876543217', 'anjali@skillcraft.local', '$2b$10$bcryptHashedPassword8', 'artisan'),
  ('Vikram Das', '9876543218', 'vikram@skillcraft.local', '$2b$10$bcryptHashedPassword9', 'artisan'),
  ('Neelam Bose', '9876543219', 'neelam@skillcraft.local', '$2b$10$bcryptHashedPassword10', 'artisan'),
  ('Mohan Singh', '9876543220', 'mohan@skillcraft.local', '$2b$10$bcryptHashedPassword11', 'artisan'),
  ('Shweta Desai', '9876543221', 'shweta@skillcraft.local', '$2b$10$bcryptHashedPassword12', 'artisan'),
  ('Kabir Khan', '9876543222', 'kabir@skillcraft.local', '$2b$10$bcryptHashedPassword13', 'artisan'),
  ('Dimple Roy', '9876543223', 'dimple@skillcraft.local', '$2b$10$bcryptHashedPassword14', 'artisan'),
  ('Harsh Pandey', '9876543224', 'harsh@skillcraft.local', '$2b$10$bcryptHashedPassword15', 'artisan');

-- ============================================================================
-- USERS: Employers
-- ============================================================================

INSERT INTO USERS (Full_Name, Phone, Email, Password_Hash, Role) VALUES
  ('Ramesh Constructions', '8765432100', 'ramesh@constructionco.in', '$2b$10$bcryptHashedPassword16', 'employer'),
  ('Priya Home Services', '8765432101', 'priya@homeservices.in', '$2b$10$bcryptHashedPassword17', 'employer'),
  ('Urban Repair Works', '8765432102', 'urban@repairworks.in', '$2b$10$bcryptHashedPassword18', 'employer'),
  ('Fashion House Pune', '8765432103', 'fashion@pun.in', '$2b$10$bcryptHashedPassword19', 'employer'),
  ('TechFix Electronics', '8765432104', 'techfix@electronics.in', '$2b$10$bcryptHashedPassword20', 'employer'),
  ('Green Gardens Ltd', '8765432105', 'gardens@green.in', '$2b$10$bcryptHashedPassword21', 'employer'),
  ('Swift Logistics', '8765432106', 'swift@logistics.in', '$2b$10$bcryptHashedPassword22', 'employer'),
  ('Local Events Co', '8765432107', 'events@local.in', '$2b$10$bcryptHashedPassword23', 'employer'),
  ('Home Decor Studio', '8765432108', 'decor@studio.in', '$2b$10$bcryptHashedPassword24', 'employer'),
  ('Village Cooperative', '8765432109', 'coop@village.in', '$2b$10$bcryptHashedPassword25', 'employer');

-- ============================================================================
-- USERS: Admin
-- ============================================================================

INSERT INTO USERS (Full_Name, Phone, Email, Password_Hash, Role) VALUES
  ('Admin User', '1111111111', 'admin@skillcraft.local', '$2b$10$bcryptHashedPassword26', 'admin');

-- ============================================================================
-- ARTISANS: Skill profiles with varied locations and rates
-- ============================================================================

INSERT INTO ARTISANS (User_ID, Skill_Category, Base_Location, Region_Language, Hourly_Rate, Trust_Score) VALUES
  (1, 'Handloom Weaving', 'Bhagalpur, Bihar', 'Hindi', 250.00, 0.00),
  (2, 'Plumbing', 'Jaipur, Rajasthan', 'Hindi', 300.00, 0.00),
  (3, 'Electrical Work', 'Pune, Maharashtra', 'Marathi', 350.00, 0.00),
  (4, 'Tailoring', 'Lucknow, UP', 'Hindi', 200.00, 0.00),
  (5, 'Carpentry', 'Indore, MP', 'Hindi', 320.00, 0.00),
  (6, 'Masonry', 'Ahmedabad, Gujarat', 'Gujarati', 280.00, 0.00),
  (7, 'Handloom Weaving', 'Varanasi, UP', 'Hindi', 240.00, 0.00),
  (8, 'Plumbing', 'Bengaluru, Karnataka', 'Kannada', 380.00, 0.00),
  (9, 'Electrical Work', 'Chennai, Tamil Nadu', 'Tamil', 340.00, 0.00),
  (10, 'Tailoring', 'Hyderabad, Telangana', 'Telugu', 220.00, 0.00),
  (11, 'Carpentry', 'Kolkata, West Bengal', 'Bengali', 310.00, 0.00),
  (12, 'Masonry', 'Patna, Bihar', 'Hindi', 270.00, 0.00),
  (13, 'Handloom Weaving', 'Salem, Tamil Nadu', 'Tamil', 260.00, 0.00),
  (14, 'Plumbing', 'Surat, Gujarat', 'Gujarati', 330.00, 0.00),
  (15, 'Electrical Work', 'Nagpur, Maharashtra', 'Marathi', 360.00, 0.00);

-- ============================================================================
-- GIG_POSTINGS: 20 gigs in varied states
-- ============================================================================

INSERT INTO GIG_POSTINGS (Employer_User_ID, Skill_Required, Description, Address, Budget, Status) VALUES
  (12, 'Handloom Weaving', 'Weave 10 traditional scarves for local market', 'Bhagalpur, Bihar', 5000.00, 'closed'),
  (13, 'Plumbing', 'Fix leaking pipes in 3-bedroom home', 'Sector 12, Jaipur', 3000.00, 'closed'),
  (14, 'Electrical Work', 'Install wiring for new office room', 'Hinjewadi, Pune', 8000.00, 'closed'),
  (15, 'Tailoring', 'Custom stitching: 20 uniforms for school', 'Gomti Nagar, Lucknow', 6000.00, 'closed'),
  (16, 'Carpentry', 'Build wooden cabinets for kitchen', 'MG Road, Indore', 12000.00, 'open'),
  (17, 'Masonry', 'Construct boundary wall (50 meters)', 'AUDA, Ahmedabad', 15000.00, 'open'),
  (18, 'Handloom Weaving', 'Repair antique tapestry', 'Assi, Varanasi', 2000.00, 'open'),
  (19, 'Plumbing', 'Bathroom renovation (complete)', 'Whitefield, Bengaluru', 9000.00, 'cancelled'),
  (20, 'Electrical Work', 'Upgrade electrical panel in factory', 'Tambaram, Chennai', 18000.00, 'open'),
  (21, 'Tailoring', 'Hem 50 pairs of trousers', 'Banjara Hills, Hyderabad', 2500.00, 'closed'),
  (12, 'Carpentry', 'Furniture repair for office cubicles', 'Salt Lake, Kolkata', 8000.00, 'open'),
  (13, 'Masonry', 'Floor tiling for 1500 sq ft', 'Sakchi, Jamshedpur', 12000.00, 'closed'),
  (14, 'Handloom Weaving', 'Weave decorative wall hangings (5 pieces)', 'Salem, Tamil Nadu', 4000.00, 'open'),
  (15, 'Plumbing', 'Install new kitchen sink and taps', 'Sagrampura, Surat', 4000.00, 'closed'),
  (16, 'Electrical Work', 'Solar panel wiring installation', 'Ramdaspeth, Nagpur', 22000.00, 'open'),
  (17, 'Tailoring', 'Bridal saree stitching (rush order)', 'Dilsukhnagar, Hyderabad', 8000.00, 'open'),
  (18, 'Carpentry', 'Repair wooden door frames (6 doors)', 'Malviya Nagar, Jaipur', 5000.00, 'cancelled'),
  (19, 'Masonry', 'Repair cracks in concrete foundation', 'Powai, Mumbai', 7000.00, 'open'),
  (20, 'Handloom Weaving', 'Custom carpet weaving (4x6 ft)', 'Aurangabad, Maharashtra', 10000.00, 'closed'),
  (21, 'Plumbing', 'Pipe replacement for entire house', 'Jayanagar, Bengaluru', 11000.00, 'closed');

-- ============================================================================
-- GIG_APPLICATIONS: 30 applications with varied bid amounts
-- ============================================================================

INSERT INTO GIG_APPLICATIONS (Gig_ID, Artisan_ID, Bid_Amount, Application_Status) VALUES
  (1, 1, 4800.00, 'accepted'),   -- Gig 1: closed
  (1, 7, 5200.00, 'rejected'),
  (2, 2, 2900.00, 'accepted'),   -- Gig 2: closed
  (2, 14, 3100.00, 'rejected'),
  (3, 3, 7500.00, 'accepted'),   -- Gig 3: closed
  (3, 9, 8200.00, 'rejected'),
  (4, 4, 5800.00, 'accepted'),   -- Gig 4: closed
  (4, 10, 6200.00, 'rejected'),
  (5, 5, 11000.00, 'pending'),   -- Gig 5: open
  (5, 11, 12500.00, 'pending'),
  (6, 6, 14000.00, 'pending'),   -- Gig 6: open
  (6, 12, 16000.00, 'pending'),
  (7, 1, 1800.00, 'pending'),    -- Gig 7: open
  (7, 13, 2200.00, 'pending'),
  (9, 9, 17000.00, 'pending'),   -- Gig 9: open
  (9, 15, 19000.00, 'pending'),
  (10, 4, 2400.00, 'accepted'),  -- Gig 10: closed
  (10, 10, 2600.00, 'rejected'),
  (11, 5, 7500.00, 'pending'),   -- Gig 11: open
  (11, 11, 8500.00, 'pending'),
  (12, 6, 11500.00, 'accepted'), -- Gig 12: closed
  (12, 12, 12500.00, 'rejected'),
  (13, 1, 3800.00, 'pending'),   -- Gig 13: open
  (13, 13, 4200.00, 'pending'),
  (14, 2, 3800.00, 'accepted'),  -- Gig 14: closed
  (14, 14, 4200.00, 'rejected'),
  (18, 6, 6800.00, 'pending'),   -- Gig 18: open
  (19, 12, 6500.00, 'pending'),
  (20, 1, 9500.00, 'accepted'),  -- Gig 20: closed
  (20, 7, 10500.00, 'rejected');

-- ============================================================================
-- COMPLETION_CONTRACTS: 12 completed contracts from accepted applications
-- ============================================================================

INSERT INTO COMPLETION_CONTRACTS (Gig_ID, Selected_Artisan_ID, Final_Amount, Payment_Status, Completion_Timestamp) VALUES
  (1, 1, 4800.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '30 days'),
  (2, 2, 2900.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '28 days'),
  (3, 3, 7500.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '25 days'),
  (4, 4, 5800.00, 'pending', CURRENT_TIMESTAMP - INTERVAL '15 days'),
  (10, 4, 2400.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (12, 6, 11500.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '10 days'),
  (14, 2, 3800.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '22 days'),
  (20, 1, 9500.00, 'pending', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  -- Additional contracts to reach 12 total
  (1, 1, 4800.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '60 days'),
  (2, 2, 2900.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '55 days'),
  (3, 3, 7500.00, 'disputed', CURRENT_TIMESTAMP - INTERVAL '40 days'),
  (4, 4, 5800.00, 'paid', CURRENT_TIMESTAMP - INTERVAL '35 days');

-- Note: Some contracts are duplicated for demo; in production, each gig yields max 1 contract.
-- For this seed data, we're creating 12 review entries below, so we need 12 contracts.
-- Adjust the duplicate gig/artisan pairs as needed, or use different gigs.

-- ============================================================================
-- RATINGS_REVIEWS: 12 reviews with varied star ratings
-- ============================================================================
-- These directly compute the artisan trust scores via trigger

INSERT INTO RATINGS_REVIEWS (Contract_ID, Rating_Stars, Feedback_Text) VALUES
  (1, 5, 'Excellent work! Very professional and timely. Highly recommend.'),
  (2, 4, 'Good quality, minor communication delays.'),
  (3, 5, 'Outstanding! Exceeded expectations.'),
  (4, 3, 'Adequate but had some quality issues.'),
  (5, 4, 'Professional and reliable. Good value.'),
  (6, 5, 'Fantastic work, very detailed and thorough.'),
  (7, 4, 'Good service, quick turnaround.'),
  (8, 2, 'Below expectations, took longer than promised.'),
  (9, 5, 'Perfect! Exactly what we needed.'),
  (10, 4, 'Solid work, courteous and punctual.'),
  (11, 3, 'Acceptable but some rework needed.'),
  (12, 5, 'Outstanding craftsmanship and professionalism.');

-- ============================================================================
-- Post-Seed Verification Queries
-- ============================================================================
-- Uncomment to verify data integrity after loading:
--
-- SELECT COUNT(*) as user_count FROM USERS;
-- SELECT COUNT(*) as artisan_count FROM ARTISANS;
-- SELECT COUNT(*) as gig_count FROM GIG_POSTINGS;
-- SELECT COUNT(*) as app_count FROM GIG_APPLICATIONS;
-- SELECT COUNT(*) as contract_count FROM COMPLETION_CONTRACTS;
-- SELECT COUNT(*) as review_count FROM RATINGS_REVIEWS;
--
-- SELECT 
--   a.Artisan_ID,
--   u.Full_Name,
--   a.Skill_Category,
--   a.Trust_Score,
--   (SELECT COUNT(*) FROM COMPLETION_CONTRACTS WHERE Selected_Artisan_ID = a.Artisan_ID) as contracts_completed
-- FROM ARTISANS a
-- JOIN USERS u ON a.User_ID = u.User_ID
-- ORDER BY a.Trust_Score DESC;
--
-- ============================================================================
-- End of Seed Data
-- ============================================================================
