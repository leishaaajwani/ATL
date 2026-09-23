// POST /api/reflections/review   { reflectionId, action: 'approve'|'return', feedback }
//
// Closes the loop you asked about. A returned reflection stays attached to its
// unit, so the student's "needs revision" card points at exactly that unit and
// nothing else counts as addressing it. reflection_events keeps the trail, so
// you can prove a returned entry was actually revised rather than replaced by an
// unrelated new submission.

import { handler, HttpError } from '../_lib/auth.js'
import { q1, tx } from '../_lib/db.js'

export default handler({ methods: ['POST'], roles: ['teacher'] }, async (req, res, user) => {
  const { reflectionId, action, feedback = null } = req.body ?? {}

  if (!reflectionId) throw new HttpError(400, 'reflectionId is required')
  if (!['approve', 'return'].includes(action)) {
    throw new HttpError(400, "action must be 'approve' or 'return'")
  }
  if (action === 'return' && !String(feedback ?? '').trim()) {
    throw new HttpError(400, 'Returning a reflection requires feedback for the student')
  }

  // Ownership: the reflection must sit in a unit in a section this teacher owns.
  const reflection = await q1(
    `SELECT r.id, r.status
       FROM reflections r
       JOIN units u    ON u.id = r.unit_id
       JOIN sections s ON s.id = u.section_id
      WHERE r.id = ? AND s.teacher_id = ?`,
    [reflectionId, user.id],
  )
  if (!reflection) throw new HttpError(403, 'That reflection is not yours to review')
  if (reflection.status !== 'pending') {
    throw new HttpError(409, `This reflection is ${reflection.status}, not awaiting review`)
  }

  const newStatus = action === 'approve' ? 'approved' : 'returned'

  await tx(async ({ q: tq }) => {
    await tq(
      `UPDATE reflections
          SET status = ?, reviewed_at = CURRENT_TIMESTAMP,
              reviewed_by = ?, teacher_feedback = ?
        WHERE id = ?`,
      [newStatus, user.id, feedback ? String(feedback).trim() : null, reflectionId],
    )
    await tq(
      `INSERT INTO reflection_events (reflection_id, event, actor_id, note)
       VALUES (?, ?, ?, ?)`,
      [reflectionId, action === 'approve' ? 'approved' : 'returned', user.id, feedback ?? null],
    )
  })

  return res.json({ id: reflectionId, status: newStatus })
})
