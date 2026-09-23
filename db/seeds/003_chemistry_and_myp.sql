-- ATL Nexus :: Chemistry in depth, plus the MYP layer
--
-- Chemistry is the worked example. Thinking and Communication are written
-- separately for MYP and DP, because what "thinking" asks of an MYP 2 student
-- (spot a pattern, suggest an improvement) is not what it asks of a DP student
-- (propagate uncertainty, deduce a mechanism from kinetic data).
--
-- Social, Self-management and most Research sub-skills stay generic and
-- programme-neutral: "planning and meeting deadlines" reads the same at every
-- age, and duplicating it per programme would only make the picker longer.

-- This seed REPLACES the Chemistry starter set from 002 rather than adding
-- alongside it, otherwise Chemistry ends up with two overlapping versions of
-- "designing an investigation". Only unreferenced rows are removed: anything a
-- teacher has already tagged on a unit, or a student has ticked, is left alone
-- and the new row simply sits next to it.
DELETE ss FROM atl_subskills ss
 WHERE ss.subject_id = (SELECT id FROM subjects WHERE name = 'Chemistry')
   AND ss.descriptor IS NULL
   AND ss.created_by IS NULL
   AND NOT EXISTS (SELECT 1 FROM unit_subskills       x WHERE x.subskill_id = ss.id)
   AND NOT EXISTS (SELECT 1 FROM reflection_subskills x WHERE x.subskill_id = ss.id)
   AND NOT EXISTS (SELECT 1 FROM unit_ratings         x WHERE x.subskill_id = ss.id);

SET @cat_think := (SELECT id FROM atl_categories WHERE name = 'Thinking');
SET @cat_comm  := (SELECT id FROM atl_categories WHERE name = 'Communication');
SET @cat_res   := (SELECT id FROM atl_categories WHERE name = 'Research');
SET @chem      := (SELECT id FROM subjects WHERE name = 'Chemistry');

-- ─────────────────────────────────────────────────────────────────────────────
-- Chemistry, DP. Replaces the five-per-category starter set with something a
-- DP teacher can actually map onto an IA or a paper-2 question.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO atl_subskills (category_id, subject_id, programme, name, descriptor) VALUES
  (@cat_think, @chem, 'DP', 'Designing an investigation with justified variables',
   'Choosing what to control and why, not just listing variables.'),
  (@cat_think, @chem, 'DP', 'Distinguishing systematic from random error',
   'Saying which kind of error a result shows, and what that implies.'),
  (@cat_think, @chem, 'DP', 'Propagating uncertainty through a calculation',
   'Carrying uncertainties correctly rather than quoting the instrument value.'),
  (@cat_think, @chem, 'DP', 'Applying bonding models to unfamiliar compounds',
   'Using structure and bonding to predict properties you have not been taught.'),
  (@cat_think, @chem, 'DP', 'Predicting feasibility from thermodynamic data',
   'Reasoning from enthalpy, entropy and free energy to whether a reaction goes.'),
  (@cat_think, @chem, 'DP', 'Deducing structure from spectral data',
   'Combining IR, MS and NMR evidence to argue for one structure over another.'),
  (@cat_think, @chem, 'DP', 'Deducing a mechanism from kinetic evidence',
   'Using rate data to rule mechanisms in or out.'),
  (@cat_think, @chem, 'DP', 'Explaining anomalies in periodic trends',
   'Accounting for where the trend breaks rather than restating the trend.');

INSERT INTO atl_subskills (category_id, subject_id, programme, name, descriptor) VALUES
  (@cat_comm, @chem, 'DP', 'Using IUPAC nomenclature and conventions',
   'Naming and formula conventions applied consistently.'),
  (@cat_comm, @chem, 'DP', 'Drawing curly-arrow mechanisms',
   'Arrows that start at electrons and end where they go.'),
  (@cat_comm, @chem, 'DP', 'Reporting to a precision the uncertainty supports',
   'Significant figures that match the measurement, not the calculator.'),
  (@cat_comm, @chem, 'DP', 'Structuring a full internal assessment report',
   'Research question through to evaluation, in the expected shape.'),
  (@cat_comm, @chem, 'DP', 'Choosing a graph that fits the relationship',
   'Including when a linearised plot is the honest choice.'),
  (@cat_comm, @chem, 'DP', 'Explaining at the particle level with diagrams',
   'Making the invisible step visible to the reader.'),
  (@cat_comm, @chem, 'DP', 'Citing sources in a scientific convention',
   'Consistent referencing of data sources and literature values.');

