// ============================================================================
// Database Connection Pool
// ============================================================================
// Uses node-postgres (pg) to create a connection pool for PostgreSQL.
// All database queries use parameterized queries ($1, $2, ...) to prevent SQL injection.
// ============================================================================

import pg from 'pg';
import dotenv from 'dotenv';

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
};

// For tests, use test database
if (process.env.NODE_ENV === 'test') {
  dbConfig.database = process.env.TEST_DB_NAME || 'skillcraft_test';
}

// Create connection pool
const pool = new Pool(dbConfig);

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
export const query = (text, params) => {
  return pool.query(text, params);
};

/**
 * Get a client from the pool for transaction handling
 * @returns {Promise} Client object
 */
export const getClient = async () => {
  return pool.connect();
};

/**
 * Close the pool (for graceful shutdown)
 */
export const closePool = async () => {
  await pool.end();
};

export default pool;
