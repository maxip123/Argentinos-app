const { Pool, types } = require('pg');
const dns = require('dns');

// DATE como texto 'YYYY-MM-DD': si se convierte a Date, se corre un día según la zona horaria del servidor.
types.setTypeParser(types.builtins.DATE, (valor) => valor);

// Priorizar IPv4 para evitar fallos de resolución IPv6 en conexiones directas de Supabase
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Crea un Pool de PostgreSQL por petición.
 * En Vercel (serverless) se reutiliza el pool si el contexto está caliente,
 * pero siempre se conecta correctamente en contextos fríos.
 * El flag pgbouncer=true en la DATABASE_URL habilita el Transaction Pooler de Supabase.
 */

let pool;

const getPool = () => {
  if (!pool) {
    const cleanConnectionString = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=[^&]+/g, '');

    pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: process.env.NODE_ENV === 'production' ? 1 : 5,
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

/**
 * Ejecuta una serie de operaciones dentro de una transacción atómica.
 * Si ocurre cualquier error, hace ROLLBACK automáticamente y libera la conexión.
 * @param {Function} callback - Función asíncrona que recibe el client conectado
 * @returns {Promise<any>}
 */
const withTransaction = async (callback) => {
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getPool, withTransaction };

