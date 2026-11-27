const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');
const { decidirCruce, necesitaDesempate, recalcularLlave, ErrorCruce } = require('../utils/cruces');

// Error de validación dentro de una transacción: corta y vuelve todo atrás
class ErrorPartido extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

const NOMBRE_JUEGO = { 1: 'Ida', 2: 'Vuelta' };
const nombrePartidoCruce = (fase, formato, numeroJuego) =>
  formato === 'ida_vuelta' ? `${fase} · ${NOMBRE_JUEGO[numeroJuego]}` : fase;

const enteroONull = (v) => (v === undefined || v === null || v === '' ? null : parseInt(v, 10));

const BASE_SELECT = `
  SELECT
    p.*,
    s.nombre_sede, s.direccion AS direccion_sede,
    el.nombre_equipo AS equipo_local,  el.nombre_corto AS nombre_corto_local,  el.logo_url AS logo_local,  el.es_argentinos_del_norte AS local_es_argentinos,
    ev.nombre_equipo AS equipo_visitante, ev.nombre_corto AS nombre_corto_visitante, ev.logo_url AS logo_visitante, ev.es_argentinos_del_norte AS visitante_es_argentinos,
    (el.es_argentinos_del_norte OR ev.es_argentinos_del_norte) AS juega_argentinos,
    d.nombre_division,
    el.zona AS zona_local, ev.zona AS zona_visitante,
    lp.formato AS cruce_formato, lp.fase AS cruce_fase,
    lp.id_equipo_local AS cruce_id_local, lp.id_equipo_visitante AS cruce_id_visitante,
    (SELECT json_build_object('id_partido', o.id_partido, 'numero_juego', o.numero_juego,
                              'id_equipo_local', o.id_equipo_local, 'id_equipo_visitante', o.id_equipo_visitante,
                              'goles_local', o.goles_local, 'goles_visitante', o.goles_visitante,
                              'estado_partido', o.estado_partido)
       FROM public.partido o
      WHERE o.id_llave = p.id_llave AND o.activo AND o.id_partido <> p.id_partido
      LIMIT 1) AS cruce_otro_partido
  FROM public.partido p
  INNER JOIN public.sede    s  ON s.id_sede    = p.id_sede
  INNER JOIN public.equipo  el ON el.id_equipo = p.id_equipo_local
  INNER JOIN public.equipo  ev ON ev.id_equipo = p.id_equipo_visitante
  INNER JOIN public.division d  ON d.id_division = p.id_division
  LEFT  JOIN public.llave_playoff lp ON lp.id_llave = p.id_llave AND lp.activo
  WHERE p.activo = TRUE`;

// Valida un partido de cruce contra su llave (bloqueada) y los otros partidos del cruce.
// partido: estado resultante (equipos, goles, estado, numero_juego, id_equipo_desempate).
async function validarPartidoCruce(client, llave, partido, idPartidoExcluir = null) {
  if (!llave.id_equipo_local || !llave.id_equipo_visitante) {
    throw new ErrorPartido('El cruce todavía no tiene definidos los dos equipos.');
  }
  const delCruce = [Number(llave.id_equipo_local), Number(llave.id_equipo_visitante)];
  const equipos = [Number(partido.id_equipo_local), Number(partido.id_equipo_visitante)];
  if (!equipos.every((e) => delCruce.includes(e))) {
    throw new ErrorPartido('Los equipos del partido tienen que ser los dos equipos del cruce.');
  }
  const juego = Number(partido.numero_juego);
  if (llave.formato === 'unico' && juego !== 1) {
    throw new ErrorPartido('Este cruce se juega a partido único: no lleva vuelta.');
  }
  if (![1, 2].includes(juego)) throw new ErrorPartido('El número de partido del cruce debe ser 1 (ida) o 2 (vuelta).');

  const { rows: otros } = await client.query(
    `SELECT * FROM public.partido WHERE id_llave = $1 AND activo AND id_partido <> COALESCE($2::bigint, 0)`,
    [llave.id_llave, idPartidoExcluir]
  );
  if (otros.some((o) => Number(o.numero_juego) === juego)) {
    throw new ErrorPartido(`Este cruce ya tiene ${llave.formato === 'unico' ? 'su partido' : `el partido de ${NOMBRE_JUEGO[juego].toLowerCase()}`} cargado.`);
  }
  if (partido.id_equipo_desempate !== null && !delCruce.includes(Number(partido.id_equipo_desempate))) {
    throw new ErrorPartido('Quien pasa tiene que ser uno de los dos equipos del cruce.');
  }
  if (Number(partido.estado_partido) === 2) {
    if (llave.formato === 'ida_vuelta' && juego === 2 && !otros.some((o) => Number(o.numero_juego) === 1 && Number(o.estado_partido) === 2)) {
      throw new ErrorPartido('Primero cargá el resultado de la ida.');
    }
    const r = decidirCruce(llave, [...otros, partido]);
    // Solo el partido decisivo (único o vuelta) exige elegir quién pasa. Si se corrige la ida y el
    // global queda empatado, se acepta: el cruce queda sin definir hasta elegirlo en la vuelta.
    if (r.error && !(llave.formato === 'ida_vuelta' && juego === 1)) throw new ErrorPartido(r.error);
  }
  return otros;
}

