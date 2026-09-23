#!/usr/bin/env node
// End-to-end exercise of the API route handlers against the real local MySQL.
// Firebase token verification is the only thing stubbed: everything else is the
// production code path, including every ownership check.
//
//   node db/smoke-test.mjs
import 'dotenv/config'
import { q, pool } from '../api/_lib/db.js'

let pass = 0, fail = 0
const ok  = (n, c) => { c ? (pass++, console.log(`  ok   ${n}`)) : (fail++, console.log(`  FAIL ${n}`)) }
const sec = n => console.log(`\n${n}`)

// Supply our own identity via the production-gated test seam.
const { __setAuthenticatorForTests } = await import('../api/_lib/auth.js')
let currentUser = null
__setAuthenticatorForTests(async () => currentUser)

// Minimal req/res doubles
const mkRes = () => {
  const r = { statusCode: 200, body: null, headers: {} }
  r.status = c => { r.statusCode = c; return r }
  r.json   = b => { r.body = b; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}
const call = async (mod, { method = 'GET', query = {}, body } = {}) => {
  const res = mkRes()
  await mod.default({ method, query, body, headers: { authorization: 'Bearer stub' }, url: '/t' }, res)
  return res
}

// ── Set up a clean scenario ──────────────────────────────────────────────────
sec('Setting up test data')
const yearId = (await q(`SELECT id FROM academic_years WHERE is_current=1`))[0].id
const chem   = (await q(`SELECT id FROM subjects WHERE name='Chemistry'`))[0].id

// Clear residue from any earlier run, in dependency order. A previous run that
// died mid-way leaves sections pointing at its teacher, and those block the
// user delete, so the next run starts dirty and fails on setup rather than on
// anything real.
const stale = (await q(`SELECT id FROM users WHERE email LIKE 'smoke+%'`)).map(u => u.id)
if (stale.length) {
  const ph = stale.map(() => '?').join(',')
  await q(`DELETE FROM sections    WHERE teacher_id IN (${ph})`, stale)
  await q(`DELETE FROM enrollments WHERE student_id IN (${ph})`, stale)
  await q(`DELETE FROM reflections WHERE student_id IN (${ph})`, stale)
  await q(`DELETE FROM users       WHERE id         IN (${ph})`, stale)
}

const mk = async (email, name, role) =>
  (await q(`INSERT INTO users (email, full_name, role, status, google_sub)
            VALUES (?,?,?,'active',?)`, [email, name, role, 'stub_'+email])).insertId

const teacherId = await mk('smoke+t@test.local', 'Test Teacher', 'teacher')
const s1Id      = await mk('smoke+s1@test.local', 'Student One', 'student')
const s2Id      = await mk('smoke+s2@test.local', 'Student Two', 'student')
const otherTId  = await mk('smoke+t2@test.local', 'Other Teacher', 'teacher')
await q(`INSERT INTO teacher_profiles (user_id) VALUES (?),(?)`, [teacherId, otherTId])
await q(`INSERT INTO student_profiles (user_id, grade) VALUES (?,'DP1'),(?,'DP1')`, [s1Id, s2Id])
console.log(`  teacher=${teacherId} students=${s1Id},${s2Id} intruder=${otherTId}`)

const TEACHER = { id: teacherId, role: 'teacher', email: 'smoke+t@test.local', full_name: 'Test Teacher' }
const STUDENT = { id: s1Id, role: 'student', email: 'smoke+s1@test.local', full_name: 'Student One' }
const OTHER_T = { id: otherTId, role: 'teacher', email: 'smoke+t2@test.local', full_name: 'Other Teacher' }

const sections    = await import('../api/sections.js')
const enrollments = await import('../api/enrollments.js')
const units       = await import('../api/units/index.js')
const subskills   = await import('../api/subskills.js')
const reflections = await import('../api/reflections/index.js')
const review      = await import('../api/reflections/review.js')
const ratings     = await import('../api/ratings.js')

// ── 1. Teacher declares a class ─────────────────────────────────────────────
sec('1. Teacher declares a Chemistry DP1 class')
currentUser = TEACHER
let r = await call(sections, { method: 'POST', body: { subjectId: chem, grade: 'DP1' } })
ok('section created', r.statusCode === 201)
const sectionId = r.body.id

// ── 2. Student joins, teacher confirms ──────────────────────────────────────
sec('2. Student requests to join, teacher confirms')
currentUser = STUDENT
r = await call(enrollments, { method: 'POST', body: { sectionId } })
ok('join request accepted', r.statusCode === 201 && r.body.status === 'pending')

currentUser = TEACHER
r = await call(sections, { query: { id: sectionId, roster: 1 } })
const enrolId = r.body.students[0]?.enrollmentId
ok('student shows as pending on roster', r.body.students[0]?.enrollmentStatus === 'pending')

r = await call(enrollments, { method: 'PATCH', body: { enrollmentId: enrolId, action: 'approve' } })
ok('teacher confirmed enrolment', r.body.status === 'active')

// ── 3. Subject-specific sub-skills ──────────────────────────────────────────
sec('3. Chemistry offers subject-specific sub-skills, split by programme')
// The grade decides the programme, exactly as the real client sends it.
r = await call(subskills, { query: { subjectId: chem, grade: 'DP1' } })
const thinking = r.body.categories.find(c => c.categoryName === 'Thinking')
const chemOnly = thinking.subskills.filter(s => s.isSubjectSpecific)
ok('programme resolved from grade', r.body.programme === 'DP')
ok('Thinking has Chemistry-specific sub-skills', chemOnly.length > 0)
ok('subject-specific sorted first', thinking.subskills[0].isSubjectSpecific === true)
ok('generic ones still offered', thinking.subskills.some(s => !s.isSubjectSpecific))
console.log(`       DP e.g. "${chemOnly[0].name}"`)

const rMyp = await call(subskills, { query: { subjectId: chem, grade: 'MYP4' } })
const mypThinking = rMyp.body.categories.find(c => c.categoryName === 'Thinking')
const mypChemOnly = mypThinking.subskills.filter(s => s.isSubjectSpecific)
ok('MYP grade resolves to the MYP programme', rMyp.body.programme === 'MYP')
ok('MYP gets a different Chemistry set',
   mypChemOnly.length > 0 &&
   !mypChemOnly.some(m => chemOnly.some(d => d.name === m.name)))
console.log(`       MYP e.g. "${mypChemOnly[0].name}"`)

// ── 4. Unit planning with tagged sub-skills ─────────────────────────────────
sec('4. Teacher plans a unit tagging 4 sub-skills, threshold 3')
// Three subject-specific plus one generic, all valid for a DP Chemistry class.
const generic = thinking.subskills.find(s => !s.isSubjectSpecific)
const tagged = [...chemOnly.slice(0, 3), generic].map(s => s.id)
r = await call(units, { method: 'POST', body: {
  sectionId, term: 'Term 1', name: 'Rates of Reaction',
  subskillIds: tagged, minSubskills: 3 } })
ok('unit created', r.statusCode === 201)
const unitId = r.body.id

r = await call(units, { method: 'POST', body: {
  sectionId, term: 'Term 1', name: 'Bad Unit', subskillIds: tagged, minSubskills: 5 } })
ok('rejects threshold above tagged count', r.statusCode === 400)

const litOnly = (await q(
  `SELECT ss.id FROM atl_subskills ss JOIN subjects s ON s.id=ss.subject_id
    WHERE s.name='English Literature' LIMIT 1`))[0].id
r = await call(units, { method: 'POST', body: {
  sectionId, term: 'Term 1', name: 'Wrong Subject', subskillIds: [litOnly], minSubskills: 1 } })
ok('rejects a Literature sub-skill on a Chemistry unit', r.statusCode === 400)

r = await call(units, { method: 'POST', body: {
  sectionId, term: 'Term 1', name: 'Wrong Programme',
  subskillIds: [mypChemOnly[0].id], minSubskills: 1 } })
ok('rejects an MYP sub-skill on a DP class', r.statusCode === 400)

// ── 5. The gate ─────────────────────────────────────────────────────────────
sec('5. Reflection is gated on ticking enough sub-skills')
currentUser = STUDENT
const goodAnswers = [
  { promptId: 1, answerText: 'word '.repeat(45) },
  { promptId: 2, answerText: 'word '.repeat(55) },
  { promptId: 3, answerText: 'word '.repeat(35) },
]
r = await call(reflections, { method: 'POST', body: { unitId,
  ticks: tagged.slice(0, 2).map(id => ({ subskillId: id, selfLevel: 'Proficient',
    evidenceNote: 'I did this in the titration practical.' })),
  answers: goodAnswers } })
ok('2 ticks rejected when 3 required', r.statusCode === 400 && r.body.code === 'BELOW_SUBSKILL_THRESHOLD')

const fullTicks = tagged.slice(0, 3).map(id => ({ subskillId: id, selfLevel: 'Proficient',
  evidenceNote: 'I did this in the titration practical.' }))
r = await call(reflections, { method: 'POST', body: { unitId, ticks: fullTicks,
  answers: [{ promptId: 1, answerText: 'too short' }, ...goodAnswers.slice(1)] } })
ok('short answer rejected', r.statusCode === 400 && r.body.code === 'ANSWER_TOO_SHORT')

r = await call(reflections, { method: 'POST', body: { unitId, ticks: fullTicks,
  answers: goodAnswers } })
ok('valid submission accepted', r.statusCode === 201 && r.body.status === 'pending')
const reflectionId = r.body.id

r = await call(reflections, { method: 'POST', body: { unitId, ticks: fullTicks, answers: goodAnswers } })
ok('cannot submit twice while pending', r.statusCode === 409)

// ── 6. Untagged sub-skill rejected ──────────────────────────────────────────
sec('6. Cannot tick a sub-skill the teacher did not tag')
await q(`UPDATE reflections SET status='draft' WHERE id=?`, [reflectionId])
r = await call(reflections, { method: 'POST', body: { unitId,
  ticks: [...fullTicks, { subskillId: litOnly, selfLevel: 'Advanced', evidenceNote: 'not on this unit' }],
  answers: goodAnswers } })
ok('untagged sub-skill rejected', r.statusCode === 400)
await q(`UPDATE reflections SET status='pending' WHERE id=?`, [reflectionId])

// ── 7. Cross-teacher isolation ──────────────────────────────────────────────
sec('7. Another teacher cannot touch this data')
currentUser = OTHER_T
r = await call(sections, { query: { id: sectionId, roster: 1 } })
ok('other teacher blocked from roster', r.statusCode === 403)
r = await call(review, { method: 'POST', body: { reflectionId, action: 'approve' } })
ok('other teacher cannot approve', r.statusCode === 403)
r = await call(ratings, { method: 'POST', body: {
  unitId, studentId: s1Id, subskillId: tagged[0], level: 'Advanced' } })
ok('other teacher cannot rate', r.statusCode === 403)

// ── 8. Return, revise, approve ──────────────────────────────────────────────
sec('8. The full approval loop')
currentUser = TEACHER
r = await call(review, { method: 'POST', body: { reflectionId, action: 'return' } })
ok('return without feedback rejected', r.statusCode === 400)

r = await call(review, { method: 'POST', body: { reflectionId, action: 'return',
  feedback: 'Give a concrete example for the second sub-skill.' } })
ok('returned with feedback', r.body.status === 'returned')

currentUser = STUDENT
r = await call(reflections, { method: 'POST', body: { unitId, ticks: fullTicks, answers: goodAnswers } })
ok('student resubmits the same reflection', r.statusCode === 201 && r.body.resubmitted === true)

const evts = await q(`SELECT event FROM reflection_events WHERE reflection_id=? ORDER BY id`, [reflectionId])
ok('audit trail proves the revision',
   evts.map(e => e.event).join(',') === 'submitted,returned,resubmitted')
console.log(`       trail: ${evts.map(e => e.event).join(' -> ')}`)

currentUser = TEACHER
r = await call(review, { method: 'POST', body: { reflectionId, action: 'approve', feedback: 'Much better.' } })
ok('approved', r.body.status === 'approved')

// ── 9. Per-sub-skill rating ─────────────────────────────────────────────────
sec('9. Teacher rates each sub-skill separately')
await call(ratings, { method: 'POST', body: { unitId, studentId: s1Id, subskillId: tagged[0], level: 'Advanced' } })
await call(ratings, { method: 'POST', body: { unitId, studentId: s1Id, subskillId: tagged[1], level: 'Developing' } })
r = await call(ratings, { query: { studentId: s1Id, sectionId, term: 'Term 1' } })
const rated = r.body.units[0].subskills
ok('different levels within one category',
   rated.find(s => s.subskillId === tagged[0])?.teacherLevel === 'Advanced' &&
   rated.find(s => s.subskillId === tagged[1])?.teacherLevel === 'Developing')
ok('student self-assessment visible alongside',
   rated.find(s => s.subskillId === tagged[0])?.selfLevel === 'Proficient')

await call(ratings, { method: 'POST', body: { unitId, studentId: s1Id, subskillId: tagged[0], level: 'Proficient' } })
const n = await q(`SELECT COUNT(*) c FROM unit_ratings WHERE unit_id=? AND student_id=? AND subskill_id=?`,
  [unitId, s1Id, tagged[0]])
ok('re-rating upserts rather than duplicating', n[0].c === 1)

// ── 10. Student privacy ─────────────────────────────────────────────────────
sec('10. Students cannot read each other')
currentUser = { id: s2Id, role: 'student', email: 'smoke+s2@test.local', full_name: 'Student Two' }
r = await call(ratings, { query: { studentId: s1Id } })
ok('student blocked from another student\'s ratings', r.statusCode === 403)
r = await call(reflections, { method: 'POST', body: { unitId, ticks: fullTicks, answers: goodAnswers } })
ok('unenrolled student cannot submit to the unit', r.statusCode === 403)

currentUser = STUDENT
r = await call(ratings, { query: {} })
ok('ratings hidden until the term report is published', (r.body.ratings ?? []).length === 0)

// ── Clean up ────────────────────────────────────────────────────────────────
// Teardown runs in explicit dependency order. Collect the ids first: deleting
// users by a LIKE pattern after their sections are gone is fragile, because any
// row that failed to delete leaves the whole teardown wedged behind a foreign
// key, and the next run then starts dirty.
const testUsers = await q(`SELECT id FROM users WHERE email LIKE 'smoke+%'`)
const testIds = testUsers.map(u => u.id)

if (testIds.length) {
  const ph = testIds.map(() => '?').join(',')
  // sections cascade to units -> reflections -> ticks, answers, events, evidence
  await q(`DELETE FROM sections    WHERE teacher_id IN (${ph})`, testIds)
  await q(`DELETE FROM enrollments WHERE student_id IN (${ph})`, testIds)
  await q(`DELETE FROM reflections WHERE student_id IN (${ph})`, testIds)
  await q(`DELETE FROM users       WHERE id         IN (${ph})`, testIds)

  const left = await q(`SELECT COUNT(*) AS n FROM users WHERE email LIKE 'smoke+%'`)
  if (Number(left[0].n) > 0) console.log(`  ! teardown left ${left[0].n} test users behind`)
}

__setAuthenticatorForTests(null)

console.log(`\n${fail === 0 ? 'ALL PASSED' : 'FAILURES'}: ${pass} passed, ${fail} failed\n`)
await pool.end()
process.exit(fail ? 1 : 0)
