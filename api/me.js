// GET /api/me
// The single call the frontend makes on boot. Returns identity plus whatever
// the caller's role needs to render their shell: sections for a teacher,
// enrolments for a student.

import { handler } from './_lib/auth.js'
import { q } from './_lib/db.js'

export default handler({ methods: ['GET'] }, async (req, res, user) => {
  const base = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    status: user.status,
  }

  if (user.role === 'teacher') {
    const sections = await q(
      `SELECT s.id, s.grade, s.label,
              sub.id   AS subjectId,
              sub.name AS subjectName,
              (SELECT COUNT(*) FROM enrollments e
                WHERE e.section_id = s.id AND e.status = 'active')  AS activeStudents,
              (SELECT COUNT(*) FROM enrollments e
                WHERE e.section_id = s.id AND e.status = 'pending') AS pendingStudents
         FROM sections s
         JOIN subjects sub       ON sub.id = s.subject_id
         JOIN academic_years y   ON y.id   = s.academic_year_id AND y.is_current = 1
        WHERE s.teacher_id = ?
        ORDER BY sub.name, s.grade, s.label`,
      [user.id],
    )

    const pendingReviews = await q(
      `SELECT COUNT(*) AS n
         FROM reflections r
         JOIN units u    ON u.id = r.unit_id
         JOIN sections s ON s.id = u.section_id
        WHERE s.teacher_id = ? AND r.status = 'pending'`,
      [user.id],
    )

    return res.json({
      ...base,
      sections,
      pendingReviewCount: Number(pendingReviews[0]?.n ?? 0),
    })
  }

  if (user.role === 'student') {
    const [profile] = await q(
      `SELECT grade, student_code FROM student_profiles WHERE user_id = ?`,
      [user.id],
    )

    const enrollments = await q(
      `SELECT e.id, e.status,
              s.id     AS sectionId,
              s.grade, s.label,
              sub.id   AS subjectId,
              sub.name AS subjectName,
              t.full_name AS teacherName
         FROM enrollments e
         JOIN sections s       ON s.id   = e.section_id
         JOIN subjects sub     ON sub.id = s.subject_id
         JOIN users t          ON t.id   = s.teacher_id
         JOIN academic_years y ON y.id   = s.academic_year_id AND y.is_current = 1
        WHERE e.student_id = ? AND e.status <> 'dropped'
        ORDER BY sub.name`,
      [user.id],
    )

    return res.json({
      ...base,
      grade: profile?.grade ?? null,
      studentCode: profile?.student_code ?? null,
      enrollments,
    })
  }

  // admin
  const [counts] = await q(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'teacher')                    AS teachers,
       (SELECT COUNT(*) FROM users WHERE role = 'student')                    AS students,
       (SELECT COUNT(*) FROM users WHERE status = 'invited')                  AS awaitingFirstLogin,
       (SELECT COUNT(*) FROM sections)                                        AS sections,
       (SELECT COUNT(*) FROM enrollments WHERE status = 'pending')            AS pendingEnrollments`,
  )
  return res.json({ ...base, counts })
})