-- Research is mostly generic, but scientific sourcing genuinely differs at DP.
INSERT INTO atl_subskills (category_id, subject_id, programme, name, descriptor) VALUES
  (@cat_res, @chem, 'DP', 'Comparing a measured value against a literature value',
   'Finding a reliable accepted value and accounting for the difference.'),
  (@cat_res, @chem, 'DP', 'Judging whether a data source is appropriate',
   'Databases and handbooks over secondary summaries.');

-- ─────────────────────────────────────────────────────────────────────────────
-- Chemistry, MYP. Same categories, age-appropriate demands, MYP command terms.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO atl_subskills (category_id, subject_id, programme, name, descriptor) VALUES
  (@cat_think, @chem, 'MYP', 'Making a prediction and giving a scientific reason',
   'Not just what will happen, but why you think so.'),
  (@cat_think, @chem, 'MYP', 'Identifying the variables in an experiment',
   'What you change, what you measure, what you keep the same.'),
  (@cat_think, @chem, 'MYP', 'Spotting a pattern in your results',
   'Describing what the numbers do as one thing changes.'),
  (@cat_think, @chem, 'MYP', 'Suggesting an improvement to a method',
   'A specific change that would make the results more trustworthy.'),
  (@cat_think, @chem, 'MYP', 'Explaining a result using particle ideas',
   'Using atoms, molecules and ions to explain what you observed.'),
  (@cat_think, @chem, 'MYP', 'Comparing substances using their properties',
   'Grouping or separating materials by evidence rather than appearance.'),
  (@cat_think, @chem, 'MYP', 'Deciding whether a result looks reasonable',
   'Noticing when a number cannot be right, and saying why.');

INSERT INTO atl_subskills (category_id, subject_id, programme, name, descriptor) VALUES
  (@cat_comm, @chem, 'MYP', 'Writing a method someone else could follow',
   'Clear enough that another student could repeat it exactly.'),
  (@cat_comm, @chem, 'MYP', 'Drawing and labelling apparatus',
   'Standard scientific diagrams rather than pictures of glassware.'),
  (@cat_comm, @chem, 'MYP', 'Recording results in a table with units',
   'Headings, units and consistent decimal places.'),
  (@cat_comm, @chem, 'MYP', 'Choosing a suitable graph for the data',
   'Bar chart or line graph, and knowing which one this data needs.'),
  (@cat_comm, @chem, 'MYP', 'Using correct chemical symbols and formulae',
   'Capital letters, subscripts and balanced equations written properly.'),
  (@cat_comm, @chem, 'MYP', 'Explaining your findings to the class',
   'Saying what you found and what it means, out loud, to other people.'),
  (@cat_comm, @chem, 'MYP', 'Using scientific words correctly',
   'Precise terms instead of everyday ones where it matters.');

-- ─────────────────────────────────────────────────────────────────────────────
-- Generic MYP layer, so MYP classes in every other subject have something to
-- tag while their subject-specific sets are still being written.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO atl_subskills (category_id, subject_id, programme, name) VALUES
  (@cat_think, NULL, 'MYP', 'Asking a question worth investigating'),
  (@cat_think, NULL, 'MYP', 'Giving a reason for an answer'),
  (@cat_think, NULL, 'MYP', 'Trying a different approach when stuck'),
  (@cat_think, NULL, 'MYP', 'Using an idea from one subject in another'),
  (@cat_think, NULL, 'MYP', 'Telling fact apart from opinion'),

  (@cat_comm, NULL, 'MYP', 'Explaining an idea so a classmate understands it'),
  (@cat_comm, NULL, 'MYP', 'Taking clear notes you can use later'),
  (@cat_comm, NULL, 'MYP', 'Speaking clearly in front of the class'),
  (@cat_comm, NULL, 'MYP', 'Listening properly before responding'),
  (@cat_comm, NULL, 'MYP', 'Writing so the reader can follow your thinking');
