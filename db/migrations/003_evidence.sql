-- ATL Nexus :: evidence files
--
-- A student attaches proof to the sub-skill they claim: a photo of the lab
-- book, the graph they drew, a screenshot of the model they built. The written
-- evidence note says what they did; the file shows it.
--
-- subskill_id NULL means the file evidences the whole reflection rather than
-- one specific sub-skill, which is the common case for a single lab report.

CREATE TABLE evidence_files (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reflection_id BIGINT UNSIGNED NOT NULL,
  subskill_id   INT UNSIGNED    NULL,
  file_name     VARCHAR(255)  NOT NULL,
  content_type  VARCHAR(120)  NOT NULL,
  size_bytes    INT UNSIGNED  NOT NULL,
  storage_key   VARCHAR(512)  NOT NULL,  -- backend-specific locator
  backend       ENUM('disk','firebase') NOT NULL DEFAULT 'disk',
  uploaded_by   BIGINT UNSIGNED NOT NULL,
  uploaded_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_evidence_reflection (reflection_id),
  KEY idx_evidence_subskill (subskill_id),
  CONSTRAINT fk_ev_reflection FOREIGN KEY (reflection_id) REFERENCES reflections(id) ON DELETE CASCADE,
  CONSTRAINT fk_ev_subskill   FOREIGN KEY (subskill_id)   REFERENCES atl_subskills(id) ON DELETE SET NULL,
  CONSTRAINT fk_ev_uploader   FOREIGN KEY (uploaded_by)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A reflection can exist as a draft purely to hold files while the student is
-- still writing, so drafts are allowed to have evidence attached before submit.
