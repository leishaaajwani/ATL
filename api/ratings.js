// GET  /api/ratings?studentId=5&sectionId=3   everything needed to rate one student
// POST /api/ratings                            upsert one sub-skill rating
//
// The Reports page reads the GET once per student and then fires a POST per
// button press. Ratings are per sub-skill now, so a student can be Proficient at
// "designing a controlled investigation" and Developing at "evaluating sources
// of error" inside the same Thinking category, which is the granularity the
// teachers asked for.

import { handler, HttpError, assertOwnsUnit } from './_lib/auth.js'
import { q, q1 } from './_lib/db.js'

const LEVELS = ['Emerging', 'Developing', 'Proficient', 'Advanced']

export default handler({ methods: ['GET', 'POST'] }, async (req, res, user) => {
  if (req.method === 'GET') {
    const studentId = Number(req.query.studentId)
    const sectionId = Number(req.query.sectionId)
    const term = req.query.term ?? null

    if (user.role === 'student') {
      // A student may only read their own, and only once published.
      if (studentId && studentId !== user.id) throw new HttpError(403, 'Not your ratings')
      return res.json({ ratings: await studentVisibleRatings(user.id, term) })
    }

    if (!studentId || !sectionId) throw new HttpError(400, 'studentId and sectionId are required')
    if (user.role === 'teacher') {
      const owns = await q1(`SELECT id FROM sections WHERE id = ? AND teacher_id = ?`, [sectionId, user.id])
      if (!owns) throw new HttpError(403, 'That class is not yours')
    }

    // Per unit: the sub-skills tagged, what the student said, what the teacher said.
    const rows = await q(
      `SELECT un.id AS unitId, un.name AS unitName, un.term,
              ss.id AS subskillId, ss.name AS subskillName,
              (ss.subject_id IS NOT NULL) AS isSubjectSpecific,
              c.name AS categoryName, c.colour, c.bg_colour AS bgColour,
              rs.self_level   AS selfLevel,
              rs.evidence_note AS evidenceNote,
              r.status        AS reflectionStatus,
              ur.level        AS teacherLevel,
              ur.comment      AS teacherComment
         FROM units un
         JOIN unit_subskills us ON us.unit_id = un.id
         JOIN atl_subskills ss  ON ss.id = us.subskill_id
         JOIN atl_categories c  ON c.id = ss.category_id
         LEFT JOIN reflections r          ON r.unit_id = un.id AND r.student_id = ?
         LEFT JOIN reflection_subskills rs ON rs.reflection_id = r.id AND rs.subskill_id = ss.id
         LEFT JOIN unit_ratings ur        ON ur.unit_id = un.id
                                         AND ur.student_id = ?
                                         AND ur.subskill_id = ss.id
        WHERE un.section_id = ?
          ${term ? 'AND un.term = ?' : ''}
        ORDER BY un.term, un.name, c.sort_order, ss.name`,
      term ? [studentId, studentId, sectionId, term] : [studentId, studentId, sectionId],
    )

    // Group by unit so the page can render one table per unit
    const units = []
    for (const r of rows) {
      let u = units.find(x => x.unitId === r.unitId)
      if (!u) {
        u = { unitId: r.unitId, unitName: r.unitName, term: r.term,
              reflectionStatus: r.reflectionStatus, subskills: [] }
        units.push(u)
      }
      u.subskills.push({
        subskillId: r.subskillId, name: r.subskillName,
        isSubjectSpecific: Boolean(r.isSubjectSpecific),
        categoryName: r.categoryName, colour: r.colour, bgColour: r.bgColour,
        selfLevel: r.selfLevel, evidenceNote: r.evidenceNote,
        teacherLevel: r.teacherLevel, teacherComment: r.teacherComment,
      })
    }
    return res.json({ units })
  }

  // ── POST: upsert one rating ────────────────────────────────────────────────
  if (user.role !== 'teacher') throw new HttpError(403, 'Only teachers rate')

  const { unitId, studentId, subskillId, level, comment = null } = req.body ?? {}
  if (!unitId || !studentId || !subskillId) {
    throw new HttpError(400, 'unitId, studentId and subskillId are required')
  }
  if (!LEVELS.includes(level)) throw new HttpError(400, `level must be one of ${LEVELS.join(', ')}`)

  await assertOwnsUnit(user.id, unitId)

  // The sub-skill must actually be tagged on this unit.
  const tagged = await q1(
    `SELECT 1 AS ok FROM unit_subskills WHERE unit_id = ? AND subskill_id = ?`,
    [unitId, subskillId],
  )
  if (!tagged) throw new HttpError(400, 'That sub-skill is not part of this unit')

  await q(
    `INSERT INTO unit_ratings (unit_id, student_id, subskill_id, level, comment, rated_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE level = VALUES(level), comment = VALUES(comment),
                             rated_by = VALUES(rated_by), rated_at = CURRENT_TIMESTAMP`,
    [unitId, studentId, subskillId, level, comment, user.id],
  )
  return res.json({ ok: true })
})

// Students only see ratings once the term report for that class is published.
async function studentVisibleRatings(studentId, term) {
  return q(
    `SELECT ur.level, ur.comment, ur.rated_at AS ratedAt,
            un.id AS unitId, un.name AS unitName, un.term,
            ss.id AS subskillId, ss.name AS subskillName,
            c.name AS categoryName, c.colour, c.bg_colour AS bgColour,
            sub.name AS subjectName
       FROM unit_ratings ur
       JOIN units un         ON un.id = ur.unit_id
       JOIN sections s       ON s.id = un.section_id
       JOIN subjects sub     ON sub.id = s.subject_id
       JOIN atl_subskills ss ON ss.id = ur.subskill_id
       JOIN atl_categories c ON c.id = ss.category_id
       JOIN term_reports tr  ON tr.student_id = ur.student_id
                            AND tr.section_id = s.id
                            AND tr.term = un.term
                            AND tr.published_at IS NOT NULL
      WHERE ur.student_id = ?
        ${term ? 'AND un.term = ?' : ''}
      ORDER BY un.term, sub.name, un.name, c.sort_order`,
    term ? [studentId, term] : [studentId],
  )
}
