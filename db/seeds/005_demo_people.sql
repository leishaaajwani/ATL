-- ATL Nexus :: demo people
--
-- Entirely fictional. Real staff and students are never committed to this
-- repository, so anyone setting up a copy starts with invented accounts and
-- adds their own school through the admin interface.
--
-- Emails use example.edu, which cannot receive mail and cannot be signed in to,
-- so this data is only reachable through the local DEV_LOGIN_AS bypass.
--
-- Covers what a reviewer needs to see: one admin, two teachers, three students,
-- both programmes, Chemistry and Math AI written out, and a reflection sitting
-- in each state of the approval loop.

SET @yr := (SELECT id FROM academic_years WHERE is_current = 1);

-- ── People ──────────────────────────────────────────────────────────────────
INSERT INTO users (email, full_name, role, status, google_sub, first_login_at) VALUES
  ('coordinator@example.edu', 'Amara Osei',     'admin',   'active', 'demo-admin-1',   NOW()),
  ('r.mehta@example.edu',     'Rohan Mehta',    'teacher', 'active', 'demo-teacher-1', NOW()),
  ('f.haddad@example.edu',    'Farah Haddad',   'teacher', 'active', 'demo-teacher-2', NOW()),
  ('j.okafor@example.edu',    'Jamal Okafor',   'student', 'active', 'demo-student-1', NOW()),
  ('l.moreau@example.edu',    'Lucie Moreau',   'student', 'active', 'demo-student-2', NOW()),
  ('s.tanaka@example.edu',    'Sora Tanaka',    'student', 'active', 'demo-student-3', NOW());

SET @admin := (SELECT id FROM users WHERE email = 'coordinator@example.edu');
SET @rohan := (SELECT id FROM users WHERE email = 'r.mehta@example.edu');
SET @farah := (SELECT id FROM users WHERE email = 'f.haddad@example.edu');
SET @jamal := (SELECT id FROM users WHERE email = 'j.okafor@example.edu');
SET @lucie := (SELECT id FROM users WHERE email = 'l.moreau@example.edu');
SET @sora  := (SELECT id FROM users WHERE email = 's.tanaka@example.edu');

INSERT INTO teacher_profiles (user_id, staff_id, department) VALUES
  (@rohan, 'T-2041', 'Sciences'),
  (@farah, 'T-2088', 'Mathematics');

INSERT INTO student_profiles (user_id, student_code, grade) VALUES
  (@jamal, 'S-11042', 'DP1'),
  (@lucie, 'S-11077', 'DP1'),
  (@sora,  'S-09310', 'MYP4');

-- ── Classes ─────────────────────────────────────────────────────────────────
SET @chem := (SELECT id FROM subjects WHERE name = 'Chemistry');
SET @math := (SELECT id FROM subjects WHERE name = 'Math AI');

INSERT INTO sections (subject_id, teacher_id, grade, label, academic_year_id) VALUES
  (@chem, @rohan, 'DP1',  '', @yr),
  (@chem, @rohan, 'MYP4', '', @yr),
  (@math, @farah, 'DP1',  '', @yr);

SET @chemDP  := (SELECT id FROM sections WHERE subject_id = @chem AND grade = 'DP1');
SET @chemMYP := (SELECT id FROM sections WHERE subject_id = @chem AND grade = 'MYP4');
SET @mathDP  := (SELECT id FROM sections WHERE subject_id = @math AND grade = 'DP1');

-- Two confirmed, one still waiting, so the teacher has something to approve.
INSERT INTO enrollments (section_id, student_id, status, source, approved_at, approved_by) VALUES
  (@chemDP,  @jamal, 'active',  'teacher_added', NOW(), @rohan),
  (@chemDP,  @lucie, 'pending', 'self_request',  NULL,  NULL),
  (@mathDP,  @jamal, 'active',  'teacher_added', NOW(), @farah),
  (@chemMYP, @sora,  'active',  'teacher_added', NOW(), @rohan);

-- ── Units ───────────────────────────────────────────────────────────────────
INSERT INTO units (section_id, term, name, description, min_subskills_required) VALUES
  (@chemDP,  'Term 1', 'Stoichiometry and the Mole',    'Quantitative chemistry and the reacting-mass calculations that follow from it.', 3),
  (@chemDP,  'Term 2', 'Energetics and Thermodynamics', 'Enthalpy, entropy, and what makes a reaction go.', 3),
  (@chemMYP, 'Term 1', 'Separating Mixtures',           'Filtration, distillation and chromatography in the lab.', 2),
  (@mathDP,  'Term 1', 'Linear Programming',            'Modelling constraints and optimising a real situation.', 3);

