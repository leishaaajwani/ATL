// GET    /api/admin/users?role=teacher    the roster
// POST   /api/admin/users                 add one, or bulk-import a pasted CSV
// PATCH  /api/admin/users                 change role, grade or status
//
// Adding someone here IS the invite: their email becomes able to sign in, and
// nothing else does. There is no token to leak or forward.

import { handler, HttpError } from '../_lib/auth.js'
import { q, q1, tx } from '../_lib/db.js'

const clean = v => String(v ?? '').trim()
const email = v => clean(v).toLowerCase()
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export default handler({ methods: ['GET', 'POST', 'PATCH'], roles: ['admin'] }, async (req, res) => {
  if (req.method === 'GET') {
    const role = ['teacher', 'student', 'admin'].includes(req.query.role) ? req.query.role : null
    const users = await q(
      `SELECT u.id, u.email, u.full_name AS fullName, u.role, u.status,
              u.first_login_at AS firstLoginAt, u.created_at AS createdAt,
              tp.staff_id AS staffId, tp.department,
              sp.grade, sp.student_code AS studentCode,
              (SELECT COUNT(*) FROM sections s WHERE s.teacher_id = u.id)     AS sectionCount,
              (SELECT COUNT(*) FROM enrollments e
                WHERE e.student_id = u.id AND e.status = 'active')            AS enrolledCount,
              (SELECT COUNT(*) FROM invitations i WHERE i.user_id = u.id)     AS invitesSent
         FROM users u
         LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
        ${role ? 'WHERE u.role = ?' : ''}
        ORDER BY u.role, u.full_name`,
      role ? [role] : [],
    )
    return res.json({ users })
  }

  if (req.method === 'PATCH') {
    const { id, role, grade, status, staffId } = req.body ?? {}
    if (!id) throw new HttpError(400, 'id is required')

    const target = await q1(`SELECT id, role FROM users WHERE id = ?`, [id])
    if (!target) throw new HttpError(404, 'No such user')

    await tx(async ({ q: tq }) => {
      if (role && role !== target.role) {
        if (!['admin', 'teacher', 'student'].includes(role)) throw new HttpError(400, 'Bad role')
        await tq(`UPDATE users SET role = ? WHERE id = ?`, [role, id])
        if (role === 'teacher') await tq(`INSERT IGNORE INTO teacher_profiles (user_id) VALUES (?)`, [id])
        if (role === 'student') await tq(`INSERT IGNORE INTO student_profiles (user_id, grade) VALUES (?, 'DP1')`, [id])
      }
      if (status) {
        if (!['invited', 'active', 'disabled'].includes(status)) throw new HttpError(400, 'Bad status')
        await tq(`UPDATE users SET status = ? WHERE id = ?`, [status, id])
      }
      if (grade) {
        if (!['DP1', 'DP2'].includes(grade)) throw new HttpError(400, 'grade must be DP1 or DP2')
        await tq(`UPDATE student_profiles SET grade = ? WHERE user_id = ?`, [grade, id])
      }
      if (staffId !== undefined) {
        await tq(`UPDATE teacher_profiles SET staff_id = ? WHERE user_id = ?`, [clean(staffId) || null, id])
      }
    })
    return res.json({ id, ok: true })
  }

  // ── POST: one person, or a pasted CSV ──────────────────────────────────────
  const { csv, role: bulkRole } = req.body ?? {}
  if (csv) return bulkImport(req, res, csv, bulkRole)

  const { email: rawEmail, fullName, role = 'student', grade = 'DP1', staffId = null } = req.body ?? {}
  const e = email(rawEmail)
  if (!isEmail(e)) throw new HttpError(400, 'A valid email is required')
  if (!clean(fullName)) throw new HttpError(400, 'fullName is required')
  if (!['admin', 'teacher', 'student'].includes(role)) throw new HttpError(400, 'Bad role')

  const domain = process.env.ALLOWED_EMAIL_DOMAIN
  if (domain && !e.endsWith(`@${domain.toLowerCase()}`)) {
    throw new HttpError(400, `Only @${domain} addresses can be added`, 'WRONG_DOMAIN')
  }

  const id = await insertPerson({ email: e, fullName: clean(fullName), role, grade, staffId })
  return res.status(201).json({ id })
})

async function insertPerson({ email: e, fullName, role, grade, staffId }) {
  return tx(async ({ q: tq, q1: tq1 }) => {
    const existing = await tq1(`SELECT id FROM users WHERE email = ?`, [e])
    if (existing) throw new HttpError(409, `${e} is already on the roster`)

    const r = await tq(
      `INSERT INTO users (email, full_name, role, status, invited_at)
       VALUES (?, ?, ?, 'invited', CURRENT_TIMESTAMP)`,
      [e, fullName, role],
    )
    const id = r.insertId
    if (role === 'teacher') {
      await tq(`INSERT INTO teacher_profiles (user_id, staff_id) VALUES (?, ?)`, [id, staffId || null])
    } else if (role === 'student') {
      await tq(`INSERT INTO student_profiles (user_id, grade) VALUES (?, ?)`,
        [id, ['DP1', 'DP2'].includes(grade) ? grade : 'DP1'])
    }
    return id
  })
}

// CSV: "full name, email[, grade or staff id]" one per line. Header row optional.
async function bulkImport(req, res, csv, role) {
  if (!['teacher', 'student'].includes(role)) {
    throw new HttpError(400, "Bulk import needs role 'teacher' or 'student'")
  }
  const domain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase()

  const lines = String(csv).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const added = [], skipped = []

  for (const [i, line] of lines.entries()) {
    const cols = line.split(',').map(c => c.trim())
    const [name, rawEmail, third] = cols
    const e = email(rawEmail)

    if (i === 0 && !isEmail(e)) continue          // header row
    if (!isEmail(e))                    { skipped.push({ line, why: 'not a valid email' }); continue }
    if (!name)                          { skipped.push({ line, why: 'missing name' }); continue }
    if (domain && !e.endsWith(`@${domain}`)) { skipped.push({ line, why: `not an @${domain} address` }); continue }

    try {
      const id = await insertPerson({
        email: e, fullName: name, role,
        grade: role === 'student' ? (['DP1', 'DP2'].includes(third) ? third : 'DP1') : null,
        staffId: role === 'teacher' ? third : null,
      })
      added.push({ id, email: e, name })
    } catch (err) {
      skipped.push({ line, why: err.status === 409 ? 'already on the roster' : 'could not be added' })
    }
  }

  return res.status(201).json({ added: added.length, skipped, addedRows: added })
}
