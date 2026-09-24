#!/usr/bin/env node
// Local API server. Vercel runs the files in /api as serverless functions in
// production; this gives the same routing in development so `npm run dev` works
// without the Vercel CLI.
//
// Routing matches Vercel's: /api/foo -> api/foo.js, /api/foo/bar -> either
// api/foo/bar.js or api/foo/bar/index.js.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import 'dotenv/config'

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.API_PORT ?? 3001)

const exists = async p => { try { await stat(p); return true } catch { return false } }

// DEV_LOGIN_AS lets you click through the app before the Firebase service
// account key exists: every request is treated as that roster email.
//
// This can only ever work locally. Vercel imports the files in /api directly
// and never runs this file, and the seam it uses refuses to install itself when
// NODE_ENV is production. It is a development convenience, not a back door.
async function installDevLogin() {
  const fallback = process.env.DEV_LOGIN_AS?.trim().toLowerCase()
  if (!fallback) return null

  const { q1 } = await import('./db.js')
  const { __setAuthenticatorForTests, HttpError } = await import('./auth.js')

  // The x-dev-user header wins over the env var, so two browser windows can be
  // two different people at the same time. That is what makes it possible to
  // watch a student submit and a teacher approve side by side.
  __setAuthenticatorForTests(async req => {
    const header = String(req.headers['x-dev-user'] ?? '').trim().toLowerCase()
    const email = header || fallback
    const user = await q1(
      `SELECT id, email, full_name, role, status, google_sub FROM users WHERE email = ?`,
      [email],
    )
    if (!user) throw new HttpError(403, `${email} is not on the roster`)
    return user
  })
  return fallback
}

async function resolveRoute(pathname) {
  const rel = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '')
  if (!rel || rel.includes('..')) return null
  for (const candidate of [join(API_DIR, `${rel}.js`), join(API_DIR, rel, 'index.js')]) {
    if (await exists(candidate)) return candidate
  }
  return null
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return }

  // Handled here rather than as a file in /api, so it has no production
  // counterpart: Vercel only serves what is in /api, and this file is not.
  if (url.pathname === '/api/__dev/users' && process.env.DEV_LOGIN_AS) {
    const { q } = await import('./db.js')
    const rows = await q(
      `SELECT u.email, u.full_name AS fullName, u.role,
              (SELECT COUNT(*) FROM sections s    WHERE s.teacher_id = u.id) AS teaches,
              (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = u.id
                                                    AND e.status = 'active') AS enrolled
         FROM users u
        ORDER BY FIELD(u.role, 'admin', 'teacher', 'student'), u.full_name`,
    )
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ users: rows }))
    return
  }

  const file = await resolveRoute(url.pathname)
  if (!file) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: `No API route for ${url.pathname}` }))
    return
  }

  // Read the body, then hand the handler a Vercel-shaped req/res.
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString()

  req.query = Object.fromEntries(url.searchParams)
  try { req.body = raw ? JSON.parse(raw) : undefined }
  catch {
    res.writeHead(400, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'Body is not valid JSON' }))
    return
  }

  let statusCode = 200
  const shim = {
    status(c) { statusCode = c; return shim },
    setHeader(k, v) { res.setHeader(k, v) },
    json(body) {
      res.writeHead(statusCode, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
      return shim
    },
    end(b) { res.writeHead(statusCode); res.end(b) },
  }

  try {
    // Cache-bust so edits to a route are picked up without a restart.
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
    await mod.default(req, shim)
  } catch (err) {
    console.error(`[api] ${req.method} ${url.pathname}`, err)
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  }
})

const devUser = await installDevLogin()

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
  if (devUser) {
    console.log(`\n  AUTH BYPASSED. Every request is ${devUser}.`)
    console.log('  Local only. Unset DEV_LOGIN_AS to use real Google sign-in.\n')
  } else if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('\n  FIREBASE_SERVICE_ACCOUNT is not set, so every request will fail.')
    console.log('  Either add the key, or set DEV_LOGIN_AS=<roster email> to click')
    console.log('  through locally without it.\n')
  }
})
