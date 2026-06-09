import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore'
import { db } from './config'
import { SCORE_MAP, APPROVAL_STATUS } from '../utils/atlFramework'

// Sort helper — avoids composite index requirements
const byCreatedDesc = (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)

// ─── ATL Entries ──────────────────────────────────────────────────────────────

export async function createATLEntry(data) {
  return addDoc(collection(db, 'atl_entries'), {
    ...data,
    score:           SCORE_MAP[data.selfAssessment] ?? 1,
    approvalStatus:  APPROVAL_STATUS.PENDING,
    teacherFeedback: '',
    teacherScore:    null,
    createdAt:       serverTimestamp(),
    updatedAt:       serverTimestamp(),
  })
}

export async function updateATLEntry(id, data) {
  await updateDoc(doc(db, 'atl_entries', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteATLEntry(id) {
  await deleteDoc(doc(db, 'atl_entries', id))
}

export function subscribeToStudentEntries(studentId, callback) {
  const q = query(collection(db, 'atl_entries'), where('studentId', '==', studentId))
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(docs.sort(byCreatedDesc))
  })
}

export function subscribeToPendingEntries(callback) {
  const q = query(collection(db, 'atl_entries'), where('approvalStatus', '==', APPROVAL_STATUS.PENDING))
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(docs.sort(byCreatedDesc))
  })
}

export function subscribeToAllEntries(callback) {
  return onSnapshot(collection(db, 'atl_entries'), snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(docs.sort(byCreatedDesc))
  })
}

export async function approveEntry(id, teacherFeedback = '', teacherScore = null) {
  await updateDoc(doc(db, 'atl_entries', id), {
    approvalStatus:  APPROVAL_STATUS.APPROVED,
    teacherFeedback,
    teacherScore,
    reviewedAt:      serverTimestamp(),
    updatedAt:       serverTimestamp(),
  })
}

export async function rejectEntry(id, teacherFeedback = '') {
  await updateDoc(doc(db, 'atl_entries', id), {
    approvalStatus:  APPROVAL_STATUS.REJECTED,
    teacherFeedback,
    reviewedAt:      serverTimestamp(),
    updatedAt:       serverTimestamp(),
  })
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function subscribeToStudents(callback) {
  const q = query(collection(db, 'users'), where('role', '==', 'student'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function getAllStudents() {
  const q = query(collection(db, 'users'), where('role', '==', 'student'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() })
}

// ─── Teacher Term Ratings (legacy — kept for backward compat) ─────────────────

export async function saveTeacherRating(data) {
  const q = query(
    collection(db, 'teacher_term_ratings'),
    where('studentId', '==', data.studentId),
    where('term', '==', data.term),
  )
  const existing = await getDocs(q)
  if (!existing.empty) {
    const docId = existing.docs[0].id
    await updateDoc(doc(db, 'teacher_term_ratings', docId), { ...data, updatedAt: serverTimestamp() })
    return docId
  }
  const ref = await addDoc(collection(db, 'teacher_term_ratings'), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeToStudentTeacherRatings(studentId, callback) {
  const q = query(collection(db, 'teacher_term_ratings'), where('studentId', '==', studentId))
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(docs.sort(byCreatedDesc))
  })
}

// ─── Units ────────────────────────────────────────────────────────────────────

export async function createUnit(data) {
  const ref = await addDoc(collection(db, 'units'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteUnit(id) {
  await deleteDoc(doc(db, 'units', id))
}

export function subscribeToTeacherUnits(teacherUid, callback) {
  const q = query(collection(db, 'units'), where('teacherUid', '==', teacherUid))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function getUnitsForSubjectAndTeacher(subject, teacherName) {
  const q = query(
    collection(db, 'units'),
    where('subject', '==', subject),
    where('teacherName', '==', teacherName),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── Unit Ratings ─────────────────────────────────────────────────────────────

export async function saveUnitRating(data) {
  const q = query(
    collection(db, 'unit_ratings'),
    where('studentId', '==', data.studentId),
    where('unitId', '==', data.unitId),
    where('atl', '==', data.atl),
  )
  const existing = await getDocs(q)
  if (!existing.empty) {
    const docId = existing.docs[0].id
    await updateDoc(doc(db, 'unit_ratings', docId), { ...data, updatedAt: serverTimestamp() })
    return docId
  }
  const ref = await addDoc(collection(db, 'unit_ratings'), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeToStudentUnitRatings(studentId, callback) {
  const q = query(collection(db, 'unit_ratings'), where('studentId', '==', studentId))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export function subscribeToTeacherStudentUnitRatings(teacherUid, studentId, term, callback) {
  const q = query(
    collection(db, 'unit_ratings'),
    where('teacherUid', '==', teacherUid),
    where('studentId', '==', studentId),
    where('term', '==', term),
  )
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}
