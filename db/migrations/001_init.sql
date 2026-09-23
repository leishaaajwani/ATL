-- ATL Nexus :: initial schema
-- MySQL 8.0+
--
-- Design notes:
--   * A "section" is one taught class (DP1 Math AI, Mahek, 2026-27). This is the
--     unit of access control. Everything hangs off it.
--   * Sub-skills are either generic (subject_id IS NULL) or subject-scoped.
--     Thinking and Communication are the categories that get subject-scoped ones.
--   * One reflection per (unit, student). Status cycles, history lives in
--     reflection_events so a returned-then-revised entry keeps its trail.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ─────────────────────────────────────────────────────────────────────────────
-- People
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  google_sub     VARCHAR(128)         NULL,  -- Firebase/Google uid, set on first sign-in
  email          VARCHAR(255)     NOT NULL,
  full_name      VARCHAR(160)     NOT NULL,
  photo_url      VARCHAR(512)         NULL,
  role           ENUM('admin','teacher','student') NOT NULL,
  status         ENUM('invited','active','disabled') NOT NULL DEFAULT 'invited',
  invited_at     TIMESTAMP            NULL,
  first_login_at TIMESTAMP            NULL,
  created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_sub (google_sub),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teacher_profiles (
  user_id    BIGINT UNSIGNED NOT NULL,
  staff_id   VARCHAR(64)  NULL,
  department VARCHAR(120) NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_teacher_staff_id (staff_id),
  CONSTRAINT fk_teacher_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_profiles (
  user_id      BIGINT UNSIGNED NOT NULL,
  student_code VARCHAR(64) NULL,
  grade        ENUM('DP1','DP2') NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_student_code (student_code),
  KEY idx_student_grade (grade),
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Academic structure
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE academic_years (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label      VARCHAR(20) NOT NULL,          -- '2026-27'
  starts_on  DATE NULL,
  ends_on    DATE NULL,
  is_current BOOLEAN NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_year_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subjects (
  id       SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name     VARCHAR(120) NOT NULL,
  ib_group TINYINT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subject_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One taught class. The unit of access control.
CREATE TABLE sections (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id       SMALLINT UNSIGNED NOT NULL,
  teacher_id       BIGINT UNSIGNED   NOT NULL,
  grade            ENUM('DP1','DP2') NOT NULL,
  label            VARCHAR(80) NOT NULL DEFAULT '',  -- optional stream, 'HL-A'
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_section (subject_id, teacher_id, grade, label, academic_year_id),
  KEY idx_section_teacher (teacher_id, academic_year_id),
  KEY idx_section_subject_grade (subject_id, grade),
  CONSTRAINT fk_section_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_section_teacher FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT fk_section_year    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student joins a section, teacher confirms. 'pending' is the safety net.
CREATE TABLE enrollments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id   BIGINT UNSIGNED NOT NULL,
  student_id   BIGINT UNSIGNED NOT NULL,
  status       ENUM('pending','active','dropped') NOT NULL DEFAULT 'pending',
  source       ENUM('roster','self_request','teacher_added') NOT NULL DEFAULT 'self_request',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at  TIMESTAMP NULL,
  approved_by  BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (section_id, student_id),
  KEY idx_enrollment_student (student_id, status),
  KEY idx_enrollment_section_status (section_id, status),
  CONSTRAINT fk_enroll_section  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_student  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_approver FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- ATL framework
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE atl_categories (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(40) NOT NULL,
  colour     CHAR(7) NOT NULL,
  bg_colour  CHAR(7) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- subject_id NULL  => generic, offered for every subject
-- subject_id SET   => only offered when planning a unit in that subject
CREATE TABLE atl_subskills (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id TINYINT UNSIGNED  NOT NULL,
  subject_id  SMALLINT UNSIGNED NULL,
  name        VARCHAR(200) NOT NULL,
  descriptor  VARCHAR(500) NULL,
  is_active   BOOLEAN NOT NULL DEFAULT 1,
  created_by  BIGINT UNSIGNED NULL,   -- NULL = seeded, set = teacher-authored
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subskill (category_id, subject_id, name),
  KEY idx_subskill_lookup (subject_id, category_id, is_active),
  CONSTRAINT fk_subskill_category FOREIGN KEY (category_id) REFERENCES atl_categories(id),
  CONSTRAINT fk_subskill_subject  FOREIGN KEY (subject_id)  REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_subskill_author   FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Unit planning
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE units (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id             BIGINT UNSIGNED NOT NULL,
  term                   ENUM('Term 1','Term 2','Term 3') NOT NULL,
  name                   VARCHAR(200) NOT NULL,
  description            TEXT NULL,
  min_subskills_required TINYINT UNSIGNED NOT NULL DEFAULT 3,
  is_open                BOOLEAN NOT NULL DEFAULT 1,
  starts_on              DATE NULL,
  ends_on                DATE NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unit (section_id, term, name),
  KEY idx_unit_section_term (section_id, term),
  CONSTRAINT fk_unit_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which sub-skills this unit targets. Students only ever see these.
CREATE TABLE unit_subskills (
  unit_id     BIGINT UNSIGNED NOT NULL,
  subskill_id INT UNSIGNED    NOT NULL,
  PRIMARY KEY (unit_id, subskill_id),
  KEY idx_unit_subskill_reverse (subskill_id),
  CONSTRAINT fk_us_unit     FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_us_subskill FOREIGN KEY (subskill_id) REFERENCES atl_subskills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Student reflections
-- ─────────────────────────────────────────────────────────────────────────────

-- Structured prompts replace the old free-text box.
CREATE TABLE reflection_prompts (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence   TINYINT UNSIGNED NOT NULL,
  question   VARCHAR(400) NOT NULL,
  helper     VARCHAR(300) NULL,
  min_words  SMALLINT UNSIGNED NOT NULL DEFAULT 40,
  is_active  BOOLEAN NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prompt_sequence (sequence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reflections (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id          BIGINT UNSIGNED NOT NULL,
  student_id       BIGINT UNSIGNED NOT NULL,
  status           ENUM('draft','pending','approved','returned') NOT NULL DEFAULT 'draft',
  revision_count   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  submitted_at     TIMESTAMP NULL,
  reviewed_at      TIMESTAMP NULL,
  reviewed_by      BIGINT UNSIGNED NULL,
  teacher_feedback TEXT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reflection (unit_id, student_id),
  KEY idx_reflection_student (student_id, status),
  KEY idx_reflection_status (status, submitted_at),
  CONSTRAINT fk_refl_unit     FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_refl_student  FOREIGN KEY (student_id)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_refl_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The ticks. Student confirms they demonstrated a sub-skill, with evidence.
CREATE TABLE reflection_subskills (
  reflection_id BIGINT UNSIGNED NOT NULL,
  subskill_id   INT UNSIGNED    NOT NULL,
  self_level    ENUM('Emerging','Developing','Proficient','Advanced') NOT NULL,
  evidence_note VARCHAR(500) NOT NULL,
  PRIMARY KEY (reflection_id, subskill_id),
  CONSTRAINT fk_rs_reflection FOREIGN KEY (reflection_id) REFERENCES reflections(id) ON DELETE CASCADE,
  CONSTRAINT fk_rs_subskill   FOREIGN KEY (subskill_id)   REFERENCES atl_subskills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reflection_answers (
  reflection_id BIGINT UNSIGNED  NOT NULL,
  prompt_id     TINYINT UNSIGNED NOT NULL,
  answer_text   TEXT NOT NULL,
  word_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (reflection_id, prompt_id),
  CONSTRAINT fk_ra_reflection FOREIGN KEY (reflection_id) REFERENCES reflections(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_prompt     FOREIGN KEY (prompt_id)     REFERENCES reflection_prompts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit trail. Proves a returned reflection was actually revised.
CREATE TABLE reflection_events (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reflection_id BIGINT UNSIGNED NOT NULL,
  event         ENUM('submitted','returned','approved','resubmitted') NOT NULL,
  actor_id      BIGINT UNSIGNED NOT NULL,
  note          TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_reflection (reflection_id, created_at),
  CONSTRAINT fk_re_reflection FOREIGN KEY (reflection_id) REFERENCES reflections(id) ON DELETE CASCADE,
  CONSTRAINT fk_re_actor      FOREIGN KEY (actor_id)      REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Teacher ratings and reports
-- ─────────────────────────────────────────────────────────────────────────────

-- Per sub-skill now, not per category. Upsert target for the Reports page.
CREATE TABLE unit_ratings (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id     BIGINT UNSIGNED NOT NULL,
  student_id  BIGINT UNSIGNED NOT NULL,
  subskill_id INT UNSIGNED    NOT NULL,
  level       ENUM('Emerging','Developing','Proficient','Advanced') NOT NULL,
  comment     VARCHAR(500) NULL,
  rated_by    BIGINT UNSIGNED NOT NULL,
  rated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unit_rating (unit_id, student_id, subskill_id),
  KEY idx_rating_student (student_id),
  CONSTRAINT fk_ur_unit     FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_student  FOREIGN KEY (student_id)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_subskill FOREIGN KEY (subskill_id) REFERENCES atl_subskills(id),
  CONSTRAINT fk_ur_rater    FOREIGN KEY (rated_by)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Publishing a term report is what makes ratings visible to the student.
CREATE TABLE term_reports (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id       BIGINT UNSIGNED NOT NULL,
  section_id       BIGINT UNSIGNED NOT NULL,
  term             ENUM('Term 1','Term 2','Term 3') NOT NULL,
  summary_comment  TEXT NULL,
  published_at     TIMESTAMP NULL,
  published_by     BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_term_report (student_id, section_id, term),
  KEY idx_report_section_term (section_id, term),
  CONSTRAINT fk_tr_student   FOREIGN KEY (student_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tr_section   FOREIGN KEY (section_id)   REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_tr_publisher FOREIGN KEY (published_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Invitations (notification log, not a credential)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE invitations (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  sent_to    VARCHAR(255) NOT NULL,
  sent_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_by    BIGINT UNSIGNED NOT NULL,
  provider_id VARCHAR(128) NULL,   -- Resend message id, for delivery lookups
  PRIMARY KEY (id),
  KEY idx_invite_user (user_id, sent_at),
  CONSTRAINT fk_inv_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_sender FOREIGN KEY (sent_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
