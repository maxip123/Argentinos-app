const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

const BASE_SELECT = `
  SELECT
    p.*,
    s.nombre_sede, s.direccion AS direccion_sede, s.google_maps_url,
    el.nombre_equipo AS equipo_local,  el.logo_url AS logo_local,  el.es_argentinos_del_norte AS local_es_argentinos,
    ev.nombre_equipo AS equipo_visitante, ev.logo_url AS logo_visitante, ev.es_argentinos_del_norte AS visitante_es_argentinos,
    (el.es_argentinos_del_norte OR ev.es_argentinos_del_norte) AS juega_argentinos,
    d.nombre_division
  FROM public.partido p
  INNER JOIN public.sede    s  ON s.id_sede    = p.id_sede
  INNER JOIN public.equipo  el ON el.id_equipo = p.id_equipo_local
  INNER JOIN public.equipo  ev ON ev.id_equipo = p.id_equipo_visitante
  INNER JOIN public.division d  ON d.id_division = p.id_division
  WHERE p.activo = TRUE`;

// GET /api/partidos — Todos. Filtros: ?id_division= ?estado= ?solo_argentinos=true
const obtenerTodos = async (req, res) => {
  try {
    const { id_division, estado, solo_argentinos } = req.query;
    let sql = BASE_SELECT;
    const params = [];
    if (id_division) { params.push(id_division); sql += ` AND p.id_division = $${params.length}`; }
    if (estado !== undefined) { params.push(parseInt(estado)); sql += ` AND p.estado_partido = $${params.length}`; }
    if (solo_argentinos === 'true') sql += ` AND (el.es_argentinos_del_norte = TRUE OR ev.es_argentinos_del_norte = TRUE)`;
    sql += ` ORDER BY p.fecha_partido DESC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Partidos obtenidos correctamente.');
  } catch (error) {
    console.error('[partido.controller] obtenerTodos error:', error);
    return respuestaError(res, 'Error al obtener los partidos.', 500, error.message);
  }
};

// GET /api/partidos/proximos — Partidos programados o en vivo
const obtenerProximos = async (req, res) => {
  try {
    const { id_division, solo_argentinos } = req.query;
    let sql = BASE_SELECT + ` AND p.estado_partido IN (0, 1)`;
    const params = [];
    if (id_division) { params.push(id_division); sql += ` AND p.id_division = $${params.length}`; }
    if (solo_argentinos === 'true') sql += ` AND (el.es_argentinos_del_norte = TRUE OR ev.es_argentinos_del_norte = TRUE)`;
    sql += ` ORDER BY p.fecha_partido ASC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Próximos partidos obtenidos correctamente.');
  } catch (error) {
    console.error('[partido.controller] obtenerProximos error:', error);
    return respuestaError(res, 'Error al obtener los próximos partidos.', 500, error.message);
  }
};

// GET /api/partidos/:id
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`${BASE_SELECT} AND p.id_partido = $1`, [id]);
    if (rows.length === 0) return respuestaError(res, 'Partido no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Partido obtenido correctamente.');
  } catch (error) {
    console.error('[partido.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener el partido.', 500, error.message);
  }
};

