-- ATL Nexus :: warmer prompt wording
--
-- The first pass read like a rubric. These are the same three questions asked
-- the way a teacher would actually ask them, out loud, to a fifteen year old.

UPDATE reflection_prompts SET
  question = 'Which of these did you lean on most, and where?',
  helper   = 'Point to a real lesson or task. "Throughout the unit" is hard for your teacher to picture.',
  min_words = 40
WHERE sequence = 1;

UPDATE reflection_prompts SET
  question = 'When did it get difficult, and what did you do about it?',
  helper   = 'The bit you found hard is usually the bit worth writing about.',
  min_words = 50
WHERE sequence = 2;

UPDATE reflection_prompts SET
  question = 'What would you do differently next time?',
  helper   = 'One thing you will actually change, not "work harder".',
  min_words = 30
WHERE sequence = 3;
