-- ATL Nexus :: ATL sub-skills
--
-- Two tiers:
--   subject_id NULL  -> generic, offered when planning a unit in any subject
--   subject_id SET   -> only offered for that subject
--
-- Thinking and Communication get subject-scoped sets because what "thinking"
-- means in Chemistry is not what it means in Literature. Research, Social and
-- Self-management stay generic because they genuinely transfer across subjects.
--
-- This is a STARTER set. Teachers edit and extend their own subject's list in
-- the admin panel, and anything they author gets created_by set so you can tell
-- seeded rows from school-authored ones.

SET @cat_think := (SELECT id FROM atl_categories WHERE name = 'Thinking');
SET @cat_comm  := (SELECT id FROM atl_categories WHERE name = 'Communication');
SET @cat_res   := (SELECT id FROM atl_categories WHERE name = 'Research');
SET @cat_soc   := (SELECT id FROM atl_categories WHERE name = 'Social');
SET @cat_self  := (SELECT id FROM atl_categories WHERE name = 'Self-management');

-- ─────────────────────────────────────────────────────────────────────────────
-- Generic sub-skills (every subject)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, NULL, 'Critical analysis of information'),
  (@cat_think, NULL, 'Generating and testing ideas'),
  (@cat_think, NULL, 'Transferring skills to a new context'),
  (@cat_think, NULL, 'Structured problem solving'),
  (@cat_think, NULL, 'Evaluating reasoning and evidence'),

  (@cat_comm, NULL, 'Written communication for a purpose'),
  (@cat_comm, NULL, 'Oral and visual presentation'),
  (@cat_comm, NULL, 'Listening and responding to others'),
  (@cat_comm, NULL, 'Using subject-specific terminology'),
  (@cat_comm, NULL, 'Digital and media communication'),

  (@cat_res, NULL, 'Formulating a research question'),
  (@cat_res, NULL, 'Locating and selecting sources'),
  (@cat_res, NULL, 'Evaluating source credibility'),
  (@cat_res, NULL, 'Recording and organising data'),
  (@cat_res, NULL, 'Citing and referencing correctly'),

  (@cat_soc, NULL, 'Collaborating towards a shared goal'),
  (@cat_soc, NULL, 'Taking and sharing responsibility'),
  (@cat_soc, NULL, 'Giving and receiving feedback'),
  (@cat_soc, NULL, 'Resolving disagreement productively'),
  (@cat_soc, NULL, 'Supporting the learning of peers'),

  (@cat_self, NULL, 'Planning and meeting deadlines'),
  (@cat_self, NULL, 'Organising materials and notes'),
  (@cat_self, NULL, 'Managing focus and distraction'),
  (@cat_self, NULL, 'Persisting through difficulty'),
  (@cat_self, NULL, 'Reflecting honestly on own progress');

-- ─────────────────────────────────────────────────────────────────────────────
-- Sciences
-- ─────────────────────────────────────────────────────────────────────────────

SET @s := (SELECT id FROM subjects WHERE name = 'Chemistry');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Designing a controlled investigation'),
  (@cat_think, @s, 'Evaluating sources of error and uncertainty'),
  (@cat_think, @s, 'Applying models to unfamiliar reactions'),
  (@cat_think, @s, 'Interpreting analytical and spectral data'),
  (@cat_think, @s, 'Predicting behaviour from periodic trends'),
  (@cat_comm,  @s, 'Using IUPAC nomenclature and conventions'),
  (@cat_comm,  @s, 'Presenting quantitative data in tables and graphs'),
  (@cat_comm,  @s, 'Structuring a full laboratory report'),
  (@cat_comm,  @s, 'Explaining mechanisms with annotated diagrams'),
  (@cat_comm,  @s, 'Reporting uncertainty and significant figures');

SET @s := (SELECT id FROM subjects WHERE name = 'Physics');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Modelling a system with simplifying assumptions'),
  (@cat_think, @s, 'Reasoning from first principles'),
  (@cat_think, @s, 'Evaluating experimental uncertainty'),
  (@cat_think, @s, 'Applying a law to an unfamiliar situation'),
  (@cat_think, @s, 'Checking a result by dimensional analysis'),
  (@cat_comm,  @s, 'Drawing and labelling force and circuit diagrams'),
  (@cat_comm,  @s, 'Presenting graphical analysis with gradients'),
  (@cat_comm,  @s, 'Writing a structured experimental report'),
  (@cat_comm,  @s, 'Using correct units and significant figures'),
  (@cat_comm,  @s, 'Explaining a derivation step by step');

