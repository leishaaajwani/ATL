// MySQL connection for Vercel serverless functions.
//
// Serverless invocations are short-lived but the container is reused between
// requests, so we cache the pool on globalThis. Creating a new pool per
// invocation is how you exhaust max_connections on a small MySQL instance.

import mysql from 'mysql2/promise'

const globalForDb = globalThis

function createPool() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example and fill it in.')
  }
  return mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 4),
    queueLimit: 0,
    enableKeepAlive: true,
    timezone: 'Z',
    // Return DECIMAL/BIGINT as JS numbers where safe, strings otherwise
    supportBigNumbers: true,
    bigNumberStrings: false,
  })
}

export const pool = globalForDb.__atlPool ?? (globalForDb.__atlPool = createPool())

/** Run a query, return rows. */
export async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

/** Run a query, return the first row or null. */
export async function q1(sql, params = []) {
  const rows = await q(sql, params)
  return rows[0] ?? null
}

/** Run several statements in one transaction. `fn` receives a connection. */
export async function tx(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn({
      q: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params)
        return rows
      },
      q1: async (sql, params = []) => {
        const [rows] = await conn.execute(sql, params)
        return rows[0] ?? null
      },
    })
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
