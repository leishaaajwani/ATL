// Evidence attached to a reflection.
//
// POST   /api/evidence            student uploads a file (base64 JSON body)
// GET    /api/evidence?reflectionId=12   list files on a reflection
// GET    /api/evidence?id=5&download=1   stream one file back
// DELETE /api/evidence            student removes their own, before submitting
//
// Base64 in a JSON body rather than multipart: it keeps the handler dependency
// free and serverless-safe, and at an 8 MB cap the ~33% encoding overhead is
// cheaper than pulling in a multipart parser.

import { handler, HttpError } from './_lib/auth.js'
import { q, q1 } from './_lib/db.js'
import { put, get, remove, backendInUse, MAX_BYTES, ALLOWED_TYPES } from './_lib/storage.js'

export default handler({ methods: ['GET', 'POST', 'DELETE'] }, async (req, res, user) => {
  if (req.method === 'GET')    return read(req, res, user)
  if (req.method === 'DELETE') return destroy(req, res, user)
  return upload(req, res, user)
})

// ── Who may see which files ─────────────────────────────────────────────────
// The student who wrote the reflection, or the teacher who owns the class it
// sits in. Nobody else, and this is the only place that decides it.
async function reflectionAccess(reflectionId, user) {
  if (user.role === 'student') {
    return q1(`SELECT id FROM reflections WHERE id = ? AND student_id = ?`,
      [reflectionId, user.id])
  }
  if (user.role === 'teacher') {
    return q1(
      `SELECT r.id FROM reflections r
         JOIN units u    ON u.id = r.unit_id
         JOIN sections s ON s.id = u.section_id
        WHERE r.id = ? AND s.teacher_id = ?`,
      [reflectionId, user.id],
    )
  }
  return null
}

async function read(req, res, user) {
  if (req.query.id) {
    const file = await q1(
      `SELECT id, reflection_id AS reflectionId, file_name AS fileName,
              content_type AS contentType, size_bytes AS sizeBytes,
              storage_key AS storageKey, backend
         FROM evidence_files WHERE id = ?`,
      [Number(req.query.id)],
    )
    if (!file) throw new HttpError(404, 'No such file')
    if (!await reflectionAccess(file.reflectionId, user)) {
      throw new HttpError(403, 'That file is not yours to open')
    }

    const buf = await get(file.storageKey, file.backend)
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`)
    res.setHeader('Content-Length', buf.length)
    return res.status(200).end(buf)
  }

  const reflectionId = Number(req.query.reflectionId)
  if (!reflectionId) throw new HttpError(400, 'reflectionId or id is required')
  if (!await reflectionAccess(reflectionId, user)) {
    throw new HttpError(403, 'That reflection is not yours')
  }

  const files = await q(
    `SELECT id, subskill_id AS subskillId, file_name AS fileName,
            content_type AS contentType, size_bytes AS sizeBytes,
            uploaded_at AS uploadedAt
       FROM evidence_files WHERE reflection_id = ? ORDER BY uploaded_at`,
    [reflectionId],
  )
  return res.json({ files })
}

async function upload(req, res, user) {
  if (user.role !== 'student') throw new HttpError(403, 'Only students attach evidence')

  const { unitId, subskillId = null, fileName, contentType, dataBase64 } = req.body ?? {}
  if (!unitId || !fileName || !contentType || !dataBase64) {
    throw new HttpError(400, 'unitId, fileName, contentType and dataBase64 are required')
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new HttpError(400, `${contentType} is not an accepted file type`, 'BAD_TYPE')
  }

  const buffer = Buffer.from(dataBase64, 'base64')
  if (!buffer.length) throw new HttpError(400, 'That file is empty')
  if (buffer.length > MAX_BYTES) {
    throw new HttpError(400, `Files must be under ${MAX_BYTES / 1024 / 1024} MB`, 'TOO_LARGE')
  }

  // The student must be actively enrolled in the class this unit belongs to.
  const unit = await q1(
    `SELECT u.id FROM units u
       JOIN sections s    ON s.id = u.section_id
       JOIN enrollments e ON e.section_id = s.id
                         AND e.student_id = ? AND e.status = 'active'
      WHERE u.id = ?`,
    [user.id, unitId],
  )
  if (!unit) throw new HttpError(403, 'That unit is not open to you')

  // Attach to the existing reflection, or open a draft to hold the file while
  // the student is still writing.
  let reflection = await q1(
    `SELECT id, status FROM reflections WHERE unit_id = ? AND student_id = ?`,
    [unitId, user.id],
  )
  if (reflection && ['pending', 'approved'].includes(reflection.status)) {
    throw new HttpError(409, `This reflection is ${reflection.status} and cannot be changed`)
  }
  if (!reflection) {
    const ins = await q(
      `INSERT INTO reflections (unit_id, student_id, status) VALUES (?, ?, 'draft')`,
      [unitId, user.id],
    )
    reflection = { id: ins.insertId }
  }

  const { storageKey, backend } = await put({
    buffer, contentType, studentId: user.id, reflectionId: reflection.id, fileName,
  })

  const ins = await q(
    `INSERT INTO evidence_files
       (reflection_id, subskill_id, file_name, content_type, size_bytes,
        storage_key, backend, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [reflection.id, subskillId || null, fileName, contentType,
     buffer.length, storageKey, backend, user.id],
  )

  return res.status(201).json({
    id: ins.insertId,
    reflectionId: reflection.id,
    fileName,
    contentType,
    sizeBytes: buffer.length,
    subskillId: subskillId || null,
    storedWith: backendInUse(),
  })
}

async function destroy(req, res, user) {
  const id = Number(req.body?.id ?? req.query.id)
  if (!id) throw new HttpError(400, 'id is required')

  const file = await q1(
    `SELECT ef.id, ef.storage_key AS storageKey, ef.backend,
            r.status, r.student_id AS studentId
       FROM evidence_files ef
       JOIN reflections r ON r.id = ef.reflection_id
      WHERE ef.id = ?`,
    [id],
  )
  if (!file) throw new HttpError(404, 'No such file')
  if (user.role !== 'student' || file.studentId !== user.id) {
    throw new HttpError(403, 'Only the student who uploaded it can remove it')
  }
  if (['pending', 'approved'].includes(file.status)) {
    throw new HttpError(409, 'You cannot change evidence once it is submitted')
  }

  await q(`DELETE FROM evidence_files WHERE id = ?`, [id])
  await remove(file.storageKey, file.backend)
  return res.json({ id, deleted: true })
}