SET @s := (SELECT id FROM subjects WHERE name = 'Biology');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Interpreting biological data and trends'),
  (@cat_think, @s, 'Designing a fair test with proper controls'),
  (@cat_think, @s, 'Linking structure to function'),
  (@cat_think, @s, 'Evaluating experimental validity'),
  (@cat_think, @s, 'Applying concepts to unfamiliar organisms'),
  (@cat_comm,  @s, 'Drawing and annotating biological diagrams'),
  (@cat_comm,  @s, 'Presenting statistical results clearly'),
  (@cat_comm,  @s, 'Using precise biological terminology'),
  (@cat_comm,  @s, 'Writing a structured investigation report'),
  (@cat_comm,  @s, 'Constructing evidence-based explanations');

SET @s := (SELECT id FROM subjects WHERE name = 'Environmental Systems and Societies SL');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Analysing systems and feedback loops'),
  (@cat_think, @s, 'Weighing environmental value systems'),
  (@cat_think, @s, 'Evaluating sustainability trade-offs'),
  (@cat_think, @s, 'Interpreting ecological field data'),
  (@cat_think, @s, 'Applying models to unfamiliar ecosystems'),
  (@cat_comm,  @s, 'Producing systems diagrams'),
  (@cat_comm,  @s, 'Presenting fieldwork findings'),
  (@cat_comm,  @s, 'Structuring an evaluative essay'),
  (@cat_comm,  @s, 'Using accurate environmental terminology'),
  (@cat_comm,  @s, 'Communicating to a non-specialist audience');

SET @s := (SELECT id FROM subjects WHERE name = 'Sports, Health and Exercise Science');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Interpreting physiological data'),
  (@cat_think, @s, 'Designing a training intervention'),
  (@cat_think, @s, 'Evaluating study methodology'),
  (@cat_think, @s, 'Linking anatomy to performance'),
  (@cat_think, @s, 'Applying principles to unfamiliar sports'),
  (@cat_comm,  @s, 'Presenting performance data graphically'),
  (@cat_comm,  @s, 'Writing a structured practical report'),
  (@cat_comm,  @s, 'Using precise anatomical terminology'),
  (@cat_comm,  @s, 'Explaining technique with annotated visuals'),
  (@cat_comm,  @s, 'Communicating findings to an athlete');

-- ─────────────────────────────────────────────────────────────────────────────
-- Mathematics
-- ─────────────────────────────────────────────────────────────────────────────

SET @s := (SELECT id FROM subjects WHERE name = 'Math AA');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Constructing a formal proof'),
  (@cat_think, @s, 'Selecting an appropriate method'),
  (@cat_think, @s, 'Generalising from specific cases'),
  (@cat_think, @s, 'Applying a technique to an unfamiliar problem'),
  (@cat_think, @s, 'Checking the reasonableness of a result'),
  (@cat_comm,  @s, 'Using correct mathematical notation'),
  (@cat_comm,  @s, 'Presenting a logical solution pathway'),
  (@cat_comm,  @s, 'Justifying each step of working'),
  (@cat_comm,  @s, 'Representing relationships graphically'),
  (@cat_comm,  @s, 'Explaining reasoning in written form');

SET @s := (SELECT id FROM subjects WHERE name = 'Math AI');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Choosing a model for a real-world situation'),
  (@cat_think, @s, 'Justifying assumptions and their limits'),
  (@cat_think, @s, 'Interpreting results back in context'),
  (@cat_think, @s, 'Evaluating model fit and reliability'),
  (@cat_think, @s, 'Applying a technique to unfamiliar data'),
  (@cat_comm,  @s, 'Using correct mathematical notation'),
  (@cat_comm,  @s, 'Presenting data graphically with clear labels'),
  (@cat_comm,  @s, 'Explaining what a result means in context'),
  (@cat_comm,  @s, 'Using technology output to support an argument'),
  (@cat_comm,  @s, 'Structuring a written mathematical report');

