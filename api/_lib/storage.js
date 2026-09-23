// Evidence file storage.
//
// Two backends behind one interface:
//   firebase  used whenever FIREBASE_SERVICE_ACCOUNT is set, which is always
//             true in production. Files live in the project's Storage bucket.
//   disk      local development only, before the service-account key exists.
//             Vercel's filesystem is ephemeral, so this can never be the
//             production path and the backend is recorded per row so a file
//             written by one is never looked up in the other.

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DISK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.uploads')

export const MAX_BYTES = 8 * 1024 * 1024   // 8 MB

// Deliberately narrow. Students attach photos of work, scans and documents;
// anything executable has no business in a school evidence store.
export const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export function backendInUse() {
  return process.env.FIREBASE_SERVICE_ACCOUNT ? 'firebase' : 'disk'
}

async function bucket() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app')
  const { getStorage } = await import('firebase-admin/storage')
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        ?? process.env.VITE_FIREBASE_STORAGE_BUCKET,
    })
  }
  return getStorage().bucket()
}

/** Store bytes, return { storageKey, backend }. */
export async function put({ buffer, contentType, studentId, reflectionId, fileName }) {
  const safe = fileName.replace(/[^\w.\-]/g, '_').slice(-120)
  const key = `evidence/${studentId}/${reflectionId}/${randomUUID()}-${safe}`
  const backend = backendInUse()

  if (backend === 'firebase') {
    const file = (await bucket()).file(key)
    await file.save(buffer, { contentType, resumable: false })
    return { storageKey: key, backend }
  }

  const path = join(DISK_ROOT, key)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, buffer)
  return { storageKey: key, backend }
}

/** Read bytes back for download. */
export async function get(storageKey, backend) {
  if (backend === 'firebase') {
    const [buf] = await (await bucket()).file(storageKey).download()
    return buf
  }
  return readFile(join(DISK_ROOT, storageKey))
}

export async function remove(storageKey, backend) {
  try {
    if (backend === 'firebase') await (await bucket()).file(storageKey).delete()
    else await unlink(join(DISK_ROOT, storageKey))
  } catch {
    // Already gone is a fine outcome for a delete.
  }
}
