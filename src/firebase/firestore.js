import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy,
  serverTimestamp, onSnapshot, limit,
} from 'firebase/firestore'
import { db } from './config'
import { SCORE_MAP, APPROVAL_STATUS } from '../utils/atlFramework'

// ─── ATL Entries ──────────────────────────────────────────────────────────────

export async function createATLEntry(data) {
  return addDoc(collection(db, 'atl_entries'), {
    ...data,
    score:          SCORE_MAP[data.selfAssessment] ?? 1,
    approvalStatus: APPROVAL_STATUS.PENDING,
    teacherFeedback: '',
    teacherScore:   null,
    createdAt:      serverTimestamp(),
    updatedAt:      serverTimestamp(),
  })
}

export async function updateATLEntry(id, data) {
  await updateDoc(doc(db, 'atl_entries', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteATLEntry(id) {
  await deleteDoc(doc(db, 'atl_entries', id))
}

export function subscribeToStudentEntries(studentId, callback) {
  const q = query(
    collection(db, 'atl_entries'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export function subscribeToPendingEntries(callback) {
  const q = query(
    collection(db, 'atl_entries'),
    where('approvalStatus', '==', APPROVAL_STATUS.PENDING),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export function subscribeToAllEntries(callback) {
  const q = query(
    collection(db, 'atl_entries'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

// ─── Teacher Term Ratings ─────────────────────────────────────────────────────

export async function saveTeacherRating(data) {
  const q = query(
    collection(db, 'teacher_term_ratings'),
    where('studentId', '==', data.studentId),
    where('term', '==', data.term),
  )
  const existing = await getDocs(q)
  if (!existing.empty) {
    const docId = existing.docs[0].id
    await updateDoc(doc(db, 'teacher_term_ratings', docId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return docId
  }
  const ref = await addDoc(collection(db, 'teacher_term_ratings'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeToStudentTeacherRatings(studentId, callback) {
  const q = query(
    collection(db, 'teacher_term_ratings'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