SET @s := (SELECT id FROM subjects WHERE name = 'Computer Science');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Decomposing a problem into components'),
  (@cat_think, @s, 'Designing and tracing an algorithm'),
  (@cat_think, @s, 'Debugging systematically'),
  (@cat_think, @s, 'Evaluating efficiency and trade-offs'),
  (@cat_think, @s, 'Applying a known pattern to a new problem'),
  (@cat_comm,  @s, 'Documenting code clearly'),
  (@cat_comm,  @s, 'Producing design diagrams and flowcharts'),
  (@cat_comm,  @s, 'Explaining a solution to a non-technical audience'),
  (@cat_comm,  @s, 'Using accurate technical terminology'),
  (@cat_comm,  @s, 'Writing structured technical documentation');

-- ─────────────────────────────────────────────────────────────────────────────
-- Language and literature
-- ─────────────────────────────────────────────────────────────────────────────

SET @s := (SELECT id FROM subjects WHERE name = 'English Language and Literature');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Constructing a sustained line of argument'),
  (@cat_think, @s, 'Interpreting stylistic and figurative choices'),
  (@cat_think, @s, 'Evaluating competing critical readings'),
  (@cat_think, @s, 'Comparing texts across form and context'),
  (@cat_think, @s, 'Analysing unseen texts under time pressure'),
  (@cat_comm,  @s, 'Structuring a comparative essay'),
  (@cat_comm,  @s, 'Delivering an oral commentary'),
  (@cat_comm,  @s, 'Integrating textual evidence fluently'),
  (@cat_comm,  @s, 'Adapting register for audience and purpose'),
  (@cat_comm,  @s, 'Using precise literary terminology');

SET @s := (SELECT id FROM subjects WHERE name = 'English Literature');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Constructing a sustained line of argument'),
  (@cat_think, @s, 'Interpreting figurative and structural choices'),
  (@cat_think, @s, 'Evaluating competing critical readings'),
  (@cat_think, @s, 'Situating a text in its literary context'),
  (@cat_think, @s, 'Analysing unseen poetry and prose'),
  (@cat_comm,  @s, 'Structuring a comparative essay'),
  (@cat_comm,  @s, 'Delivering an individual oral'),
  (@cat_comm,  @s, 'Integrating quotation into argument'),
  (@cat_comm,  @s, 'Writing with critical register'),
  (@cat_comm,  @s, 'Using precise literary terminology');

-- Acquisition languages share one set
INSERT INTO atl_subskills (category_id, subject_id, name)
SELECT @cat_think, s.id, n.name FROM subjects s CROSS JOIN (
            SELECT 'Inferring meaning from context' AS name
  UNION ALL SELECT 'Recognising and applying grammatical patterns'
  UNION ALL SELECT 'Comparing cultural perspectives'
  UNION ALL SELECT 'Transferring vocabulary to a new topic'
  UNION ALL SELECT 'Self-correcting from feedback'
) n WHERE s.name IN ('German Ab Initio','French Ab Initio','Spanish Ab Initio',
                     'Hindi B','Spanish B','French B');

INSERT INTO atl_subskills (category_id, subject_id, name)
SELECT @cat_comm, s.id, n.name FROM subjects s CROSS JOIN (
            SELECT 'Sustaining a spoken interaction' AS name
  UNION ALL SELECT 'Writing in a required text type'
  UNION ALL SELECT 'Adapting register for the audience'
  UNION ALL SELECT 'Using accurate pronunciation and intonation'
  UNION ALL SELECT 'Responding to visual and written stimuli'
) n WHERE s.name IN ('German Ab Initio','French Ab Initio','Spanish Ab Initio',
                     'Hindi B','Spanish B','French B');

-- ─────────────────────────────────────────────────────────────────────────────
-- Individuals and societies
-- ─────────────────────────────────────────────────────────────────────────────

