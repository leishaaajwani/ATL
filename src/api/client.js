// Frontend API client. Replaces src/firebase/firestore.js.
//
// Firebase stays for Google sign-in only. Every request carries the Firebase ID
// token, the server verifies it and resolves the caller against the MySQL
// roster. The browser never sees another student's data, because the server
// never sends it, which is the difference from the Firestore version.

import { auth } from '../firebase/config'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code ?? null
  }
}

// Matches DEV_LOGIN_AS on the API side. Vite only defines import.meta.env.DEV
// in a dev build, so this branch cannot survive into production.
export const DEV_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN === '1'

async function token() {
  if (DEV_LOGIN) return 'dev'
  const user = auth.currentUser
  if (!user) throw new ApiError(401, 'You are signed out')
  return user.getIdToken()
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.code)
  return data
}

const get   = (p, params)  => request(p, { params })
const post  = (p, body)    => request(p, { method: 'POST',  body })
const patch = (p, body)    => request(p, { method: 'PATCH', body })

// ── Identity ────────────────────────────────────────────────────────────────

export const getMe = () => get('/me')

// ── Reference data ──────────────────────────────────────────────────────────

// The subject catalogue is static per session, so hold it after the first read.
let subjectsCache = null
export async function getSubjects() {
  if (!subjectsCache) subjectsCache = (await get('/subjects')).subjects
  return subjectsCache
}

export const getSubskills   = subjectId => get('/subskills', { subjectId })
export const createSubskill = payload   => post('/subskills', payload)

// ── Classes ─────────────────────────────────────────────────────────────────

export const getSections   = ()          => get('/sections')
export const getRoster     = sectionId   => get('/sections', { id: sectionId, roster: 1 })
export const createSection = payload     => post('/sections', payload)

export const requestEnrollment = sectionId    => post('/enrollments', { sectionId })
export const decideEnrollment  = (id, action) => patch('/enrollments', { enrollmentId: id, action })

// ── Units ───────────────────────────────────────────────────────────────────

export const getUnits    = sectionId => get('/units', { sectionId })
export const getMyUnits  = ()        => get('/units', { mine: 1 })
export const createUnit  = payload   => post('/units', payload)

// ── Reflections ─────────────────────────────────────────────────────────────

export const getMyReflection = unitId  => get('/reflections', { unitId })
export const submitReflection = payload => post('/reflections', payload)

export const getReviewQueue = (status = 'pending') => get('/review-queue', { status })
export const reviewReflection = (reflectionId, action, feedback) =>
  post('/reflections/review', { reflectionId, action, feedback })

// ── Ratings ─────────────────────────────────────────────────────────────────

export const getRatings = ({ studentId, sectionId, term }) =>
  get('/ratings', { studentId, sectionId, term })
export const saveRating = payload => post('/ratings', payload)

// ── Admin ───────────────────────────────────────────────────────────────────

export const adminListUsers = role    => get('/admin/users', { role })
export const adminAddUser   = payload => post('/admin/users', payload)
export const adminImportCsv = (csv, role) => post('/admin/users', { csv, role })
export const adminUpdateUser = payload => patch('/admin/users', payload)
