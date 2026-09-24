// Identity: Google sign-in stays on Firebase Auth, authorisation lives in MySQL.
//
// The client sends a Firebase ID token. We verify it server-side, then look the
// email up in our users table. The roster IS the authorisation: if the email is
// not on it, there is no account, regardless of a valid Google token.
//
// ALLOWED_EMAIL_DOMAIN is optional. Set it once the school confirms whether
// everyone is on a Workspace domain, and outside addresses stop being accepted
// even if somebody adds one to the roster by mistake.

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { q1 } from './db.js'

function admin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
    initializeApp({ credential: cert(JSON.parse(raw)) })
  }
  return getAuth()
}

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code ?? null
  }
}

/**
 * Verify the bearer token and resolve the caller to a row in `users`.
 * Binds google_sub on first sign-in and flips status invited -> active.
 */
export async function authenticate(req) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new HttpError(401, 'Missing bearer token')

  // Distinguish "we are misconfigured" from "your token is bad", or a missing
  // service account reads as an auth failure and sends you debugging the
  // wrong thing entirely.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new HttpError(500, 'Server is missing FIREBASE_SERVICE_ACCOUNT', 'NO_SERVICE_ACCOUNT')
  }

  let decoded
  try {
    decoded = await admin().verifyIdToken(token)
  } catch {
    throw new HttpError(401, 'Invalid or expired token')
  }

  const email = (decoded.email ?? '').trim().toLowerCase()
  if (!email) throw new HttpError(401, 'Token carries no email')
  if (!decoded.email_verified) throw new HttpError(403, 'Email is not verified')

  const domain = process.env.ALLOWED_EMAIL_DOMAIN
  if (domain && !email.endsWith(`@${domain.toLowerCase()}`)) {
    throw new HttpError(403, `Sign in with your @${domain} account`, 'WRONG_DOMAIN')
  }

  const user = await q1(
    `SELECT id, email, full_name, role, status, google_sub
       FROM users
      WHERE email = ?`,
    [email],
  )

  if (!user) {
    throw new HttpError(
      403,
      'We do not have this email on the school list yet. Ask your DP coordinator to add you.',
      'NOT_ON_ROSTER',
    )
  }
  if (user.status === 'disabled') {
    throw new HttpError(403, 'This account has been switched off. Speak to your coordinator.', 'DISABLED')
  }

  // First sign-in: bind the Google uid and activate.
  if (!user.google_sub) {
    await q1(
      `UPDATE users
          SET google_sub = ?, status = 'active',
              first_login_at = COALESCE(first_login_at, CURRENT_TIMESTAMP),
              photo_url = COALESCE(?, photo_url)
        WHERE id = ?`,
      [decoded.uid, decoded.picture ?? null, user.id],
    )
    user.status = 'active'
    user.google_sub = decoded.uid
  } else if (user.google_sub !== decoded.uid) {
    // Same email, different Google account. Refuse rather than silently rebind.
    throw new HttpError(403, 'This email is already bound to another Google account', 'UID_MISMATCH')
  }

  return user
}

// Test seam. Route handlers call `authenticator`, not `authenticate` directly,
// so the smoke test can supply its own identity without a Firebase key.
// This is not reachable over HTTP (it is a module export, not a route) and it
// refuses to work in production, so the only way to use it is to already have
// code execution on the server.
let authenticator = authenticate

export function __setAuthenticatorForTests(fn) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('__setAuthenticatorForTests is not available in production')
  }
  authenticator = fn ?? authenticate
}

/**
 * Route wrapper. Handles auth, role gating, JSON errors and method checks.
 *
 *   export default handler({ roles: ['teacher'] }, async (req, res, user) => { ... })
 */
export function handler(options, fn) {
  const { roles = null, methods = null } = options ?? {}
  return async (req, res) => {
    try {
      if (methods && !methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '))
        throw new HttpError(405, `${req.method} not allowed here`)
      }
      const user = await authenticator(req)
      if (roles && !roles.includes(user.role)) {
        throw new HttpError(403, 'Your role does not have access to this')
      }
      return await fn(req, res, user)
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500
      if (status === 500) console.error('[api]', req.url, err)
      return res.status(status).json({
        error: status === 500 ? 'Something went wrong on our side' : err.message,
        code: err.code ?? null,
      })
    }
  }
}

/** Sections the caller teaches, as an array of ids. Empty for non-teachers. */
export async function teacherSectionIds(userId) {
  const { q } = await import('./db.js')
  const rows = await q(
    `SELECT s.id
       FROM sections s
       JOIN academic_years y ON y.id = s.academic_year_id AND y.is_current = 1
      WHERE s.teacher_id = ?`,
    [userId],
  )
  return rows.map(r => r.id)
}

/** Throw unless this teacher owns this section. */
export async function assertOwnsSection(userId, sectionId) {
  const row = await q1(
    `SELECT id FROM sections WHERE id = ? AND teacher_id = ?`,
    [sectionId, userId],
  )
  if (!row) throw new HttpError(403, 'That is not one of your classes')
}

/** Throw unless this teacher owns the section the unit belongs to. */
export async function assertOwnsUnit(userId, unitId) {
  const row = await q1(
    `SELECT u.id
       FROM units u
       JOIN sections s ON s.id = u.section_id
      WHERE u.id = ? AND s.teacher_id = ?`,
    [unitId, userId],
  )
  if (!row) throw new HttpError(403, 'That unit is not yours')
}
