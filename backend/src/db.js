// ============================================================================
// Database Connection Pool
// ============================================================================
// Uses node-postgres (pg) to create a connection pool for PostgreSQL.
// All database queries use parameterized queries ($1, $2, ...) to prevent SQL injection.
// ============================================================================

import pg from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';

dotenv.config();

const { Pool } = pg;

// Determine which database to use (test or development)
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const dbConfig = {
  user: process.env.DB_USER || 'skillcraft_user',
  password: process.env.DB_PASSWORD || 'skillcraft_password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'skillcraft',
  max: Number(process.env.DB_POOL_MAX || 10),
};

// For tests, use test database
if (process.env.NODE_ENV === 'test') {
  dbConfig.database = process.env.TEST_DB_NAME || 'skillcraft_test';
}

// Create connection pool
const pool = new Pool(dbConfig);
const actorScope = new AsyncLocalStorage();

export const withActorContext = (req, next) =>
  actorScope.run({ userId: req.user?.userId || '', role: req.user?.role || 'guest' }, next);

async function applyActorContext(client, actor) {
  await client.query('SET LOCAL ROLE skillcraft_runtime');
  await client.query(
    "SELECT set_config('app.user_id', $1, true), set_config('app.user_role', $2, true)",
    [String(actor.userId), actor.role]
  );
}

// Log connection pool info
pool.on('connect', () => {
  console.log(`✓ Connected to ${dbConfig.database} database`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Query helper function
 * Always use this for database queries to ensure parameterized queries
 * @param {string} text - SQL query with placeholders ($1, $2, ...)
 * @param {array} params - Query parameters
 * @returns {Promise} Query result
 */
export const query = async (text, params) => {
  const actor = actorScope.getStore();
  if (!actor) return pool.query(text, params);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await applyActorContext(client, actor);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve the original error */ }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a client from the pool for transaction handling
 * @returns {Promise} Client object
 */
export const getClient = async () => {
  const client = await pool.connect();
  const actor = actorScope.getStore();
  if (!actor) return client;
  return {
    query: async (...args) => {
      const result = await client.query(...args);
      if (typeof args[0] === 'string' && /^\s*BEGIN\b/i.test(args[0])) {
        await applyActorContext(client, actor);
      }
      return result;
    },
    release: () => client.release(),
  };
};

/**
 * Close the pool (for graceful shutdown)
 */
export const closePool = async () => {
  await pool.end();
};

export default pool;