// POST /api/partidos
const crear = async (req, res) => {
  try {
    const { id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero, nombre_partido, afecta_clasificacion, observaciones } = req.body;

    if (parseInt(id_equipo_local) === parseInt(id_equipo_visitante)) {
      return respuestaError(res, 'Los equipos local y visitante no pueden ser el mismo.', 400);
    }

    // Validar que ambos equipos existan y pertenezcan a la división indicada
    const { rows: eqRows } = await query(
      `SELECT id_equipo, id_division FROM public.equipo WHERE id_equipo IN ($1, $2) AND activo = TRUE`,
      [id_equipo_local, id_equipo_visitante]
    );

    if (eqRows.length !== 2) {
      return respuestaError(res, 'Uno o ambos equipos seleccionados no existen o están inactivos.', 404);
    }

    if (eqRows[0].id_division !== parseInt(id_division) || eqRows[1].id_division !== parseInt(id_division)) {
      return respuestaError(res, 'Ambos equipos deben pertenecer a la división seleccionada.', 400);
    }

    const { rows } = await query(
      `INSERT INTO public.partido
         (id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero, nombre_partido, afecta_clasificacion, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero || null, nombre_partido || null, afecta_clasificacion ?? true, observaciones || null]
    );
    return respuestaExito(res, rows[0], 'Partido creado exitosamente.', 201);
  } catch (error) {
    if (error.code === '23514') return respuestaError(res, 'Los equipos local y visitante no pueden ser el mismo.', 422);
    console.error('[partido.controller] crear error:', error);
    return respuestaError(res, 'Error al crear el partido.', 500, error.message);
  }
};

// PUT /api/partidos/:id — Actualiza datos o resultado
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_sede,
      id_equipo_local,
      id_equipo_visitante,
      fecha_partido,
      jornada_numero,
      nombre_partido,
      goles_local,
      goles_visitante,
      estado_partido,
      afecta_clasificacion,
      datos_adicionales,
      observaciones,
    } = req.body;

    // 1. Obtener partido actual para validaciones y verificar existencia
    const { rows: actualRows } = await query(
      `SELECT * FROM public.partido WHERE id_partido = $1 AND activo = TRUE`,
      [id]
    );
    if (actualRows.length === 0) return respuestaError(res, 'Partido no encontrado.', 404);
    const partidoActual = actualRows[0];

    const nuevoLocal = id_equipo_local !== undefined ? parseInt(id_equipo_local) : partidoActual.id_equipo_local;
    const nuevoVisitante = id_equipo_visitante !== undefined ? parseInt(id_equipo_visitante) : partidoActual.id_equipo_visitante;

    if (nuevoLocal === nuevoVisitante) {
      return respuestaError(res, 'El equipo local y el visitante no pueden ser el mismo.', 400);
    }

    const { rows } = await query(
      `UPDATE public.partido
       SET id_sede              = COALESCE($1,  id_sede),
           id_equipo_local      = COALESCE($2,  id_equipo_local),
           id_equipo_visitante  = COALESCE($3,  id_equipo_visitante),
           fecha_partido        = COALESCE($4,  fecha_partido),
           jornada_numero       = COALESCE($5,  jornada_numero),
           nombre_partido       = COALESCE($6,  nombre_partido),
           goles_local          = COALESCE($7,  goles_local),
           goles_visitante      = COALESCE($8,  goles_visitante),
           estado_partido       = COALESCE($9,  estado_partido),
           afecta_clasificacion = COALESCE($10, afecta_clasificacion),
           datos_adicionales    = COALESCE($11, datos_adicionales),
           observaciones        = COALESCE($12, observaciones),
           updated_at           = NOW()
       WHERE id_partido = $13 AND activo = TRUE
       RETURNING *`,
      [
        id_sede ? parseInt(id_sede) : null,
        nuevoLocal,
        nuevoVisitante,
        fecha_partido,
        jornada_numero ? parseInt(jornada_numero) : null,
        nombre_partido !== undefined && nombre_partido !== null ? nombre_partido.trim() : null,
        goles_local !== undefined && goles_local !== null ? parseInt(goles_local) : null,
        goles_visitante !== undefined && goles_visitante !== null ? parseInt(goles_visitante) : null,
        estado_partido !== undefined && estado_partido !== null ? parseInt(estado_partido) : null,
        afecta_clasificacion !== undefined ? Boolean(afecta_clasificacion) : null,
        datos_adicionales ? JSON.stringify(datos_adicionales) : null,
        observaciones,
        id,
      ]
    );

    if (rows.length === 0) return respuestaError(res, 'Partido no encontrado.', 404);
    const partidoActualizado = rows[0];

    // Si el partido estaba finalizado o se finalizó, recalcular posiciones de la división
    if (partidoActual.estado_partido === 2 || partidoActualizado.estado_partido === 2) {
      try {
        await query(`SELECT public.recalcular_clasificacion_division($1)`, [partidoActualizado.id_division]);
      } catch (errRecalc) {
        console.warn('[partido.controller] Error al recalcular clasificación:', errRecalc.message);
      }
    }

    return respuestaExito(res, partidoActualizado, 'Partido actualizado correctamente.');
  } catch (error) {
    console.error('[partido.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar el partido.', 500, error.message);
  }
};

// DELETE /api/partidos/:id (borrado lógico / soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener datos antes del borrado lógico para recalcular tablas y stats
    const { rows: existente } = await query(
      `SELECT id_partido, id_division, estado_partido FROM public.partido WHERE id_partido = $1 AND activo = TRUE`,
      [id]
    );
    if (existente.length === 0) return respuestaError(res, 'Partido no encontrado.', 404);
    const partido = existente[0];

    // 2. Obtener jugadores con estadísticas en este partido para resincronizar
    const { rows: statsRows } = await query(
      `SELECT DISTINCT id_jugador FROM public.partido_estadistica_jugador WHERE id_partido = $1`,
      [id]
    );

    // 3. Borrado lógico (soft-delete)
    await query(
      `UPDATE public.partido SET activo = FALSE, updated_at = NOW() WHERE id_partido = $1`,
      [id]
    );

    // 4. Recalcular tabla de posiciones si estaba finalizado
    if (partido.estado_partido === 2) {
      try {
        await query(`SELECT public.recalcular_clasificacion_division($1)`, [partido.id_division]);
      } catch (errRecalc) {
        console.warn('[partido.controller] Error al recalcular clasificación tras borrado lógico:', errRecalc.message);
      }
    }

    // 5. Resincronizar estadísticas individuales de los jugadores afectados
    for (const s of statsRows) {
      try {
        await query(`SELECT public.sincronizar_estadisticas_jugador($1)`, [s.id_jugador]);
      } catch (errSync) {
        console.warn('[partido.controller] Error al sincronizar jugador tras borrado lógico:', errSync.message);
      }
    }

    return respuestaExito(res, null, 'Partido eliminado (baja lógica) correctamente. Posiciones y estadísticas recalculadas.');
  } catch (error) {
    console.error('[partido.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar el partido.', 500, error.message);
  }
};

/**
 * GET /api/partidos/:id/estadisticas
 * Retorna las estadísticas individuales de jugadores de Argentinos del Norte para este partido
 */
const obtenerEstadisticasPartido = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT pe.*,
              j.nombre, j.apellido, j.dni, j.foto_url,
              eq.nombre_equipo, eq.es_argentinos_del_norte
       FROM public.partido_estadistica_jugador pe
       INNER JOIN public.jugador j ON j.id_jugador = pe.id_jugador
       INNER JOIN public.equipo eq ON eq.id_equipo = pe.id_equipo
       WHERE pe.id_partido = $1 AND j.activo = TRUE
       ORDER BY pe.goles DESC, j.apellido ASC`,
      [id]
    );
    return respuestaExito(res, rows, 'Estadísticas del partido obtenidas correctamente.');
  } catch (error) {
    console.error('[partido.controller] obtenerEstadisticasPartido error:', error);
    return respuestaError(res, 'Error al obtener las estadísticas del partido.', 500, error.message);
  }
};

