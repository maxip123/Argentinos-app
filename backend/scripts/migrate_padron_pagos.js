/**
 * Datos del padrón y de los pagos que traían las planillas del club.
 * - jugador.domicilio y jugador.obra_social: solo los ven y editan Superadmin y Administrador
 *   (la obra social es un dato de salud).
 * - jugador.fecha_baja: desde cuándo está inactivo; no se le cargan cuotas de meses posteriores.
 * - pago_cargo.referencia (n.º de operación de la transferencia o comprobante) y
 *   pago_cargo.recibido_por (quién recibió la plata, que no siempre es quien la carga en el sistema).
 * Es idempotente. Uso: node scripts/migrate_padron_pagos.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

const migration = `
ALTER TABLE public.jugador ADD COLUMN IF NOT EXISTS domicilio VARCHAR(200);
ALTER TABLE public.jugador ADD COLUMN IF NOT EXISTS obra_social VARCHAR(100);
ALTER TABLE public.jugador ADD COLUMN IF NOT EXISTS fecha_baja DATE;
ALTER TABLE public.pago_cargo ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);
ALTER TABLE public.pago_cargo ADD COLUMN IF NOT EXISTS recibido_por VARCHAR(100);
`;

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    // Los que ya estaban inactivos quedan con la fecha de su última modificación como baja aproximada
    const { rowCount } = await client.query(
      `UPDATE public.jugador SET fecha_baja = (updated_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
       WHERE es_inactivo AND fecha_baja IS NULL`
    );
    await client.query('COMMIT');
    console.log(`Migración aplicada. Jugadores inactivos con fecha de baja asignada: ${rowCount}.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
