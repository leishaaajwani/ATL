// POST /api/enrollments          student: request to join a class
// PATCH /api/enrollments         teacher: approve or drop a request
//
// This is option C from the plan: the student picks their own classes so admin
// does not key in every timetable, and the teacher confirms so a wrong pick
// never silently becomes real data.

import { handler, HttpError } from './_lib/auth.js'
import { q, q1 } from './_lib/db.js'

export default handler({ methods: ['POST', 'PATCH'] }, async (req, res, user) => {
  if (req.method === 'POST') {
    if (user.role !== 'student') throw new HttpError(403, 'Only students join classes')

    const { sectionId } = req.body ?? {}
    if (!sectionId) throw new HttpError(400, 'sectionId is required')

    // Grade must line up, which stops a DP1 joining a DP2 class by id-guessing.
    const ok = await q1(
      `SELECT s.id
         FROM sections s
         JOIN student_profiles sp ON sp.user_id = ?
         JOIN academic_years y    ON y.id = s.academic_year_id AND y.is_current = 1
        WHERE s.id = ? AND s.grade = sp.grade`,
      [user.id, sectionId],
    )
    if (!ok) throw new HttpError(400, 'That class is not open to your grade')

    try {
      await q(
        `INSERT INTO enrollments (section_id, student_id, status, source)
         VALUES (?, ?, 'pending', 'self_request')`,
        [sectionId, user.id],
      )
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You already requested this class')
      throw err
    }
    return res.status(201).json({ status: 'pending' })
  }

  // ── PATCH: teacher decides ─────────────────────────────────────────────────
  if (user.role !== 'teacher') throw new HttpError(403, 'Only teachers confirm enrolments')

  const { enrollmentId, action } = req.body ?? {}
  if (!enrollmentId || !['approve', 'drop'].includes(action)) {
    throw new HttpError(400, "enrollmentId and action ('approve' or 'drop') are required")
  }

  const enrollment = await q1(
    `SELECT e.id
       FROM enrollments e
       JOIN sections s ON s.id = e.section_id
      WHERE e.id = ? AND s.teacher_id = ?`,
    [enrollmentId, user.id],
  )
  if (!enrollment) throw new HttpError(403, 'That request is not for one of your classes')

  const status = action === 'approve' ? 'active' : 'dropped'
  await q(
    `UPDATE enrollments
        SET status = ?, approved_at = CURRENT_TIMESTAMP, approved_by = ?
      WHERE id = ?`,
    [status, user.id, enrollmentId],
  )
  return res.json({ id: enrollmentId, status })
})