/**
 * POST /api/partidos/:id/estadisticas
 * Registra o actualiza goles y tarjetas para jugadores del club en este partido.
 * Exclusivo: solo registra estadísticas individuales para jugadores de Argentinos del Norte.
 * Sincroniza automáticamente los totales en la ficha de cada jugador.
 */
const guardarEstadisticasPartido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estadisticas } = req.body;

    if (!Array.isArray(estadisticas)) {
      return respuestaError(res, 'El campo estadisticas debe ser un array.', 400);
    }

    const { rows: partidoRows } = await query(
      `SELECT * FROM public.partido WHERE id_partido = $1 AND activo = TRUE`,
      [id]
    );
    if (partidoRows.length === 0) {
      return respuestaError(res, 'Partido no encontrado.', 404);
    }

    const jugadoresAfectados = new Set();

    await withTransaction(async (client) => {
      for (const est of estadisticas) {
        const {
          id_jugador,
          id_equipo,
          goles = 0,
          tarjetas_amarillas = 0,
          tarjetas_rojas = 0,
          minutos_jugados = null,
          es_titular = true,
          asistencias = 0,
        } = est;

        if (!id_jugador || !id_equipo) continue;

        // Validar exclusividad de club: estadísticas individuales SOLO para jugadores de Argentinos del Norte
        const { rows: jugVal } = await client.query(
          `SELECT j.id_jugador, j.es_jugador_club, eq.es_argentinos_del_norte
           FROM public.jugador j
           INNER JOIN public.equipo eq ON eq.id_equipo = $2
           WHERE j.id_jugador = $1`,
          [id_jugador, id_equipo]
        );

        if (jugVal.length === 0 || (!jugVal[0].es_jugador_club && !jugVal[0].es_argentinos_del_norte)) {
          continue;
        }

        await client.query(
          `INSERT INTO public.partido_estadistica_jugador
             (id_partido, id_jugador, id_equipo, goles, tarjetas_amarillas, tarjetas_rojas, minutos_jugados, es_titular, asistencias)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id_partido, id_jugador)
           DO UPDATE SET
             id_equipo = EXCLUDED.id_equipo,
             goles = EXCLUDED.goles,
             tarjetas_amarillas = EXCLUDED.tarjetas_amarillas,
             tarjetas_rojas = EXCLUDED.tarjetas_rojas,
             minutos_jugados = EXCLUDED.minutos_jugados,
             es_titular = EXCLUDED.es_titular,
             asistencias = EXCLUDED.asistencias`,
          [
            id,
            id_jugador,
            id_equipo,
            Math.max(0, parseInt(goles) || 0),
            Math.min(2, Math.max(0, parseInt(tarjetas_amarillas) || 0)),
            Math.min(1, Math.max(0, parseInt(tarjetas_rojas) || 0)),
            minutos_jugados ? parseInt(minutos_jugados) : null,
            Boolean(es_titular),
            Math.max(0, parseInt(asistencias) || 0),
          ]
        );

        jugadoresAfectados.add(id_jugador);
      }

      // Sincronizar totales de cada jugador del club ejecutando el Stored Procedure optimizado de Postgres
      for (const jugId of jugadoresAfectados) {
        await client.query(`SELECT public.sincronizar_estadisticas_jugador($1)`, [jugId]);
      }
    });

    return respuestaExito(
      res,
      { total_actualizados: jugadoresAfectados.size },
      'Estadísticas individuales de Argentinos del Norte guardadas y sincronizadas exitosamente.'
    );
  } catch (error) {
    console.error('[partido.controller] guardarEstadisticasPartido error:', error);
    return respuestaError(res, 'Error al guardar las estadísticas del partido.', 500, error.message);
  }
};

module.exports = {
  obtenerTodos,
  obtenerProximos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerEstadisticasPartido,
  guardarEstadisticasPartido,
};
