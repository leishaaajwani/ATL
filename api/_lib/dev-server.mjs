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

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('\n  FIREBASE_SERVICE_ACCOUNT is not set, so every request will 401.')
    console.log('  Firebase console > Project settings > Service accounts > Generate new private key\n')
  }
})
