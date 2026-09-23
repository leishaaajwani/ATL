// GET  /api/sections                  teacher: my classes; student: what I can join
// GET  /api/sections?id=3&roster=1     teacher: the students in one class
// POST /api/sections                   teacher: declare a class I teach
//
// This is the onboarding step for a teacher: they pick their subject and grade,
// and the section is what students then join.

import { handler, HttpError, assertOwnsSection } from './_lib/auth.js'
import { q, q1 } from './_lib/db.js'

export default handler({ methods: ['GET', 'POST'] }, async (req, res, user) => {
  if (req.method === 'GET') {
    if (req.query.id) return roster(req, res, user)
    return user.role === 'student' ? joinable(res, user) : mySections(res, user)
  }

  if (user.role !== 'teacher') throw new HttpError(403, 'Only teachers declare classes')

  const { subjectId, grade, label = '' } = req.body ?? {}
  if (!subjectId || !grade) throw new HttpError(400, 'subjectId and grade are required')
  if (!['DP1', 'DP2'].includes(grade)) throw new HttpError(400, 'grade must be DP1 or DP2')

  const year = await q1(`SELECT id FROM academic_years WHERE is_current = 1`)
  if (!year) throw new HttpError(500, 'No academic year is marked current')

  try {
    const r = await q(
      `INSERT INTO sections (subject_id, teacher_id, grade, label, academic_year_id)
       VALUES (?, ?, ?, ?, ?)`,
      [subjectId, user.id, grade, label.trim(), year.id],
    )
    return res.status(201).json({ id: r.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You already have that class')
    if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new HttpError(400, 'That subject does not exist')
    throw err
  }
})

async function mySections(res, user) {
  const sections = await q(
    `SELECT s.id, s.grade, s.label, sub.id AS subjectId, sub.name AS subjectName,
            (SELECT COUNT(*) FROM enrollments e WHERE e.section_id=s.id AND e.status='active')  AS activeStudents,
            (SELECT COUNT(*) FROM enrollments e WHERE e.section_id=s.id AND e.status='pending') AS pendingStudents,
            (SELECT COUNT(*) FROM units u WHERE u.section_id=s.id) AS unitCount
       FROM sections s
       JOIN subjects sub     ON sub.id = s.subject_id
       JOIN academic_years y ON y.id = s.academic_year_id AND y.is_current = 1
      WHERE s.teacher_id = ?
      ORDER BY sub.name, s.grade`,
    [user.id],
  )
  return res.json({ sections })
}

// A student sees every class matching their grade, and picks theirs. The teacher
// then confirms, which is the safety net against picking the wrong one.
async function joinable(res, user) {
  const profile = await q1(`SELECT grade FROM student_profiles WHERE user_id = ?`, [user.id])
  const sections = await q(
    `SELECT s.id, s.grade, s.label, sub.name AS subjectName, t.full_name AS teacherName,
            e.status AS myStatus
       FROM sections s
       JOIN subjects sub     ON sub.id = s.subject_id
       JOIN users t          ON t.id = s.teacher_id
       JOIN academic_years y ON y.id = s.academic_year_id AND y.is_current = 1
       LEFT JOIN enrollments e ON e.section_id = s.id AND e.student_id = ?
      WHERE s.grade = ?
      ORDER BY sub.name, t.full_name`,
    [user.id, profile?.grade ?? 'DP1'],
  )
  return res.json({ sections })
}

async function roster(req, res, user) {
  const sectionId = Number(req.query.id)
  if (user.role === 'teacher') await assertOwnsSection(user.id, sectionId)
  else if (user.role !== 'admin') throw new HttpError(403, 'Not your class')

  const students = await q(
    `SELECT u.id, u.full_name AS fullName, u.email, u.photo_url AS photoUrl,
            u.status AS accountStatus,
            e.id AS enrollmentId, e.status AS enrollmentStatus, e.requested_at AS requestedAt,
            sp.grade,
            (SELECT COUNT(*) FROM reflections r
               JOIN units un ON un.id = r.unit_id
              WHERE r.student_id = u.id AND un.section_id = ? AND r.status='approved') AS approvedCount,
            (SELECT COUNT(*) FROM reflections r
               JOIN units un ON un.id = r.unit_id
              WHERE r.student_id = u.id AND un.section_id = ? AND r.status='pending')  AS pendingCount
       FROM enrollments e
       JOIN users u             ON u.id = e.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE e.section_id = ? AND e.status <> 'dropped'
      ORDER BY e.status DESC, u.full_name`,
    [sectionId, sectionId, sectionId],
  )
  return res.json({ students })
}
