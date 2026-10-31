/**
 * Agrega llave_playoff.copa para que un torneo pueda tener Copa Oro y Copa Plata.
 * Es idempotente. Uso: node scripts/migrate_copas_playoff.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

const migration = `
ALTER TABLE public.llave_playoff
  ADD COLUMN IF NOT EXISTS copa VARCHAR(10) NOT NULL DEFAULT 'Unica'
  CHECK (copa IN ('Unica', 'Oro', 'Plata'));

CREATE INDEX IF NOT EXISTS idx_llave_playoff_division_copa
  ON public.llave_playoff (id_division, copa) WHERE activo = TRUE;
`;

async function main() {
  const pool = getPool();
  await pool.query(migration);
  const { rows } = await pool.query(
    `SELECT copa, COUNT(*)::int AS llaves FROM public.llave_playoff GROUP BY copa ORDER BY copa`
  );
  console.log('Migración aplicada. Llaves por copa:', rows);
  await pool.end();
}

main().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
