// GET /api/subjects
// The IB subject catalogue. Any signed-in user can read it; it is reference
// data, not anyone's personal information.

import { handler } from './_lib/auth.js'
import { q } from './_lib/db.js'

export default handler({ methods: ['GET'] }, async (req, res) => {
  const subjects = await q(
    `SELECT id, name, ib_group AS ibGroup
       FROM subjects WHERE is_active = 1 ORDER BY name`,
  )
  return res.json({ subjects })
})
