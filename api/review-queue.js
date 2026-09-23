// GET /api/review-queue?status=pending
//
// Everything awaiting the teacher's review, across every class they own, with
// the full reflection inlined so the approvals page needs one request rather
// than one per entry.

import { handler } from './_lib/auth.js'
import { q } from './_lib/db.js'

export default handler({ methods: ['GET'], roles: ['teacher'] }, async (req, res, user) => {
  const status = ['pending', 'approved', 'returned'].includes(req.query.status)
    ? req.query.status
    : 'pending'

  const reflections = await q(
    `SELECT r.id, r.status, r.revision_count AS revisionCount,
            r.submitted_at AS submittedAt, r.reviewed_at AS reviewedAt,
            r.teacher_feedback AS teacherFeedback,
            st.id AS studentId, st.full_name AS studentName, st.photo_url AS photoUrl,
            un.id AS unitId, un.name AS unitName, un.term,
            sub.name AS subjectName, s.id AS sectionId, s.grade
       FROM reflections r
       JOIN users st     ON st.id = r.student_id
       JOIN units un     ON un.id = r.unit_id
       JOIN sections s   ON s.id  = un.section_id
       JOIN subjects sub ON sub.id = s.subject_id
      WHERE s.teacher_id = ? AND r.status = ?
      ORDER BY r.submitted_at DESC
      LIMIT 200`,
    [user.id, status],
  )

  if (!reflections.length) return res.json({ reflections: [] })

  const ids = reflections.map(r => r.id)
  const ph = ids.map(() => '?').join(',')

  const [ticks, answers] = await Promise.all([
    q(`SELECT rs.reflection_id AS reflectionId, rs.self_level AS selfLevel,
              rs.evidence_note AS evidenceNote,
              ss.id AS subskillId, ss.name AS subskillName,
              (ss.subject_id IS NOT NULL) AS isSubjectSpecific,
              c.name AS categoryName, c.colour, c.bg_colour AS bgColour
         FROM reflection_subskills rs
         JOIN atl_subskills ss  ON ss.id = rs.subskill_id
         JOIN atl_categories c  ON c.id = ss.category_id
        WHERE rs.reflection_id IN (${ph})
        ORDER BY c.sort_order, ss.name`, ids),
    q(`SELECT ra.reflection_id AS reflectionId, ra.answer_text AS answerText,
              ra.word_count AS wordCount, p.sequence, p.question
         FROM reflection_answers ra
         JOIN reflection_prompts p ON p.id = ra.prompt_id
        WHERE ra.reflection_id IN (${ph})
        ORDER BY p.sequence`, ids),
  ])

  const byId = new Map(reflections.map(r => [r.id, Object.assign(r, { ticks: [], answers: [] })]))
  for (const t of ticks)  byId.get(t.reflectionId)?.ticks.push({ ...t, isSubjectSpecific: Boolean(t.isSubjectSpecific) })
  for (const a of answers) byId.get(a.reflectionId)?.answers.push(a)

  return res.json({ reflections })
})
