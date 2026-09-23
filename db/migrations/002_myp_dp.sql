-- ATL Nexus :: MYP / DP split
--
-- Two changes:
--   1. Grades extend beyond DP. MYP Years 1-5 are Grades 6-10 at Modern; DP1
--      and DP2 are Grades 11-12. The set is fixed by the IB, not by the school,
--      so an ENUM is the right shape rather than a lookup table.
--   2. A sub-skill can now be scoped to a programme. "Deducing mechanisms from
--      kinetic data" is a DP thing; "Spotting a pattern in results" is MYP.
--      NULL means it applies to both, which is where Social, Self-management
--      and most Research sub-skills sit.
--
-- A sub-skill is therefore addressed on two axes:
--   subject_id  NULL = every subject   | set = that subject only
--   programme   NULL = MYP and DP      | set = that programme only

ALTER TABLE sections
  MODIFY grade ENUM('MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2') NOT NULL;

ALTER TABLE student_profiles
  MODIFY grade ENUM('MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2') NOT NULL;

ALTER TABLE atl_subskills
  ADD COLUMN programme ENUM('MYP','DP') NULL AFTER subject_id;

-- Everything seeded so far was written against DP command terms and DP
-- assessment expectations, so label it honestly rather than pretending it is
-- age-neutral. The generic sub-skills stay NULL: "planning and meeting
-- deadlines" reads the same in MYP 1 and DP 2.
UPDATE atl_subskills SET programme = 'DP' WHERE subject_id IS NOT NULL;

-- The lookup is now two-dimensional, so the old index no longer covers it.
-- Add the replacement before dropping the old one: fk_subskill_subject needs
-- an index leading with subject_id at all times, and MySQL refuses a drop that
-- would leave it uncovered.
ALTER TABLE atl_subskills
  ADD INDEX idx_subskill_lookup2 (subject_id, programme, category_id, is_active);
ALTER TABLE atl_subskills DROP INDEX idx_subskill_lookup;

-- The uniqueness rule has to include programme, or a subject cannot have both
-- an MYP and a DP sub-skill that happen to share a name. Same ordering problem
-- as above: fk_subskill_category needs an index leading with category_id, and
-- the old unique key is the only one providing it, so add before dropping.
ALTER TABLE atl_subskills
  ADD UNIQUE KEY uq_subskill2 (category_id, subject_id, programme, name);
ALTER TABLE atl_subskills DROP INDEX uq_subskill;
