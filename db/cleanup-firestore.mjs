#!/usr/bin/env node
//
// Reports and optionally repairs the data problems the migration surfaced.
//
//   node db/cleanup-firestore.mjs              report only, changes nothing
//   node db/cleanup-firestore.mjs --fix        apply the repairs
//   node db/cleanup-firestore.mjs --fix --delete-orphans
//
// Nothing is deleted unless you pass the flag for it. Deletions are permanent,
// Firestore has no undo, so read the report before you pass --fix.
//
// What it looks for:
//   1. Duplicate user docs sharing one email
//   2. One email registered as both teacher and student
//   3. Entries pointing at user docs that no longer exist
//   4. Students carrying leftover teachingGroups, teachers carrying subjects

import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, deleteField }
  from 'firebase/firestore'

const FIX    = process.argv.includes('--fix')
const PURGE  = process.argv.includes('--delete-orphans')
const clean  = v => String(v ?? '').trim().toLowerCase()

const fb = initializeApp({
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(fb)

const users   = (await getDocs(collection(db, 'users'))).docs.map(d => ({ id: d.id, ...d.data() }))
const entries = (await getDocs(collection(db, 'atl_entries'))).docs.map(d => ({ id: d.id, ...d.data() }))
const units   = (await getDocs(collection(db, 'units'))).docs.map(d => ({ id: d.id, ...d.data() }))

console.log(`\n${FIX ? 'REPAIRING' : 'REPORT ONLY, nothing will change'}`)
console.log(`${users.length} users, ${entries.length} entries, ${units.length} units\n`)

let plannedWrites = 0
const activity = new Map()   // uid -> how much data hangs off it

for (const e of entries) activity.set(e.studentId, (activity.get(e.studentId) ?? 0) + 1)

// ── 1. Duplicate user docs on one email ─────────────────────────────────────

console.log('1. Duplicate accounts')
const byEmail = new Map()
for (const u of users) {
  const k = clean(u.email)
  if (!k) continue
  if (!byEmail.has(k)) byEmail.set(k, [])
  byEmail.get(k).push(u)
}

const dupes = [...byEmail.entries()].filter(([, list]) => list.length > 1)
if (!dupes.length) console.log('   none\n')

for (const [email, list] of dupes) {
  // Keep whichever doc has the most data hanging off it; that is the one whose
  // uid the entries reference, so keeping it avoids orphaning more rows.
  const ranked = list
    .map(u => ({ u, score: activity.get(u.id) ?? 0 }))
    .sort((a, b) => b.score - a.score)
  const keep = ranked[0].u
  const drop = ranked.slice(1).map(r => r.u)

  console.log(`   ${email}: ${list.length} docs`)
  console.log(`     keep ${keep.id} (${ranked[0].score} entries)`)
  for (const d of drop) console.log(`     drop ${d.id} (${activity.get(d.id) ?? 0} entries)`)

  if (FIX) {
    for (const d of drop) {
      // Merge anything the loser has that the keeper lacks, then remove it.
      const patch = {}
      if (!keep.teachingGroups && d.teachingGroups) patch.teachingGroups = d.teachingGroups
      if (!keep.subjects && d.subjects)             patch.subjects = d.subjects
      if (Object.keys(patch).length) {
        await updateDoc(doc(db, 'users', keep.id), patch)
        console.log(`     merged ${Object.keys(patch).join(', ')} into ${keep.id}`)
      }
      await deleteDoc(doc(db, 'users', d.id))
      plannedWrites++
    }
  }
}
if (dupes.length) console.log()

// ── 2. One email, two roles ─────────────────────────────────────────────────

console.log('2. Role conflicts')
let conflicts = 0
for (const [email, list] of byEmail) {
  const roles = new Set(list.map(u => (u.role === 'teacher' ? 'teacher' : 'student')))
  if (roles.size < 2) continue
  conflicts++
  console.log(`   ${email} is registered as both teacher and student.`)
  console.log(`     MySQL allows one row per email, so this must be resolved.`)
  console.log(`     Not auto-fixed: only you know which role is correct.`)
  console.log(`     If they are genuinely both, give the teacher account a separate address.`)
}
if (!conflicts) console.log('   none')
console.log()

// ── 3. Orphaned entries ─────────────────────────────────────────────────────

console.log('3. Entries pointing at deleted accounts')
const liveUids = new Set(users.map(u => u.id))
const orphans = entries.filter(e => !liveUids.has(e.studentId))

if (!orphans.length) {
  console.log('   none')
} else {
  const grouped = new Map()
  for (const o of orphans) {
    const k = `${o.studentName ?? 'unknown'} (${o.studentId})`
    if (!grouped.has(k)) grouped.set(k, [])
    grouped.get(k).push(o)
  }
  for (const [who, list] of grouped) console.log(`   ${list.length} entries <- ${who}`)

  console.log(`\n   These cannot migrate: there is no account to attach them to.`)
  if (!PURGE) {
    console.log(`   Two ways forward:`)
    console.log(`     a) have those students sign in again, which recreates their`)
    console.log(`        account, then re-run the migration`)
    console.log(`     b) delete them with --fix --delete-orphans (permanent)`)
  } else if (FIX) {
    for (const o of orphans) { await deleteDoc(doc(db, 'atl_entries', o.id)); plannedWrites++ }
    console.log(`   deleted ${orphans.length} orphaned entries`)
  } else {
    console.log(`   --delete-orphans given but --fix was not, so nothing was deleted`)
  }
}
console.log()

// ── 4. Leftover role fields ─────────────────────────────────────────────────

console.log('4. Leftover fields from role switches')
let leftovers = 0
for (const u of users) {
  const isTeacher = u.role === 'teacher'
  if (isTeacher && u.subjects) {
    leftovers++
    console.log(`   teacher ${u.displayName} carries a student "subjects" array`)
    if (FIX) { await updateDoc(doc(db, 'users', u.id), { subjects: deleteField() }); plannedWrites++ }
  }
  if (!isTeacher && u.teachingGroups) {
    leftovers++
    console.log(`   student ${u.displayName} carries a "teachingGroups" array`)
    if (FIX) { await updateDoc(doc(db, 'users', u.id), { teachingGroups: deleteField() }); plannedWrites++ }
  }
  if (isTeacher && !u.teachingGroups) {
    console.log(`   teacher ${u.displayName} has NO teachingGroups, so no classes exist for them`)
  }
}
if (!leftovers) console.log('   none')

console.log(FIX ? `\nDone. ${plannedWrites} writes applied.\n`
                : `\nReport only. Re-run with --fix to apply.\n`)
process.exit(0)
