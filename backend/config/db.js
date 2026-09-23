const { Pool } = require('pg');

/**
 * Crea un Pool de PostgreSQL por petición.
 * En Vercel (serverless) se reutiliza el pool si el contexto está caliente,
 * pero siempre se conecta correctamente en contextos fríos.
 * El flag pgbouncer=true en la DATABASE_URL habilita el Transaction Pooler de Supabase.
 */

let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 1,             // 1 conexión por instancia serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Error inesperado en el pool:', err.message);
      pool = null; // Forzar recreación del pool ante errores fatales
    });
  }

  return pool;
};

/**
 * Ejecuta una query de PostgreSQL con parámetros de forma segura.
 * @param {string} text - La sentencia SQL
 * @param {Array} params - Array de parámetros
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params = []) => {
  const db = getPool();
  const start = Date.now();

  const result = await db.query(text, params);

  if (process.env.NODE_ENV === 'development') {
    const duration = Date.now() - start;
    console.log(`[DB] query ejecutada en ${duration}ms | rows: ${result.rowCount}`);
  }

  return result;
};

module.exports = { query, getPool };