// Qué pasó con el cruce después de recalcularlo, para avisarle a quien cargó el partido
function avisoDeCruce(llave) {
  const sinDefinir = llave.formato === 'ida_vuelta' && llave.partidos_jugados === 2 && llave.estado_partido !== 2;
  const bajas = llave.partidos_dados_de_baja;
  if (!sinDefinir && !bajas) return null;
  const partes = ['Partido actualizado.'];
  if (sinDefinir) partes.push('El global quedó empatado: elegí quién pasa en el partido de vuelta.');
  if (bajas) {
    partes.push(`Cambió quién pasa de ronda: se ${bajas === 1 ? 'dio de baja 1 partido programado' : `dieron de baja ${bajas} partidos programados`} de la ronda siguiente.`);
  }
  return { sin_definir: sinDefinir, partidos_dados_de_baja: bajas, mensaje: partes.join(' ') };
}

const responderError = (res, error, mensaje, contexto) => {
  if (error instanceof ErrorPartido || error instanceof ErrorCruce) return respuestaError(res, error.message, error.status);
  console.error(`[partido.controller] ${contexto} error:`, error);
  return respuestaError(res, mensaje, 500, error.message);
};

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
    const idLlave = enteroONull(req.body.id_llave);

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

    // pg devuelve los BIGINT como texto: se comparan como números
    if (eqRows.some((e) => Number(e.id_division) !== Number(id_division))) {
      return respuestaError(res, 'Ambos equipos deben pertenecer a la división seleccionada.', 400);
    }

    const creado = await withTransaction(async (client) => {
      let nombre = nombre_partido?.trim() || null;
      let afecta = afecta_clasificacion ?? true;
      let numeroJuego = null;
      if (idLlave) {
        const { rows: [llave] } = await client.query(
          `SELECT * FROM public.llave_playoff WHERE id_llave = $1 AND activo FOR UPDATE`, [idLlave]
        );
        if (!llave || Number(llave.id_division) !== Number(id_division)) throw new ErrorPartido('El cruce no existe en este torneo.', 404);
        numeroJuego = enteroONull(req.body.numero_juego) ?? 1;
        await validarPartidoCruce(client, llave, {
          id_equipo_local, id_equipo_visitante, numero_juego: numeroJuego, estado_partido: 0, id_equipo_desempate: null,
        });
        // Un partido de cruce nunca suma a la tabla
        afecta = false;
        nombre = nombre || nombrePartidoCruce(llave.fase, llave.formato, numeroJuego);
      }
      const { rows } = await client.query(
        `INSERT INTO public.partido
           (id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero, nombre_partido,
            afecta_clasificacion, observaciones, id_llave, numero_juego)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [id_division, id_sede, id_equipo_local, id_equipo_visitante, fecha_partido, jornada_numero || null, nombre,
          afecta, observaciones || null, idLlave, numeroJuego]
      );
      if (idLlave) await recalcularLlave(client, idLlave);
      return rows[0];
    });
    return respuestaExito(res, creado, 'Partido creado exitosamente.', 201);
  } catch (error) {
    if (error.code === '23514') return respuestaError(res, 'Los equipos local y visitante no pueden ser el mismo.', 422);
    if (error.code === '23505') return respuestaError(res, 'Ese partido del cruce ya está cargado.', 400);
    return responderError(res, error, 'Error al crear el partido.', 'crear');
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

    const resultado = await withTransaction(async (client) => {
    // 1. Obtener partido actual para validaciones y verificar existencia (bloqueado mientras se edita)
    const { rows: actualRows } = await client.query(
      `SELECT * FROM public.partido WHERE id_partido = $1 AND activo = TRUE FOR UPDATE`,
      [id]
    );
    if (actualRows.length === 0) throw new ErrorPartido('Partido no encontrado.', 404);
    const partidoActual = actualRows[0];

    const nuevoLocal = id_equipo_local !== undefined ? parseInt(id_equipo_local) : Number(partidoActual.id_equipo_local);
    const nuevoVisitante = id_equipo_visitante !== undefined ? parseInt(id_equipo_visitante) : Number(partidoActual.id_equipo_visitante);

    if (nuevoLocal === nuevoVisitante) {
      throw new ErrorPartido('El equipo local y el visitante no pueden ser el mismo.');
    }

    // Partido de cruce: se valida el estado resultante contra la llave y se decide el desempate
    let desempate = partidoActual.id_equipo_desempate;
    let penalesLocal = partidoActual.penales_local;
    let penalesVisitante = partidoActual.penales_visitante;
    if (partidoActual.id_llave) {
      const { rows: [llave] } = await client.query(
        `SELECT * FROM public.llave_playoff WHERE id_llave = $1 AND activo FOR UPDATE`, [partidoActual.id_llave]
      );
      if (req.body.id_equipo_desempate !== undefined) desempate = enteroONull(req.body.id_equipo_desempate);
      if (req.body.penales_local !== undefined) penalesLocal = enteroONull(req.body.penales_local);
      if (req.body.penales_visitante !== undefined) penalesVisitante = enteroONull(req.body.penales_visitante);
      const resultante = {
        ...partidoActual,
        id_equipo_local: nuevoLocal,
        id_equipo_visitante: nuevoVisitante,
        goles_local: goles_local !== undefined && goles_local !== null ? parseInt(goles_local) : partidoActual.goles_local,
        goles_visitante: goles_visitante !== undefined && goles_visitante !== null ? parseInt(goles_visitante) : partidoActual.goles_visitante,
        estado_partido: estado_partido !== undefined && estado_partido !== null ? parseInt(estado_partido) : partidoActual.estado_partido,
        id_equipo_desempate: desempate,
      };
      if (llave) {
        const otros = await validarPartidoCruce(client, llave, resultante, partidoActual.id_partido);
        // El desempate solo se guarda si el cruce queda empatado con este partido
        if (!necesitaDesempate(llave, otros, resultante)) {
          desempate = null;
          penalesLocal = null;
          penalesVisitante = null;
        }
      }
    }

    const { rows } = await client.query(
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
           id_equipo_desempate  = $14,
           penales_local        = $15,
           penales_visitante    = $16,
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
        // Un partido de cruce nunca suma a la tabla
        partidoActual.id_llave ? false : (afecta_clasificacion !== undefined ? Boolean(afecta_clasificacion) : null),
        datos_adicionales ? JSON.stringify(datos_adicionales) : null,
        observaciones,
        id,
        desempate,
        penalesLocal,
        penalesVisitante,
      ]
    );
    const avisoCruce = partidoActual.id_llave
      ? avisoDeCruce(await recalcularLlave(client, partidoActual.id_llave))
      : null;
    return { partidoActual, partidoActualizado: rows[0], avisoCruce };
    });

    const { partidoActual, partidoActualizado, avisoCruce } = resultado;

    // Si el partido estaba finalizado o se finalizó, recalcular posiciones de la división
    // (los partidos de cruce nunca suman a la tabla: no hace falta)
    if (!partidoActual.id_llave && (partidoActual.estado_partido === 2 || partidoActualizado.estado_partido === 2)) {
      try {
        await query(`SELECT public.recalcular_clasificacion_division($1)`, [partidoActualizado.id_division]);
      } catch (errRecalc) {
        console.warn('[partido.controller] Error al recalcular clasificación:', errRecalc.message);
      }
    }

    return respuestaExito(
      res,
      { ...partidoActualizado, ...(avisoCruce && { aviso_cruce: avisoCruce }) },
      avisoCruce?.mensaje || 'Partido actualizado correctamente.'
    );
  } catch (error) {
    return responderError(res, error, 'Error al actualizar el partido.', 'actualizar');
  }
};

// DELETE /api/partidos/:id (borrado lógico / soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    // 1-3. Borrado lógico; si era de un cruce, el cruce se recalcula en la misma transacción
    const datos = await withTransaction(async (client) => {
      const { rows: existente } = await client.query(
        `SELECT id_partido, id_division, estado_partido, id_llave FROM public.partido WHERE id_partido = $1 AND activo = TRUE FOR UPDATE`,
        [id]
      );
      if (existente.length === 0) throw new ErrorPartido('Partido no encontrado.', 404);
      const { rows: statsRows } = await client.query(
        `SELECT DISTINCT id_jugador FROM public.partido_estadistica_jugador WHERE id_partido = $1`,
        [id]
      );
      await client.query(
        `UPDATE public.partido SET activo = FALSE, updated_at = NOW() WHERE id_partido = $1`,
        [id]
      );
      const avisoCruce = existente[0].id_llave
        ? avisoDeCruce(await recalcularLlave(client, existente[0].id_llave))
        : null;
      return { partido: existente[0], statsRows, avisoCruce };
    });
    const { partido, statsRows, avisoCruce } = datos;

    // 4. Recalcular tabla de posiciones si estaba finalizado (los de cruce no suman a la tabla)
    if (partido.estado_partido === 2 && !partido.id_llave) {
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

    return respuestaExito(
      res,
      avisoCruce ? { aviso_cruce: avisoCruce } : null,
      avisoCruce?.partidos_dados_de_baja
        ? `Partido eliminado. ${avisoCruce.mensaje.replace('Partido actualizado. ', '')}`
        : 'Partido eliminado (baja lógica) correctamente. Posiciones y estadísticas recalculadas.'
    );
  } catch (error) {
    return responderError(res, error, 'Error al eliminar el partido.', 'eliminar');
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
