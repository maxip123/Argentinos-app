/**
 * Agrega a clasificacion los ajustes manuales (sanciones, puntos de mesa, etc.) y hace que
 * recalcular_clasificacion_division los sume a lo que sale de los partidos, para no perderlos.
 * Es idempotente. Uso: node scripts/migrate_ajustes_clasificacion.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getPool } = require('../config/db');

const migration = `
ALTER TABLE public.clasificacion
  ADD COLUMN IF NOT EXISTS ajuste_puntos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_partidos_ganados INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_partidos_empatados INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_partidos_perdidos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_goles_a_favor INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ajuste_goles_en_contra INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_ajuste TEXT,
  ADD COLUMN IF NOT EXISTS ajustado_por UUID REFERENCES public.perfil_usuario(id_perfil) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_ajuste TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.recalcular_clasificacion_division(p_id_division BIGINT)
RETURNS VOID AS $$
BEGIN
    -- Asegurar que todos los equipos de la división existan en la tabla de clasificación
    INSERT INTO public.clasificacion (id_division, id_equipo)
    SELECT p_id_division, e.id_equipo
    FROM public.equipo e
    WHERE e.id_division = p_id_division AND e.activo = TRUE
    ON CONFLICT (id_division, id_equipo) DO NOTHING;

    -- Partir de los ajustes manuales: sin partidos jugados, la tabla muestra solo eso
    UPDATE public.clasificacion
    SET puntos = ajuste_puntos,
        partidos_jugados = ajuste_partidos_ganados + ajuste_partidos_empatados + ajuste_partidos_perdidos,
        partidos_ganados = ajuste_partidos_ganados,
        partidos_empatados = ajuste_partidos_empatados,
        partidos_perdidos = ajuste_partidos_perdidos,
        goles_a_favor = ajuste_goles_a_favor,
        goles_en_contra = ajuste_goles_en_contra
    WHERE id_division = p_id_division;

    -- Calcular estadísticas de partidos finalizados (estado_partido = 2)
    WITH stats_local AS (
        SELECT
            p.id_equipo_local AS id_equipo,
            COUNT(*) AS pj,
            SUM(CASE WHEN p.goles_local > p.goles_visitante THEN 1 ELSE 0 END) AS pg,
            SUM(CASE WHEN p.goles_local = p.goles_visitante THEN 1 ELSE 0 END) AS pe,
            SUM(CASE WHEN p.goles_local < p.goles_visitante THEN 1 ELSE 0 END) AS pp,
            SUM(p.goles_local) AS gf,
            SUM(p.goles_visitante) AS gc,
            SUM(CASE
                WHEN p.goles_local > p.goles_visitante THEN 3
                WHEN p.goles_local = p.goles_visitante THEN 1
                ELSE 0 END) AS pts
        FROM public.partido p
        WHERE p.id_division = p_id_division
          AND p.estado_partido = 2
          AND p.afecta_clasificacion = TRUE
          AND p.activo = TRUE
        GROUP BY p.id_equipo_local
    ),
    stats_visitante AS (
        SELECT
            p.id_equipo_visitante AS id_equipo,
            COUNT(*) AS pj,
            SUM(CASE WHEN p.goles_visitante > p.goles_local THEN 1 ELSE 0 END) AS pg,
            SUM(CASE WHEN p.goles_visitante = p.goles_local THEN 1 ELSE 0 END) AS pe,
            SUM(CASE WHEN p.goles_visitante < p.goles_local THEN 1 ELSE 0 END) AS pp,
            SUM(p.goles_visitante) AS gf,
            SUM(p.goles_local) AS gc,
            SUM(CASE
                WHEN p.goles_visitante > p.goles_local THEN 3
                WHEN p.goles_visitante = p.goles_local THEN 1
                ELSE 0 END) AS pts
        FROM public.partido p
        WHERE p.id_division = p_id_division
          AND p.estado_partido = 2
          AND p.afecta_clasificacion = TRUE
          AND p.activo = TRUE
        GROUP BY p.id_equipo_visitante
    ),
    stats_totales AS (
        SELECT
            COALESCE(l.id_equipo, v.id_equipo) AS id_equipo,
            COALESCE(l.pj, 0) + COALESCE(v.pj, 0) AS pj,
            COALESCE(l.pg, 0) + COALESCE(v.pg, 0) AS pg,
            COALESCE(l.pe, 0) + COALESCE(v.pe, 0) AS pe,
            COALESCE(l.pp, 0) + COALESCE(v.pp, 0) AS pp,
            COALESCE(l.gf, 0) + COALESCE(v.gf, 0) AS gf,
            COALESCE(l.gc, 0) + COALESCE(v.gc, 0) AS gc,
            COALESCE(l.pts, 0) + COALESCE(v.pts, 0) AS pts
        FROM stats_local l
        FULL OUTER JOIN stats_visitante v ON l.id_equipo = v.id_equipo
    )
    UPDATE public.clasificacion c
    SET partidos_jugados = st.pj + c.ajuste_partidos_ganados + c.ajuste_partidos_empatados + c.ajuste_partidos_perdidos,
        partidos_ganados = st.pg + c.ajuste_partidos_ganados,
        partidos_empatados = st.pe + c.ajuste_partidos_empatados,
        partidos_perdidos = st.pp + c.ajuste_partidos_perdidos,
        goles_a_favor = st.gf + c.ajuste_goles_a_favor,
        goles_en_contra = st.gc + c.ajuste_goles_en_contra,
        puntos = st.pts + c.ajuste_puntos
    FROM stats_totales st
    WHERE c.id_division = p_id_division AND c.id_equipo = st.id_equipo;
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  const pool = getPool();
  await pool.query(migration);

  // Control: recalcular todo dentro de una transacción que se descarta. Sin ajustes cargados,
  // la función nueva tiene que dar lo mismo que la anterior.
  const client = await pool.connect();
  const foto = async (sql) => (await client.query(sql)).rows;
  const SQL_FOTO = `SELECT id_division, id_equipo, puntos, partidos_jugados, partidos_ganados, partidos_empatados,
                           partidos_perdidos, goles_a_favor, goles_en_contra
                    FROM public.clasificacion WHERE activo = TRUE ORDER BY id_division, id_equipo`;
  try {
    await client.query('BEGIN');
    const divisiones = await foto(`SELECT DISTINCT id_division FROM public.clasificacion ORDER BY id_division`);
    // Se compara contra un recálculo con la misma lógica de partidos, no contra la tabla guardada,
    // que puede estar desactualizada si alguien la tocó a mano.
    const antes = await foto(SQL_FOTO);
    for (const { id_division } of divisiones) {
      await client.query('SELECT public.recalcular_clasificacion_division($1)', [id_division]);
    }
    const despues = await foto(SQL_FOTO);
    const distintas = despues.filter((f, i) => JSON.stringify(f) !== JSON.stringify(antes[i])).length;
    console.log(`Migración aplicada. Filas que cambiarían al recalcular: ${distintas} de ${despues.length}.`);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
  await pool.end();
}

main().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
