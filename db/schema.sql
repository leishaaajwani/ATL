-- ATL Nexus :: complete schema
--
-- Every table, key and constraint, and no rows at all, so nothing personal
-- travels with this file. Load it first, then curriculum.sql.
--
--   mysql -u atl -p atl_nexus < db/schema.sql
--   mysql -u atl -p atl_nexus < db/curriculum.sql
--   mysql -u atl -p atl_nexus < db/seeds/005_demo_people.sql   (optional)


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `academic_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_years` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_on` date DEFAULT NULL,
  `ends_on` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_year_label` (`label`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `atl_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `atl_categories` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `colour` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bg_colour` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `atl_subskills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `atl_subskills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` tinyint unsigned NOT NULL,
  `subject_id` smallint unsigned DEFAULT NULL,
  `programme` enum('MYP','DP') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descriptor` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subskill2` (`category_id`,`subject_id`,`programme`,`name`),
  KEY `fk_subskill_author` (`created_by`),
  KEY `idx_subskill_lookup2` (`subject_id`,`programme`,`category_id`,`is_active`),
  CONSTRAINT `fk_subskill_author` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_subskill_category` FOREIGN KEY (`category_id`) REFERENCES `atl_categories` (`id`),
  CONSTRAINT `fk_subskill_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=354 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `section_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `status` enum('pending','active','dropped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `source` enum('roster','self_request','teacher_added') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'self_request',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enrollment` (`section_id`,`student_id`),
  KEY `idx_enrollment_student` (`student_id`,`status`),
  KEY `idx_enrollment_section_status` (`section_id`,`status`),
  KEY `fk_enroll_approver` (`approved_by`),
  CONSTRAINT `fk_enroll_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_enroll_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enroll_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `evidence_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidence_files` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reflection_id` bigint unsigned NOT NULL,
  `subskill_id` int unsigned DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int unsigned NOT NULL,
  `storage_key` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `backend` enum('disk','firebase') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disk',
  `uploaded_by` bigint unsigned NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_evidence_reflection` (`reflection_id`),
  KEY `idx_evidence_subskill` (`subskill_id`),
  KEY `fk_ev_uploader` (`uploaded_by`),
  CONSTRAINT `fk_ev_reflection` FOREIGN KEY (`reflection_id`) REFERENCES `reflections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ev_subskill` FOREIGN KEY (`subskill_id`) REFERENCES `atl_subskills` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ev_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invitations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `sent_to` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_by` bigint unsigned NOT NULL,
  `provider_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_invite_user` (`user_id`,`sent_at`),
  KEY `fk_inv_sender` (`sent_by`),
  CONSTRAINT `fk_inv_sender` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_inv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reflection_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reflection_answers` (
  `reflection_id` bigint unsigned NOT NULL,
  `prompt_id` tinyint unsigned NOT NULL,
  `answer_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `word_count` smallint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`reflection_id`,`prompt_id`),
  KEY `fk_ra_prompt` (`prompt_id`),
  CONSTRAINT `fk_ra_prompt` FOREIGN KEY (`prompt_id`) REFERENCES `reflection_prompts` (`id`),
  CONSTRAINT `fk_ra_reflection` FOREIGN KEY (`reflection_id`) REFERENCES `reflections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reflection_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reflection_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `reflection_id` bigint unsigned NOT NULL,
  `event` enum('submitted','returned','approved','resubmitted') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` bigint unsigned NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_reflection` (`reflection_id`,`created_at`),
  KEY `fk_re_actor` (`actor_id`),
  CONSTRAINT `fk_re_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_re_reflection` FOREIGN KEY (`reflection_id`) REFERENCES `reflections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reflection_prompts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reflection_prompts` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `sequence` tinyint unsigned NOT NULL,
  `question` varchar(400) COLLATE utf8mb4_unicode_ci NOT NULL,
  `helper` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `min_words` smallint unsigned NOT NULL DEFAULT '40',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prompt_sequence` (`sequence`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reflection_subskills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reflection_subskills` (
  `reflection_id` bigint unsigned NOT NULL,
  `subskill_id` int unsigned NOT NULL,
  `self_level` enum('Emerging','Developing','Proficient','Advanced') COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence_note` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`reflection_id`,`subskill_id`),
  KEY `fk_rs_subskill` (`subskill_id`),
  CONSTRAINT `fk_rs_reflection` FOREIGN KEY (`reflection_id`) REFERENCES `reflections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rs_subskill` FOREIGN KEY (`subskill_id`) REFERENCES `atl_subskills` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reflections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reflections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unit_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `status` enum('draft','pending','approved','returned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `revision_count` tinyint unsigned NOT NULL DEFAULT '0',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `teacher_feedback` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reflection` (`unit_id`,`student_id`),
  KEY `idx_reflection_student` (`student_id`,`status`),
  KEY `idx_reflection_status` (`status`,`submitted_at`),
  KEY `fk_refl_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_refl_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_refl_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refl_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_id` smallint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `grade` enum('MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2') COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `academic_year_id` smallint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_section` (`subject_id`,`teacher_id`,`grade`,`label`,`academic_year_id`),
  KEY `idx_section_teacher` (`teacher_id`,`academic_year_id`),
  KEY `idx_section_subject_grade` (`subject_id`,`grade`),
  KEY `fk_section_year` (`academic_year_id`),
  CONSTRAINT `fk_section_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `fk_section_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_section_year` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profiles` (
  `user_id` bigint unsigned NOT NULL,
  `student_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade` enum('MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_student_code` (`student_code`),
  KEY `idx_student_grade` (`grade`),
  CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ib_group` tinyint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subject_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacher_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_profiles` (
  `user_id` bigint unsigned NOT NULL,
  `staff_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_teacher_staff_id` (`staff_id`),
  CONSTRAINT `fk_teacher_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `term_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `term_reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `section_id` bigint unsigned NOT NULL,
  `term` enum('Term 1','Term 2','Term 3') COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary_comment` text COLLATE utf8mb4_unicode_ci,
  `published_at` timestamp NULL DEFAULT NULL,
  `published_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_term_report` (`student_id`,`section_id`,`term`),
  KEY `idx_report_section_term` (`section_id`,`term`),
  KEY `fk_tr_publisher` (`published_by`),
  CONSTRAINT `fk_tr_publisher` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tr_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tr_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `unit_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unit_ratings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `unit_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `subskill_id` int unsigned NOT NULL,
  `level` enum('Emerging','Developing','Proficient','Advanced') COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rated_by` bigint unsigned NOT NULL,
  `rated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_unit_rating` (`unit_id`,`student_id`,`subskill_id`),
  KEY `idx_rating_student` (`student_id`),
  KEY `fk_ur_subskill` (`subskill_id`),
  KEY `fk_ur_rater` (`rated_by`),
  CONSTRAINT `fk_ur_rater` FOREIGN KEY (`rated_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_ur_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_subskill` FOREIGN KEY (`subskill_id`) REFERENCES `atl_subskills` (`id`),
  CONSTRAINT `fk_ur_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `unit_subskills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unit_subskills` (
  `unit_id` bigint unsigned NOT NULL,
  `subskill_id` int unsigned NOT NULL,
  PRIMARY KEY (`unit_id`,`subskill_id`),
  KEY `idx_unit_subskill_reverse` (`subskill_id`),
  CONSTRAINT `fk_us_subskill` FOREIGN KEY (`subskill_id`) REFERENCES `atl_subskills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_us_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `section_id` bigint unsigned NOT NULL,
  `term` enum('Term 1','Term 2','Term 3') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `min_subskills_required` tinyint unsigned NOT NULL DEFAULT '3',
  `is_open` tinyint(1) NOT NULL DEFAULT '1',
  `starts_on` date DEFAULT NULL,
  `ends_on` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_unit` (`section_id`,`term`,`name`),
  KEY `idx_unit_section_term` (`section_id`,`term`),
  CONSTRAINT `fk_unit_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `google_sub` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','teacher','student') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('invited','active','disabled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'invited',
  `invited_at` timestamp NULL DEFAULT NULL,
  `first_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_google_sub` (`google_sub`),
  KEY `idx_users_role_status` (`role`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