-- Tag each unit with sub-skills valid for its own subject and programme.
INSERT INTO unit_subskills (unit_id, subskill_id)
SELECT u.id, ss.id
  FROM units u
  JOIN sections s       ON s.id = u.section_id
  JOIN atl_subskills ss ON ss.subject_id = s.subject_id
                       AND ss.programme  = IF(s.grade LIKE 'MYP%', 'MYP', 'DP')
 WHERE ss.id IN (
   SELECT id FROM (
     SELECT ss2.id,
            ROW_NUMBER() OVER (PARTITION BY ss2.subject_id, ss2.programme, ss2.category_id
                               ORDER BY ss2.id) AS rn
       FROM atl_subskills ss2 WHERE ss2.subject_id IS NOT NULL
   ) ranked WHERE rn <= 3
 );

-- ── One reflection in each state of the loop ────────────────────────────────
SET @unitStoich := (SELECT id FROM units WHERE name = 'Stoichiometry and the Mole');
SET @unitLP     := (SELECT id FROM units WHERE name = 'Linear Programming');

-- Approved
INSERT INTO reflections (unit_id, student_id, status, submitted_at, reviewed_at, reviewed_by, teacher_feedback)
VALUES (@unitStoich, @jamal, 'approved', NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 4 DAY, @rohan,
        'Good, specific evidence. The uncertainty work is exactly what I was looking for.');
SET @rApproved := LAST_INSERT_ID();

INSERT INTO reflection_subskills (reflection_id, subskill_id, self_level, evidence_note)
SELECT @rApproved, us.subskill_id, 'Proficient',
       'Used this during the titration practical in week 3.'
  FROM unit_subskills us WHERE us.unit_id = @unitStoich LIMIT 3;

INSERT INTO reflection_answers (reflection_id, prompt_id, answer_text, word_count)
SELECT @rApproved, p.id,
       CONCAT('Demo answer for the prompt "', p.question, '". In a real entry this is where the student writes ',
              p.min_words, ' words or more about what they actually did in the unit, naming the lesson or task ',
              'rather than describing the skill in general terms, so the teacher can picture it and mark it fairly.'),
       p.min_words + 6
  FROM reflection_prompts p WHERE p.is_active = 1;

INSERT INTO reflection_events (reflection_id, event, actor_id, note) VALUES
  (@rApproved, 'submitted', @jamal, NULL),
  (@rApproved, 'approved',  @rohan, 'Good, specific evidence.');

-- Returned, so the revision path is visible
INSERT INTO reflections (unit_id, student_id, status, submitted_at, reviewed_at, reviewed_by, teacher_feedback)
VALUES (@unitLP, @jamal, 'returned', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY, @farah,
        'Your second answer describes the skill rather than what you did. Which lesson was it?');
SET @rReturned = LAST_INSERT_ID();

INSERT INTO reflection_subskills (reflection_id, subskill_id, self_level, evidence_note)
SELECT @rReturned, us.subskill_id, 'Developing',
       'Set up the constraints for the delivery-route task.'
  FROM unit_subskills us WHERE us.unit_id = @unitLP LIMIT 3;

INSERT INTO reflection_answers (reflection_id, prompt_id, answer_text, word_count)
SELECT @rReturned, p.id,
       CONCAT('Demo answer for "', p.question, '". This one was sent back, so the student can edit it in place ',
              'and resubmit against the same unit rather than starting a new entry somewhere else.'),
       p.min_words + 2
  FROM reflection_prompts p WHERE p.is_active = 1;

INSERT INTO reflection_events (reflection_id, event, actor_id, note) VALUES
  (@rReturned, 'submitted', @jamal, NULL),
  (@rReturned, 'returned',  @farah, 'Second answer describes the skill rather than what you did.');

-- Teacher ratings on the approved one, so Reports and Analytics have data
INSERT INTO unit_ratings (unit_id, student_id, subskill_id, level, rated_by)
SELECT @unitStoich, @jamal, rs.subskill_id,
       ELT(1 + (rs.subskill_id % 3), 'Developing', 'Proficient', 'Advanced'), @rohan
  FROM reflection_subskills rs WHERE rs.reflection_id = @rApproved;

INSERT INTO term_reports (student_id, section_id, term, summary_comment, published_at, published_by)
VALUES (@jamal, @chemDP, 'Term 1',
        'Strong practical work. Next term, push the evaluation further.', NOW(), @rohan);