SET @s := (SELECT id FROM subjects WHERE name = 'Economics');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Applying economic models to real events'),
  (@cat_think, @s, 'Evaluating policy trade-offs'),
  (@cat_think, @s, 'Reasoning with diagrams'),
  (@cat_think, @s, 'Distinguishing correlation from causation'),
  (@cat_think, @s, 'Applying theory to unfamiliar markets'),
  (@cat_comm,  @s, 'Drawing and annotating economic diagrams'),
  (@cat_comm,  @s, 'Structuring an evaluative essay'),
  (@cat_comm,  @s, 'Using data to support an argument'),
  (@cat_comm,  @s, 'Applying precise economic terminology'),
  (@cat_comm,  @s, 'Writing a commentary on a news source');

SET @s := (SELECT id FROM subjects WHERE name = 'Business Management');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Applying business tools to a real organisation'),
  (@cat_think, @s, 'Evaluating strategic options'),
  (@cat_think, @s, 'Interpreting financial data'),
  (@cat_think, @s, 'Weighing stakeholder perspectives'),
  (@cat_think, @s, 'Applying frameworks to unfamiliar cases'),
  (@cat_comm,  @s, 'Structuring a case study response'),
  (@cat_comm,  @s, 'Presenting financial information clearly'),
  (@cat_comm,  @s, 'Writing for a business audience'),
  (@cat_comm,  @s, 'Using accurate business terminology'),
  (@cat_comm,  @s, 'Delivering a persuasive recommendation');

SET @s := (SELECT id FROM subjects WHERE name = 'Psychology');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Evaluating research methodology'),
  (@cat_think, @s, 'Comparing competing theoretical explanations'),
  (@cat_think, @s, 'Interpreting quantitative and qualitative data'),
  (@cat_think, @s, 'Identifying bias and confounding variables'),
  (@cat_think, @s, 'Applying theory to unfamiliar scenarios'),
  (@cat_comm,  @s, 'Structuring an evaluative essay'),
  (@cat_comm,  @s, 'Reporting studies with accurate detail'),
  (@cat_comm,  @s, 'Using precise psychological terminology'),
  (@cat_comm,  @s, 'Presenting data ethically and clearly'),
  (@cat_comm,  @s, 'Writing an internal assessment report');

SET @s := (SELECT id FROM subjects WHERE name = 'History');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Evaluating sources for reliability and purpose'),
  (@cat_think, @s, 'Constructing an argument from evidence'),
  (@cat_think, @s, 'Weighing causation and consequence'),
  (@cat_think, @s, 'Comparing historiographical interpretations'),
  (@cat_think, @s, 'Situating events in a wider context'),
  (@cat_comm,  @s, 'Structuring an essay with a clear argument'),
  (@cat_comm,  @s, 'Integrating source evidence into prose'),
  (@cat_comm,  @s, 'Using accurate historical terminology'),
  (@cat_comm,  @s, 'Presenting a balanced counter-argument'),
  (@cat_comm,  @s, 'Referencing sources correctly');

SET @s := (SELECT id FROM subjects WHERE name = 'Global Politics');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Applying political concepts to current events'),
  (@cat_think, @s, 'Evaluating competing theoretical lenses'),
  (@cat_think, @s, 'Analysing power and its distribution'),
  (@cat_think, @s, 'Weighing contested perspectives'),
  (@cat_think, @s, 'Applying frameworks to unfamiliar cases'),
  (@cat_comm,  @s, 'Structuring an argumentative essay'),
  (@cat_comm,  @s, 'Presenting a case study orally'),
  (@cat_comm,  @s, 'Using precise political terminology'),
  (@cat_comm,  @s, 'Representing opposing views fairly'),
  (@cat_comm,  @s, 'Referencing sources and data');

SET @s := (SELECT id FROM subjects WHERE name = 'Geography');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Interpreting spatial patterns and scale'),
  (@cat_think, @s, 'Evaluating development trade-offs'),
  (@cat_think, @s, 'Analysing fieldwork data'),
  (@cat_think, @s, 'Linking physical and human processes'),
  (@cat_think, @s, 'Applying models to unfamiliar regions'),
  (@cat_comm,  @s, 'Producing annotated maps and diagrams'),
  (@cat_comm,  @s, 'Presenting fieldwork findings'),
  (@cat_comm,  @s, 'Structuring an evaluative essay'),
  (@cat_comm,  @s, 'Using accurate geographical terminology'),
  (@cat_comm,  @s, 'Representing data with appropriate graphics');

