#!/usr/bin/env node
//
// One-shot migration: Firestore -> MySQL.
//
//   node db/migrate-from-firestore.mjs --dry-run
//   node db/migrate-from-firestore.mjs
//
// Reads with the ordinary client SDK using the VITE_ config already in .env, so
// this runs today without a service-account key.
//
// The hard part is `sections`. The old data has no concept of a class: a teacher
// declared `teachingGroups` and a student declared `subjects[{name, teacher}]`,
// and the match was recomputed in the browser every render. Here that match is
// resolved once and written as real rows, which is the whole point of moving.
//
// Old entries carry an ATL *category*, not a sub-skill. They are mapped onto the
// first generic sub-skill of that category and the evidence note says so, so
// legacy rows never masquerade as real sub-skill evidence.

import 'dotenv/config'
import mysql from 'mysql2/promise'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const DRY = process.argv.includes('--dry-run')
const clean = v => String(v ?? '').trim().toLowerCase()
const log = (...a) => console.log(...a)

// ── Connect ──────────────────────────────────────────────────────────────────

const fb = initializeApp({
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
})
const fs = getFirestore(fb)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. See db/README.md')
  process.exit(1)
}
const db = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: false })

async function readAll(name) {
  const snap = await getDocs(collection(fs, name))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Dry run must hand back truthy ids, otherwise every downstream `if (!id)`
// check trips and the run reports failures that would not happen for real.
let dryId = 100000
const q = async (sql, params = []) => {
  if (DRY && /^\s*INSERT/i.test(sql))          return { insertId: ++dryId, affectedRows: 1 }
  if (DRY && /^\s*(UPDATE|DELETE)/i.test(sql)) return { affectedRows: 0 }
  const [r] = await db.execute(sql, params)
  return r
}

// ── Pull everything ──────────────────────────────────────────────────────────

log(DRY ? '\n=== DRY RUN, nothing will be written ===\n' : '\n=== MIGRATING ===\n')

const [fsUsers, fsUnits, fsEntries, fsRatings] = await Promise.all([
  readAll('users'),
  readAll('units'),
  readAll('atl_entries'),
  readAll('unit_ratings').catch(() => {
    log('note: unit_ratings collection is absent, skipping teacher ratings')
    return []
  }),
])

log(`firestore: ${fsUsers.length} users, ${fsUnits.length} units, ` +
    `${fsEntries.length} entries, ${fsRatings.length} ratings`)

const yearRow = await q(`SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1`)
const yearId = yearRow[0]?.id
if (!yearId) { console.error('No current academic year. Run db/seeds/001_reference.sql first.'); process.exit(1) }

const subjectRows = await q(`SELECT id, name FROM subjects`)
const subjectByName = new Map(subjectRows.map(s => [clean(s.name), s.id]))

// ── 1. Users ─────────────────────────────────────────────────────────────────

const uidToDbId = new Map()   // firestore uid -> mysql users.id
const teachersByName = new Map()

// The old data lets one email exist twice with different roles (Leishaa is both
// a teacher and a student on leishaa@atpstem.net). MySQL has one row per email,
// so resolve the conflict deliberately rather than letting write order decide:
// teacher wins, because a teacher row carries sections that students do not.
const roleByEmail = new Map()
for (const u of fsUsers) {
  const email = clean(u.email)
  if (!email) continue
  const role = u.role === 'teacher' ? 'teacher' : 'student'
  if (roleByEmail.get(email) === 'teacher') continue
  roleByEmail.set(email, role)
}
const conflicted = [...new Set(fsUsers.map(u => clean(u.email)))].filter(e => {
  const roles = new Set(fsUsers.filter(u => clean(u.email) === e)
    .map(u => (u.role === 'teacher' ? 'teacher' : 'student')))
  return e && roles.size > 1
})
for (const e of conflicted) {
  log(`  ! ${e} exists as both teacher and student. Migrating as teacher.`)
}

for (const u of fsUsers) {
  const email = clean(u.email)
  if (!email) { log(`  skip user ${u.id}: no email`); continue }
  const role = roleByEmail.get(email)
  const name = u.displayName ?? email

  const existing = await q(`SELECT id FROM users WHERE email = ?`, [email])
  let id = existing[0]?.id

  if (!id) {
    const r = await q(
      `INSERT INTO users (google_sub, email, full_name, photo_url, role, status, first_login_at)
       VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
      [u.id, email, name, u.photoURL ?? null, role],
    )
    id = r.insertId
  }
  uidToDbId.set(u.id, id)

  if (role === 'teacher') {
    await q(`INSERT IGNORE INTO teacher_profiles (user_id) VALUES (?)`, [id])
    teachersByName.set(clean(name), id)
  } else {
    const grade = ['DP1', 'DP2'].includes(u.grade) ? u.grade : 'DP1'
    await q(`INSERT IGNORE INTO student_profiles (user_id, grade) VALUES (?, ?)`, [id, grade])
  }
}
log(`users:    ${uidToDbId.size} mapped (${teachersByName.size} teachers)`)

// ── 2. Sections, derived from teachingGroups + the units that exist ──────────

const sectionKey = (subjectId, teacherId, grade) => `${subjectId}|${teacherId}|${grade}`
const sections = new Map()

async function ensureSection(subjectName, teacherName, grade) {
  const subjectId = subjectByName.get(clean(subjectName))
  const teacherId = teachersByName.get(clean(teacherName))
  if (!subjectId || !teacherId) return null

  const key = sectionKey(subjectId, teacherId, grade)
  if (sections.has(key)) return sections.get(key)

  const found = await q(
    `SELECT id FROM sections
      WHERE subject_id = ? AND teacher_id = ? AND grade = ? AND label = '' AND academic_year_id = ?`,
    [subjectId, teacherId, grade, yearId],
  )
  let id = found[0]?.id
  if (!id) {
    const r = await q(
      `INSERT INTO sections (subject_id, teacher_id, grade, label, academic_year_id)
       VALUES (?, ?, ?, '', ?)`,
      [subjectId, teacherId, grade, yearId],
    )
    id = r.insertId ?? `dry-${key}`
  }
  sections.set(key, id)
  return id
}

for (const u of fsUsers.filter(x => x.role === 'teacher')) {
  for (const g of u.teachingGroups ?? []) {
    if (g?.subject && g?.grade) await ensureSection(g.subject, u.displayName, g.grade)
  }
}
log(`sections: ${sections.size} derived from teachingGroups`)

// ── 3. Enrollments, from each student's declared subjects ────────────────────

let enrolled = 0, unmatched = 0
for (const u of fsUsers.filter(x => x.role !== 'teacher')) {
  const studentId = uidToDbId.get(u.id)
  const grade = ['DP1', 'DP2'].includes(u.grade) ? u.grade : 'DP1'
  for (const s of u.subjects ?? []) {
    const sectionId = await ensureSection(s.name, s.teacher, grade)
    if (!sectionId) { unmatched++; continue }
    await q(
      `INSERT IGNORE INTO enrollments (section_id, student_id, status, source, approved_at)
       VALUES (?, ?, 'active', 'roster', CURRENT_TIMESTAMP)`,
      [sectionId, studentId],
    )
    enrolled++
  }
}
log(`enroll:   ${enrolled} active${unmatched ? `, ${unmatched} unmatched (subject or teacher name not found)` : ''}`)

// ── 4. Units, plus their tagged sub-skills ──────────────────────────────────

const unitIdMap = new Map()   // firestore unit id -> mysql units.id
const TERMS = { 'Term 1': 'Term 1', 'Term 2': 'Term 2', 'Term 3': 'Term 3' }

// category name -> its first generic sub-skill, for mapping old category tags
const genericByCategory = new Map()
for (const row of await q(
  `SELECT c.name AS cat, MIN(ss.id) AS ssId
     FROM atl_subskills ss JOIN atl_categories c ON c.id = ss.category_id
    WHERE ss.subject_id IS NULL GROUP BY c.name`,
)) genericByCategory.set(row.cat, row.ssId)

for (const u of fsUnits) {
  // Old units have no grade. Fall back to any section for that subject+teacher.
  const subjectId = subjectByName.get(clean(u.subject))
  const teacherId = teachersByName.get(clean(u.teacherName))
  if (!subjectId || !teacherId) { log(`  skip unit "${u.unitName}": no matching subject/teacher`); continue }

  let sectionId = [...sections.entries()]
    .find(([k]) => k.startsWith(`${subjectId}|${teacherId}|`))?.[1]
  if (!sectionId) sectionId = await ensureSection(u.subject, u.teacherName, 'DP1')
  if (!sectionId) continue

  const term = TERMS[u.term] ?? 'Term 1'
  const found = await q(
    `SELECT id FROM units WHERE section_id = ? AND term = ? AND name = ?`,
    [sectionId, term, u.unitName],
  )
  let unitId = found[0]?.id
  if (!unitId) {
    const r = await q(
      `INSERT INTO units (section_id, term, name, min_subskills_required)
       VALUES (?, ?, ?, ?)`,
      [sectionId, term, u.unitName, Math.min(3, (u.atlSkills ?? []).length || 1)],
    )
    unitId = r.insertId ?? `dry-${u.id}`
  }
  unitIdMap.set(u.id, unitId)

  // Old units tagged whole categories. Map each to that category's first
  // generic sub-skill so the unit still has something students can tick.
  for (const cat of u.atlSkills ?? []) {
    const ssId = genericByCategory.get(cat)
    if (ssId) await q(`INSERT IGNORE INTO unit_subskills (unit_id, subskill_id) VALUES (?, ?)`, [unitId, ssId])
  }
}
log(`units:    ${unitIdMap.size} migrated`)

// ── 5. Entries -> reflections ───────────────────────────────────────────────

const prompts = await q(`SELECT id, sequence FROM reflection_prompts WHERE is_active = 1 ORDER BY sequence`)
const firstPrompt = prompts[0]?.id

// Old model created one entry per ATL skill sharing a unitSubmissionId.
// New model is one reflection per (unit, student), so collapse them.
const grouped = new Map()
for (const e of fsEntries) {
  const key = e.unitSubmissionId ?? `${e.studentId}_${e.unitId ?? e.subject}_${e.atlCategory}`
  if (!grouped.has(key)) grouped.set(key, [])
  grouped.get(key).push(e)
}

const STATUS = { approved: 'approved', rejected: 'returned', pending: 'pending' }
let reflectionCount = 0
const skipped = { noUnitRef: 0, unitMissing: 0, studentMissing: 0 }

for (const [, group] of grouped) {
  const head = group[0]
  const studentId = uidToDbId.get(head.studentId)
  const unitId = unitIdMap.get(head.unitId)

  if (!studentId)      { skipped.studentMissing += group.length; continue }
  if (!head.unitId)    { skipped.noUnitRef     += group.length; continue }
  if (!unitId)         { skipped.unitMissing   += group.length; continue }

  const status = STATUS[head.approvalStatus] ?? 'pending'
  const existing = await q(`SELECT id FROM reflections WHERE unit_id = ? AND student_id = ?`, [unitId, studentId])
  if (existing[0]) continue

  const r = await q(
    `INSERT INTO reflections (unit_id, student_id, status, submitted_at, reviewed_at, teacher_feedback)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [unitId, studentId, status,
     head.createdAt?.toDate?.() ?? new Date(),
     status === 'pending' ? null : (head.reviewedAt?.toDate?.() ?? new Date()),
     head.teacherFeedback ?? null],
  )
  const reflectionId = r.insertId
  if (!reflectionId) continue

  for (const e of group) {
    const ssId = genericByCategory.get(e.atlCategory)
    if (!ssId) continue
    await q(
      `INSERT IGNORE INTO reflection_subskills (reflection_id, subskill_id, self_level, evidence_note)
       VALUES (?, ?, ?, ?)`,
      [reflectionId, ssId, e.selfAssessment ?? 'Developing',
       'Migrated from the previous system, recorded at category level.'],
    )
  }
  if (firstPrompt && head.reflection) {
    await q(
      `INSERT IGNORE INTO reflection_answers (reflection_id, prompt_id, answer_text, word_count)
       VALUES (?, ?, ?, ?)`,
      [reflectionId, firstPrompt, head.reflection,
       String(head.reflection).trim().split(/\s+/).filter(Boolean).length],
    )
  }
  reflectionCount++
}
log(`reflect:  ${reflectionCount} reflections migrated`)
if (skipped.noUnitRef)     log(`          ${skipped.noUnitRef} entries skipped: predate the unit system, no unit to attach to`)
if (skipped.unitMissing)   log(`          ${skipped.unitMissing} entries skipped: their unit did not migrate`)
if (skipped.studentMissing) log(`          ${skipped.studentMissing} entries skipped: student account not found`)

// ── 6. Teacher unit ratings ─────────────────────────────────────────────────

let ratingCount = 0
for (const r of fsRatings) {
  const studentId = uidToDbId.get(r.studentId)
  const unitId = unitIdMap.get(r.unitId)
  const ssId = genericByCategory.get(r.atl)
  const raterId = uidToDbId.get(r.teacherUid) ?? studentId
  if (!studentId || !unitId || !ssId) continue
  await q(
    `INSERT IGNORE INTO unit_ratings (unit_id, student_id, subskill_id, level, rated_by)
     VALUES (?, ?, ?, ?, ?)`,
    [unitId, studentId, ssId, r.level ?? 'Developing', raterId],
  )
  ratingCount++
}
log(`ratings:  ${ratingCount} migrated`)

log(DRY ? '\nDry run complete. Re-run without --dry-run to write.\n' : '\nMigration complete.\n')
await db.end()
process.exit(0)
