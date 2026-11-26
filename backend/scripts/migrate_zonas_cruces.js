/**
 * Zonas y cruces configurables.
 * - equipo.zona: zona del equipo dentro de su torneo (NULL = sin zona).
 * - llave_playoff.formato: 'unico' o 'ida_vuelta'.
 * - partido.id_llave / numero_juego: el partido pertenece a un cruce (1 = único o ida, 2 = vuelta).
 * - partido.id_equipo_desempate y penales_*: quién pasa si el cruce queda empatado (penales solo informativos).
 * Además convierte cada cruce activo ya jugado (resultado cargado en la llave) en un partido real ligado,
 * para que ningún cruce quede con el resultado solo en el cuadro.
 * Es idempotente. Uso: node scripts/migrate_zonas_cruces.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

const ddl = `
ALTER TABLE public.equipo ADD COLUMN IF NOT EXISTS zona VARCHAR(20);
ALTER TABLE public.llave_playoff ADD COLUMN IF NOT EXISTS formato VARCHAR(12) NOT NULL DEFAULT 'unico';
ALTER TABLE public.partido ADD COLUMN IF NOT EXISTS id_llave BIGINT REFERENCES public.llave_playoff(id_llave);
ALTER TABLE public.partido ADD COLUMN IF NOT EXISTS numero_juego SMALLINT;
ALTER TABLE public.partido ADD COLUMN IF NOT EXISTS id_equipo_desempate BIGINT REFERENCES public.equipo(id_equipo);
ALTER TABLE public.partido ADD COLUMN IF NOT EXISTS penales_local INT;
ALTER TABLE public.partido ADD COLUMN IF NOT EXISTS penales_visitante INT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_llave_formato') THEN
    ALTER TABLE public.llave_playoff ADD CONSTRAINT ck_llave_formato CHECK (formato IN ('unico', 'ida_vuelta'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_partido_numero_juego') THEN
    ALTER TABLE public.partido ADD CONSTRAINT ck_partido_numero_juego CHECK (numero_juego IN (1, 2));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_partido_penales') THEN
    ALTER TABLE public.partido ADD CONSTRAINT ck_partido_penales
      CHECK ((penales_local IS NULL OR penales_local >= 0) AND (penales_visitante IS NULL OR penales_visitante >= 0));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_partido_llave_juego ON public.partido(id_llave, numero_juego)
  WHERE activo AND id_llave IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partido_llave ON public.partido(id_llave) WHERE id_llave IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipo_zona ON public.equipo(id_division, zona) WHERE activo;
`;

// Cruces jugados con el resultado cargado solo en la llave -> un partido único ligado
const conversion = `
INSERT INTO public.partido
  (id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, nombre_partido,
   goles_local, goles_visitante, estado_partido, afecta_clasificacion, id_llave, numero_juego,
   id_equipo_desempate, penales_local, penales_visitante)
SELECT lp.id_division, $1, lp.id_equipo_local, lp.id_equipo_visitante, lp.updated_at, lp.fase,
       lp.goles_local, lp.goles_visitante, 2, FALSE, lp.id_llave, 1,
       CASE WHEN lp.goles_local = lp.goles_visitante THEN lp.id_equipo_ganador END,
       CASE WHEN lp.goles_local = lp.goles_visitante THEN lp.penales_local END,
       CASE WHEN lp.goles_local = lp.goles_visitante THEN lp.penales_visitante END
FROM public.llave_playoff lp
WHERE lp.activo AND lp.estado_partido = 2
  AND lp.id_equipo_local IS NOT NULL AND lp.id_equipo_visitante IS NOT NULL
  AND lp.goles_local IS NOT NULL AND lp.goles_visitante IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.partido p WHERE p.id_llave = lp.id_llave AND p.activo)`;

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(ddl);
    const { rows: [{ pendientes }] } = await client.query(
      `SELECT count(*)::int AS pendientes FROM public.llave_playoff lp
       WHERE lp.activo AND lp.estado_partido = 2
         AND NOT EXISTS (SELECT 1 FROM public.partido p WHERE p.id_llave = lp.id_llave AND p.activo)`
    );
    let convertidas = 0;
    if (pendientes > 0) {
      const { rows: sedes } = await client.query(`SELECT id_sede FROM public.sede WHERE activo ORDER BY id_sede LIMIT 1`);
      if (sedes.length === 0) throw new Error('No hay ninguna sede activa para asignar a los cruces ya jugados. Creá una sede y volvé a correr la migración.');
      ({ rowCount: convertidas } = await client.query(conversion, [sedes[0].id_sede]));
      if (convertidas !== pendientes) {
        throw new Error(`Hay ${pendientes - convertidas} cruces marcados como jugados sin equipos o sin goles: revisalos a mano.`);
      }
    }
    await client.query('COMMIT');
    console.log(`Migración aplicada. Llaves convertidas: ${convertidas}.`);
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