SET @s := (SELECT id FROM subjects WHERE name = 'Digital Society');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Analysing the impact of a technology'),
  (@cat_think, @s, 'Weighing competing stakeholder interests'),
  (@cat_think, @s, 'Evaluating claims about digital systems'),
  (@cat_think, @s, 'Identifying ethical tensions'),
  (@cat_think, @s, 'Applying concepts to unfamiliar contexts'),
  (@cat_comm,  @s, 'Structuring an inquiry response'),
  (@cat_comm,  @s, 'Presenting a real-world example clearly'),
  (@cat_comm,  @s, 'Using accurate digital society terminology'),
  (@cat_comm,  @s, 'Communicating with multimedia'),
  (@cat_comm,  @s, 'Referencing sources correctly');

SET @s := (SELECT id FROM subjects WHERE name = 'Social and Cultural Anthropology HL');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Interpreting ethnographic material'),
  (@cat_think, @s, 'Applying anthropological concepts'),
  (@cat_think, @s, 'Reflecting on own cultural position'),
  (@cat_think, @s, 'Comparing across societies'),
  (@cat_think, @s, 'Evaluating competing interpretations'),
  (@cat_comm,  @s, 'Writing an ethnographic account'),
  (@cat_comm,  @s, 'Structuring a comparative essay'),
  (@cat_comm,  @s, 'Using precise anthropological terminology'),
  (@cat_comm,  @s, 'Representing informants respectfully'),
  (@cat_comm,  @s, 'Presenting fieldwork observations');

SET @s := (SELECT id FROM subjects WHERE name = 'Theory of Knowledge');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Formulating knowledge questions'),
  (@cat_think, @s, 'Evaluating competing knowledge claims'),
  (@cat_think, @s, 'Identifying underlying assumptions'),
  (@cat_think, @s, 'Comparing areas of knowledge'),
  (@cat_think, @s, 'Reasoning about the limits of certainty'),
  (@cat_comm,  @s, 'Structuring an exhibition commentary'),
  (@cat_comm,  @s, 'Articulating a knowledge argument'),
  (@cat_comm,  @s, 'Using TOK terminology precisely'),
  (@cat_comm,  @s, 'Presenting real-life examples clearly'),
  (@cat_comm,  @s, 'Writing a balanced essay');

-- ─────────────────────────────────────────────────────────────────────────────
-- The arts
-- ─────────────────────────────────────────────────────────────────────────────

SET @s := (SELECT id FROM subjects WHERE name = 'Visual Arts');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Developing ideas through experimentation'),
  (@cat_think, @s, 'Evaluating and refining own work'),
  (@cat_think, @s, 'Interpreting artworks in cultural context'),
  (@cat_think, @s, 'Transferring techniques across media'),
  (@cat_think, @s, 'Making deliberate conceptual choices'),
  (@cat_comm,  @s, 'Articulating intention in a process portfolio'),
  (@cat_comm,  @s, 'Curating and presenting an exhibition'),
  (@cat_comm,  @s, 'Using accurate art terminology'),
  (@cat_comm,  @s, 'Documenting technical process clearly'),
  (@cat_comm,  @s, 'Discussing influences and sources');

SET @s := (SELECT id FROM subjects WHERE name = 'Music');
INSERT INTO atl_subskills (category_id, subject_id, name) VALUES
  (@cat_think, @s, 'Analysing musical structure'),
  (@cat_think, @s, 'Making creative compositional choices'),
  (@cat_think, @s, 'Situating music in cultural context'),
  (@cat_think, @s, 'Evaluating own performance critically'),
  (@cat_think, @s, 'Transferring technique across styles'),
  (@cat_comm,  @s, 'Performing to an audience'),
  (@cat_comm,  @s, 'Notating and scoring accurately'),
  (@cat_comm,  @s, 'Using precise musical terminology'),
  (@cat_comm,  @s, 'Writing programme and process notes'),
  (@cat_comm,  @s, 'Presenting a musical investigation');
