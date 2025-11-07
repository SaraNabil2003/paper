// Database configuration module
// Supports both PostgreSQL and in-memory mode

const { Pool } = require('pg');

// Database connection pool
let pool = null;

// Configuration from environment variables
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'psf_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Initialize database connection
async function initializeDatabase() {
  const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

  if (!USE_POSTGRES) {
    console.log('📦 Using in-memory database (set USE_POSTGRES=true to use PostgreSQL)');
    return null;
  }

  try {
    pool = new Pool(config);

    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL database connected successfully');
    console.log(`   Database: ${config.database}@${config.host}:${config.port}`);
    client.release();

    return pool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.log('   Falling back to in-memory database');
    console.log('   To use PostgreSQL:');
    console.log('   1. Set USE_POSTGRES=true');
    console.log('   2. Configure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
    console.log('   3. Run: psql -U postgres -f backend/schema.sql');
    pool = null;
    return null;
  }
}

// Get database pool
function getPool() {
  return pool;
}

// Execute query
async function query(text, params) {
  if (!pool) {
    throw new Error('Database not initialized or using in-memory mode');
  }

  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Execute transaction
async function transaction(callback) {
  if (!pool) {
    throw new Error('Database not initialized or using in-memory mode');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
}

module.exports = {
  initializeDatabase,
  getPool,
  query,
  transaction,
  closeDatabase,
  isPostgres: () => pool !== null
};
