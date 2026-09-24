// GET  /api/units?sectionId=3            teacher: units in a class they own
// GET  /api/units?mine=1                 student: units across their enrolments,
//                                        each with their own reflection status
// POST /api/units                        teacher: create a unit + tag sub-skills
//
// A unit belongs to a section, so "which units can this person see" is answered
// by section ownership or active enrolment, never by a client-side filter.

import { handler, HttpError, assertOwnsSection } from '../_lib/auth.js'
import { q, tx } from '../_lib/db.js'

export default handler({ methods: ['GET', 'POST'] }, async (req, res, user) => {
  if (req.method === 'GET') {
    if (req.query.mine && user.role === 'student') return studentUnits(res, user)

    const sectionId = Number(req.query.sectionId)
    if (!sectionId) throw new HttpError(400, 'sectionId is required')
    if (user.role === 'teacher') await assertOwnsSection(user.id, sectionId)

    const units = await q(
      `SELECT u.id, u.term, u.name, u.description, u.is_open AS isOpen,
              u.min_subskills_required AS minSubskills,
              (SELECT COUNT(*) FROM reflections r
                WHERE r.unit_id = u.id AND r.status = 'pending')  AS pendingCount,
              (SELECT COUNT(*) FROM reflections r
                WHERE r.unit_id = u.id AND r.status = 'approved') AS approvedCount
         FROM units u
        WHERE u.section_id = ?
        ORDER BY u.term, u.name`,
      [sectionId],
    )
    await attachSubskills(units)
    return res.json({ units })
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (user.role !== 'teacher') throw new HttpError(403, 'Only teachers plan units')

  const { sectionId, term, name, description = null,
          subskillIds = [], minSubskills = 3 } = req.body ?? {}

  if (!sectionId || !term || !name?.trim()) {
    throw new HttpError(400, 'sectionId, term and name are required')
  }
  if (!['Term 1', 'Term 2', 'Term 3'].includes(term)) {
    throw new HttpError(400, 'term must be Term 1, Term 2 or Term 3')
  }
  if (!subskillIds.length) {
    throw new HttpError(400, 'Pick at least one ATL sub-skill for this unit')
  }
  if (minSubskills > subskillIds.length) {
    throw new HttpError(
      400,
      `You have asked for ${minSubskills} ticks but only picked ${subskillIds.length} sub-skills`,
      'THRESHOLD_ABOVE_TAGGED',
    )
  }

  await assertOwnsSection(user.id, sectionId)

  // Every tagged sub-skill must be valid on both axes for this section: the
  // right subject, and the right programme for the grade being taught.
  const valid = await q(
    `SELECT ss.id
       FROM atl_subskills ss
       JOIN sections s ON s.id = ?
      WHERE ss.id IN (${subskillIds.map(() => '?').join(',')})
        AND ss.is_active = 1
        AND (ss.subject_id = s.subject_id OR ss.subject_id IS NULL)
        AND (ss.programme IS NULL
             OR ss.programme = IF(s.grade LIKE 'MYP%', 'MYP', 'DP'))`,
    [sectionId, ...subskillIds],
  )
  if (valid.length !== subskillIds.length) {
    throw new HttpError(
      400,
      'One of those sub-skills does not belong to this subject or programme',
    )
  }

  const unitId = await tx(async ({ q: tq }) => {
    let id
    try {
      const r = await tq(
        `INSERT INTO units (section_id, term, name, description, min_subskills_required)
         VALUES (?, ?, ?, ?, ?)`,
        [sectionId, term, name.trim(), description, minSubskills],
      )
      id = r.insertId
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'You already have a unit with that name this term')
      }
      throw err
    }
    for (const ssId of subskillIds) {
      await tq(`INSERT INTO unit_subskills (unit_id, subskill_id) VALUES (?, ?)`, [id, ssId])
    }
    return id
  })

  return res.status(201).json({ id: unitId })
})

// ── Student view: units they can reflect on, with their own status ───────────

async function studentUnits(res, user) {
  const units = await q(
    `SELECT u.id, u.term, u.name, u.description, u.is_open AS isOpen,
            u.min_subskills_required AS minSubskills,
            sub.name AS subjectName, s.id AS sectionId,
            t.full_name AS teacherName,
            r.id     AS reflectionId,
            r.status AS reflectionStatus,
            r.teacher_feedback AS teacherFeedback
       FROM units u
       JOIN sections s       ON s.id   = u.section_id
       JOIN subjects sub     ON sub.id = s.subject_id
       JOIN users t          ON t.id   = s.teacher_id
       JOIN enrollments e    ON e.section_id = s.id
                            AND e.student_id = ?
                            AND e.status = 'active'
       JOIN academic_years y ON y.id = s.academic_year_id AND y.is_current = 1
       LEFT JOIN reflections r ON r.unit_id = u.id AND r.student_id = ?
      ORDER BY u.term, sub.name, u.name`,
    [user.id, user.id],
  )
  await attachSubskills(units)
  return res.json({ units })
}

// ── Shared: hydrate each unit with its tagged sub-skills ────────────────────

async function attachSubskills(units) {
  if (!units.length) return
  const ids = units.map(u => u.id)
  const rows = await q(
    `SELECT us.unit_id AS unitId, ss.id, ss.name, ss.descriptor,
            (ss.subject_id IS NOT NULL) AS isSubjectSpecific,
            c.id AS categoryId, c.name AS categoryName, c.colour, c.bg_colour AS bgColour
       FROM unit_subskills us
       JOIN atl_subskills ss  ON ss.id = us.subskill_id
       JOIN atl_categories c  ON c.id  = ss.category_id
      WHERE us.unit_id IN (${ids.map(() => '?').join(',')})
      ORDER BY c.sort_order, ss.name`,
    ids,
  )
  const byUnit = new Map(units.map(u => [u.id, (u.subskills = [])]))
  for (const r of rows) {
    byUnit.get(r.unitId)?.push({
      id: r.id, name: r.name, descriptor: r.descriptor,
      isSubjectSpecific: Boolean(r.isSubjectSpecific),
      categoryId: r.categoryId, categoryName: r.categoryName,
      colour: r.colour, bgColour: r.bgColour,
    })
  }
}
