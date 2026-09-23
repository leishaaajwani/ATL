-- ATL Nexus :: reference data
-- Subjects, academic year, ATL categories, structured reflection prompts.

INSERT INTO academic_years (label, is_current) VALUES ('2026-27', 1);

INSERT INTO subjects (name, ib_group) VALUES
  ('English Literature', 1),
  ('English Language and Literature', 1),
  ('Theory of Knowledge', NULL),
  ('German Ab Initio', 2),
  ('French Ab Initio', 2),
  ('Hindi B', 2),
  ('Spanish Ab Initio', 2),
  ('Spanish B', 2),
  ('French B', 2),
  ('Business Management', 3),
  ('Digital Society', 3),
  ('Social and Cultural Anthropology HL', 3),
  ('Psychology', 3),
  ('Economics', 3),
  ('Global Politics', 3),
  ('History', 3),
  ('Geography', 3),
  ('Chemistry', 4),
  ('Computer Science', 4),
  ('Environmental Systems and Societies SL', 4),
  ('Biology', 4),
  ('Physics', 4),
  ('Sports, Health and Exercise Science', 4),
  ('Math AA', 5),
  ('Math AI', 5),
  ('Music', 6),
  ('Visual Arts', 6);

INSERT INTO atl_categories (name, colour, bg_colour, sort_order) VALUES
  ('Thinking',        '#123a8a', '#e1e9f8', 1),
  ('Communication',   '#a67c1f', '#fbf3e3', 2),
  ('Research',        '#1a4aa8', '#f2f6fc', 3),
  ('Social',          '#0f766e', '#ecfdf5', 4),
  ('Self-management', '#b45309', '#fff7ed', 5);

-- Structured prompts. These replace the single free-text box.
-- Total minimum lands near 120 words but split into comparable answers.
INSERT INTO reflection_prompts (sequence, question, helper, min_words) VALUES
  (1, 'Which sub-skill did you rely on most in this unit, and where specifically did you use it?',
      'Name the task, lesson or assessment. Be concrete rather than general.', 40),
  (2, 'Describe one moment in this unit where this skill was difficult. What did you actually do about it?',
      'Describe the difficulty and your response, not just the outcome.', 50),
  (3, 'What will you do differently in the next unit?',
      'One specific change you intend to make, not a general aspiration.', 30);
