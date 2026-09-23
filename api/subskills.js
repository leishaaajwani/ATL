// GET /api/subskills?subjectId=18
//
// Returns the sub-skills available when planning a unit in that subject:
// subject-scoped ones first, then generic. Thinking and Communication are the
// categories where the subject-scoped set actually differs.
//
// POST /api/subskills   { categoryId, subjectId, name, descriptor }
// Lets a teacher add a sub-skill to their own subject. created_by is stamped so
// school-authored rows are distinguishable from the seeded starter set.

import { handler, HttpError } from './_lib/auth.js'
import { q, q1 } from './_lib/db.js'

export default handler({ methods: ['GET', 'POST'] }, async (req, res, user) => {
  if (req.method === 'GET') {
    const subjectId = Number(req.query.subjectId)
    if (!subjectId) throw new HttpError(400, 'subjectId is required')

    // Programme comes from the grade being taught. An MYP 3 class must not be
    // offered "deducing a mechanism from kinetic evidence", and a DP class
    // should not see "spotting a pattern in your results".
    const grade = String(req.query.grade ?? '')
    const programme = grade.startsWith('MYP') ? 'MYP' : grade.startsWith('DP') ? 'DP' : null

    const rows = await q(
      `SELECT ss.id, ss.name, ss.descriptor, ss.subject_id AS subjectId,
              ss.programme, ss.created_by AS createdBy,
              c.id   AS categoryId,
              c.name AS categoryName,
              c.colour, c.bg_colour AS bgColour, c.sort_order AS sortOrder,
              (ss.subject_id IS NOT NULL) AS isSubjectSpecific
         FROM atl_subskills ss
         JOIN atl_categories c ON c.id = ss.category_id
        WHERE ss.is_active = 1
          AND (ss.subject_id = ? OR ss.subject_id IS NULL)
          ${programme ? 'AND (ss.programme = ? OR ss.programme IS NULL)' : ''}
        ORDER BY c.sort_order, isSubjectSpecific DESC, ss.name`,
      programme ? [subjectId, programme] : [subjectId],
    )

    // Group by category so the unit planner can render sections directly
    const byCategory = []
    for (const row of rows) {
      let group = byCategory.find(g => g.categoryId === row.categoryId)
      if (!group) {
        group = {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          colour: row.colour,
          bgColour: row.bgColour,
          subskills: [],
        }
        byCategory.push(group)
      }
      group.subskills.push({
        id: row.id,
        name: row.name,
        descriptor: row.descriptor,
        programme: row.programme,
        isSubjectSpecific: Boolean(row.isSubjectSpecific),
        isSchoolAuthored: row.createdBy !== null,
      })
    }

    return res.json({ subjectId, programme, categories: byCategory })
  }

  // POST
  if (user.role === 'student') throw new HttpError(403, 'Students cannot add sub-skills')

  const { categoryId, subjectId, name, descriptor = null } = req.body ?? {}
  if (!categoryId || !name?.trim()) {
    throw new HttpError(400, 'categoryId and name are required')
  }

  // A teacher may only add to a subject they actually teach
  if (user.role === 'teacher') {
    if (!subjectId) throw new HttpError(400, 'subjectId is required')
    const owns = await q1(
      `SELECT 1 AS ok
         FROM sections s
         JOIN academic_years y ON y.id = s.academic_year_id AND y.is_current = 1
        WHERE s.teacher_id = ? AND s.subject_id = ?
        LIMIT 1`,
      [user.id, subjectId],
    )
    if (!owns) throw new HttpError(403, 'You do not teach that subject')
  }

  try {
    const result = await q(
      `INSERT INTO atl_subskills (category_id, subject_id, name, descriptor, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [categoryId, subjectId ?? null, name.trim(), descriptor, user.id],
    )
    return res.status(201).json({ id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'That sub-skill already exists for this subject')
    }
    throw err
  }
})
