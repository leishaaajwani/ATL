// Student reflection submission.
//
// GET  /api/reflections?unitId=12   the caller's own reflection for that unit
// POST /api/reflections             submit or resubmit
//
// The gate: a student must tick at least `units.min_subskills_required` of the
// sub-skills the teacher tagged, each with an evidence note, before the
// structured prompts are accepted. Enforced here, not just in the UI, because
// the UI is not a security boundary.

import { handler, HttpError } from '../_lib/auth.js'
import { q, q1, tx } from '../_lib/db.js'

const LEVELS = ['Emerging', 'Developing', 'Proficient', 'Advanced']

const countWords = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length

export default handler({ methods: ['GET', 'POST'], roles: ['student'] }, async (req, res, user) => {
  if (req.method === 'GET') {
    const unitId = Number(req.query.unitId)
    if (!unitId) throw new HttpError(400, 'unitId is required')

    const reflection = await q1(
      `SELECT r.id, r.status, r.revision_count AS revisionCount,
              r.submitted_at AS submittedAt, r.reviewed_at AS reviewedAt,
              r.teacher_feedback AS teacherFeedback
         FROM reflections r
        WHERE r.unit_id = ? AND r.student_id = ?`,
      [unitId, user.id],
    )
    if (!reflection) return res.json({ reflection: null })

    const [ticks, answers, events] = await Promise.all([
      q(`SELECT subskill_id AS subskillId, self_level AS selfLevel,
                evidence_note AS evidenceNote
           FROM reflection_subskills WHERE reflection_id = ?`, [reflection.id]),
      q(`SELECT prompt_id AS promptId, answer_text AS answerText, word_count AS wordCount
           FROM reflection_answers WHERE reflection_id = ?`, [reflection.id]),
      q(`SELECT event, note, created_at AS createdAt
           FROM reflection_events WHERE reflection_id = ? ORDER BY created_at`, [reflection.id]),
    ])

    return res.json({ reflection: { ...reflection, ticks, answers, events } })
  }

  // ── POST: submit or resubmit ───────────────────────────────────────────────
  const { unitId, ticks = [], answers = [] } = req.body ?? {}
  if (!unitId) throw new HttpError(400, 'unitId is required')

  // The student must be actively enrolled in the section this unit belongs to.
  const unit = await q1(
    `SELECT u.id, u.name, u.is_open, u.min_subskills_required AS minRequired
       FROM units u
       JOIN sections s    ON s.id = u.section_id
       JOIN enrollments e ON e.section_id = s.id
                         AND e.student_id = ?
                         AND e.status = 'active'
      WHERE u.id = ?`,
    [user.id, unitId],
  )
  if (!unit) throw new HttpError(403, 'You are not in the class this unit belongs to')
  if (!unit.is_open) throw new HttpError(409, 'Your teacher has closed this unit')

  // Every ticked sub-skill must be one the teacher actually tagged on this unit.
  const tagged = await q(
    `SELECT subskill_id AS id FROM unit_subskills WHERE unit_id = ?`,
    [unitId],
  )
  const taggedIds = new Set(tagged.map(t => t.id))

  const cleanTicks = []
  for (const t of ticks) {
    const id = Number(t.subskillId)
    if (!taggedIds.has(id)) {
      throw new HttpError(400, 'One of those sub-skills is not on this unit')
    }
    if (!LEVELS.includes(t.selfLevel)) {
      throw new HttpError(400, `selfLevel must be one of ${LEVELS.join(', ')}`)
    }
    const note = String(t.evidenceNote ?? '').trim()
    if (note.length < 10) {
      throw new HttpError(400, 'Every sub-skill you tick needs a short note saying where you did it')
    }
    cleanTicks.push({ subskillId: id, selfLevel: t.selfLevel, evidenceNote: note.slice(0, 500) })
  }

  if (cleanTicks.length < unit.minRequired) {
    throw new HttpError(
      400,
      `Pick at least ${unit.minRequired} sub-skills before writing your reflection`,
      'BELOW_SUBSKILL_THRESHOLD',
    )
  }

  // Structured prompts, each with its own minimum.
  const prompts = await q(
    `SELECT id, sequence, question, min_words AS minWords
       FROM reflection_prompts WHERE is_active = 1 ORDER BY sequence`,
  )
  const cleanAnswers = []
  for (const p of prompts) {
    const given = answers.find(a => Number(a.promptId) === p.id)
    const text = String(given?.answerText ?? '').trim()
    const words = countWords(text)
    if (words < p.minWords) {
      throw new HttpError(
        400,
        `"${p.question}" needs ${p.minWords} words. You wrote ${words}.`,
        'ANSWER_TOO_SHORT',
      )
    }
    cleanAnswers.push({ promptId: p.id, answerText: text, wordCount: words })
  }

  const result = await tx(async ({ q: tq, q1: tq1 }) => {
    const existing = await tq1(
      `SELECT id, status, revision_count FROM reflections
        WHERE unit_id = ? AND student_id = ? FOR UPDATE`,
      [unitId, user.id],
    )

    if (existing && existing.status === 'approved') {
      throw new HttpError(409, 'Your teacher already approved this one')
    }
    if (existing && existing.status === 'pending') {
      throw new HttpError(409, 'This is already with your teacher')
    }

    let reflectionId
    let isResubmission = false

    if (existing) {
      // status was 'draft' or 'returned' -> resubmit
      isResubmission = existing.status === 'returned'
      reflectionId = existing.id
      await tq(
        `UPDATE reflections
            SET status = 'pending',
                submitted_at = CURRENT_TIMESTAMP,
                revision_count = revision_count + ?,
                reviewed_at = NULL, reviewed_by = NULL
          WHERE id = ?`,
        [isResubmission ? 1 : 0, reflectionId],
      )
      await tq(`DELETE FROM reflection_subskills WHERE reflection_id = ?`, [reflectionId])
      await tq(`DELETE FROM reflection_answers   WHERE reflection_id = ?`, [reflectionId])
    } else {
      const ins = await tq(
        `INSERT INTO reflections (unit_id, student_id, status, submitted_at)
         VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)`,
        [unitId, user.id],
      )
      reflectionId = ins.insertId
    }

    for (const t of cleanTicks) {
      await tq(
        `INSERT INTO reflection_subskills (reflection_id, subskill_id, self_level, evidence_note)
         VALUES (?, ?, ?, ?)`,
        [reflectionId, t.subskillId, t.selfLevel, t.evidenceNote],
      )
    }
    for (const a of cleanAnswers) {
      await tq(
        `INSERT INTO reflection_answers (reflection_id, prompt_id, answer_text, word_count)
         VALUES (?, ?, ?, ?)`,
        [reflectionId, a.promptId, a.answerText, a.wordCount],
      )
    }
    await tq(
      `INSERT INTO reflection_events (reflection_id, event, actor_id)
       VALUES (?, ?, ?)`,
      [reflectionId, isResubmission ? 'resubmitted' : 'submitted', user.id],
    )

    return { reflectionId, isResubmission }
  })

  return res.status(201).json({
    id: result.reflectionId,
    status: 'pending',
    resubmitted: result.isResubmission,
  })
})
