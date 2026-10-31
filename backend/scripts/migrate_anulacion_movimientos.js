/**
 * Agrega a gasto_club el vínculo con la cuota y los datos de anulación, y vincula los cobros existentes.
 * Es idempotente. Uso: node scripts/migrate_anulacion_movimientos.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');
const { SQL_VINCULAR_COBROS } = require('../utils/cobrosCuota');

const migration = `
ALTER TABLE public.gasto_club
  ADD COLUMN IF NOT EXISTS id_cuota BIGINT REFERENCES public.cuota_jugador(id_cuota) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
  ADD COLUMN IF NOT EXISTS anulado_por UUID REFERENCES public.perfil_usuario(id_perfil) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gasto_club_cuota
  ON public.gasto_club (id_cuota) WHERE id_cuota IS NOT NULL;
`;

async function main() {
  const pool = getPool();
  await pool.query(migration);
  const { rowCount } = await pool.query(SQL_VINCULAR_COBROS);
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE id_cuota IS NOT NULL)::int AS vinculados,
            COUNT(*) FILTER (WHERE id_cuota IS NULL)::int AS sin_vincular
     FROM public.gasto_club WHERE categoria = 'Cuota Socio'`
  );
  console.log(`Migración aplicada. Vinculados ahora: ${rowCount}. Estado de los cobros:`, rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
