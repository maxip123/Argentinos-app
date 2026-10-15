const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/equipos — Todos los equipos activos (opcionalmente filtrar por division)
const obtenerTodos = async (req, res) => {
  try {
    const { id_division, solo_argentinos } = req.query;
    let sql = `
      SELECT e.*, d.nombre_division, d.temporada,
             COUNT(DISTINCT ej.id_jugador) FILTER (WHERE ej.activo = TRUE) AS cantidad_jugadores,
             COUNT(DISTINCT ect.id_cuerpo_tecnico) FILTER (WHERE ect.activo = TRUE) AS cantidad_staff
      FROM public.equipo e
      INNER JOIN public.division d ON d.id_division = e.id_division
      LEFT JOIN public.equipo_jugador ej ON ej.id_equipo = e.id_equipo AND ej.activo = TRUE
      LEFT JOIN public.equipo_cuerpo_tecnico ect ON ect.id_equipo = e.id_equipo AND ect.activo = TRUE
      WHERE e.activo = TRUE AND d.activo = TRUE`;
    const params = [];
    if (id_division) {
      params.push(id_division);
      sql += ` AND e.id_division = $${params.length}`;
    }
    if (solo_argentinos === 'true') {
      sql += ` AND e.es_argentinos_del_norte = TRUE`;
    }
    sql += ` GROUP BY e.id_equipo, d.nombre_division, d.temporada ORDER BY d.nombre_division ASC, e.nombre_equipo ASC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Equipos obtenidos correctamente.');
  } catch (error) {
    console.error('[equipo.controller] obtenerTodos error:', error);
    return respuestaError(res, 'Error al obtener los equipos.', 500, error.message);
  }
};

// GET /api/equipos/:id
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT e.*, d.nombre_division, d.temporada
       FROM public.equipo e
       INNER JOIN public.division d ON d.id_division = e.id_division
       WHERE e.id_equipo = $1 AND e.activo = TRUE`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Equipo no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Equipo obtenido correctamente.');
  } catch (error) {
    console.error('[equipo.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener el equipo.', 500, error.message);
  }
};

// POST /api/equipos
const crear = async (req, res) => {
  try {
    const { id_division, nombre_equipo, nombre_corto, logo_url, es_argentinos_del_norte } = req.body;
    const { rows } = await query(
      `INSERT INTO public.equipo (id_division, nombre_equipo, nombre_corto, logo_url, es_argentinos_del_norte)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_division, nombre_equipo.trim(), nombre_corto?.trim() || null, logo_url || null, es_argentinos_del_norte ?? false]
    );
    return respuestaExito(res, rows[0], 'Equipo creado exitosamente.', 201);
  } catch (error) {
    if (error.code === '23505') {
      return respuestaError(res, 'Ya existe un equipo con ese nombre en esta división.', 409);
    }
    console.error('[equipo.controller] crear error:', error);
    return respuestaError(res, 'Error al crear el equipo.', 500, error.message);
  }
};

// PUT /api/equipos/:id
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_equipo, nombre_corto, logo_url, es_argentinos_del_norte } = req.body;
    const { rows } = await query(
      `UPDATE public.equipo
       SET nombre_equipo          = COALESCE($1, nombre_equipo),
           nombre_corto           = COALESCE($2, nombre_corto),
           logo_url               = COALESCE($3, logo_url),
           es_argentinos_del_norte = COALESCE($4, es_argentinos_del_norte),
           updated_at             = NOW()
       WHERE id_equipo = $5 AND activo = TRUE
       RETURNING *`,
      [nombre_equipo?.trim(), nombre_corto?.trim(), logo_url, es_argentinos_del_norte, id]
    );
    if (rows.length === 0) return respuestaError(res, 'Equipo no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Equipo actualizado correctamente.');
  } catch (error) {
    console.error('[equipo.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar el equipo.', 500, error.message);
  }
};

// DELETE /api/equipos/:id (soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.equipo SET activo = FALSE, updated_at = NOW() WHERE id_equipo = $1 AND activo = TRUE RETURNING id_equipo`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Equipo no encontrado.', 404);
    return respuestaExito(res, null, 'Equipo eliminado correctamente.');
  } catch (error) {
    console.error('[equipo.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar el equipo.', 500, error.message);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   GESTIÓN DE PLANTEL (ASIGNACIÓN N-A-M DE JUGADORES)
   ═══════════════════════════════════════════════════════════════════════════════ */

// GET /api/equipos/:id/plantel — Obtener jugadores convocados en este equipo
const obtenerPlantel = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT ej.id_equipo_jugador,
              ej.id_equipo,
              ej.id_jugador,
              ej.numero_camiseta,
              ej.posicion,
              ej.es_titular_habitual,
              ej.fecha_alta,
              j.nombre,
              j.apellido,
              j.dni,
              j.foto_url,
              j.telefono,
              j.fecha_ultimo_pago,
              j.fecha_vencimiento,
              j.es_inactivo,
              CASE
                WHEN j.es_inactivo THEN 'Inactivo'
                WHEN j.fecha_vencimiento IS NULL THEN 'Sin cuota'
                WHEN j.fecha_vencimiento >= CURRENT_DATE THEN 'Al dia'
                ELSE 'Pendiente'
              END AS estado_cuota
       FROM public.equipo_jugador ej
       INNER JOIN public.jugador j ON j.id_jugador = ej.id_jugador
       WHERE ej.id_equipo = $1 AND ej.activo = TRUE AND j.activo = TRUE
       ORDER BY j.apellido ASC, j.nombre ASC`,
      [id]
    );
    return respuestaExito(res, rows, 'Plantel obtenido correctamente.');
  } catch (error) {
    console.error('[equipo.controller] obtenerPlantel error:', error);
    return respuestaError(res, 'Error al obtener el plantel del equipo.', 500, error.message);
  }
};

// POST /api/equipos/:id/plantel — Asignar jugador existente al equipo
const asignarJugador = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_jugador, numero_camiseta, posicion, es_titular_habitual } = req.body;

    if (!id_jugador) {
      return respuestaError(res, 'id_jugador es requerido.', 400);
    }

    const dorsal = numero_camiseta ? parseInt(numero_camiseta) : null;

    const { rows } = await query(
      `INSERT INTO public.equipo_jugador (id_equipo, id_jugador, numero_camiseta, posicion, es_titular_habitual, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (id_equipo, id_jugador) DO UPDATE
       SET activo = TRUE,
           numero_camiseta = COALESCE(EXCLUDED.numero_camiseta, public.equipo_jugador.numero_camiseta),
           posicion = COALESCE(EXCLUDED.posicion, public.equipo_jugador.posicion),
           es_titular_habitual = COALESCE(EXCLUDED.es_titular_habitual, public.equipo_jugador.es_titular_habitual)
       RETURNING *`,
      [id, id_jugador, dorsal, posicion || null, Boolean(es_titular_habitual)]
    );

    return respuestaExito(res, rows[0], 'Jugador incorporado al plantel exitosamente.', 201);
  } catch (error) {
    console.error('[equipo.controller] asignarJugador error:', error);
    return respuestaError(res, 'Error al asignar el jugador al equipo.', 500, error.message);
  }
};

// PUT /api/equipos/:id/plantel/:id_jugador — Actualizar dorsal o posición en el equipo
const actualizarJugadorPlantel = async (req, res) => {
  try {
    const { id, id_jugador } = req.params;
    const { numero_camiseta, posicion, es_titular_habitual } = req.body;

    const { rows } = await query(
      `UPDATE public.equipo_jugador
       SET numero_camiseta     = COALESCE($1, numero_camiseta),
           posicion            = COALESCE($2, posicion),
           es_titular_habitual = COALESCE($3, es_titular_habitual)
       WHERE id_equipo = $4 AND id_jugador = $5 AND activo = TRUE
       RETURNING *`,
      [
        numero_camiseta ? parseInt(numero_camiseta) : null,
        posicion || null,
        es_titular_habitual !== undefined ? Boolean(es_titular_habitual) : null,
        id,
        id_jugador,
      ]
    );

    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado en el plantel.', 404);
    return respuestaExito(res, rows[0], 'Datos del jugador en el plantel actualizados.');
  } catch (error) {
    console.error('[equipo.controller] actualizarJugadorPlantel error:', error);
    return respuestaError(res, 'Error al actualizar el jugador en el plantel.', 500, error.message);
  }
};

// DELETE /api/equipos/:id/plantel/:id_jugador — Quitar jugador de este equipo
const desasignarJugador = async (req, res) => {
  try {
    const { id, id_jugador } = req.params;
    const { rows } = await query(
      `UPDATE public.equipo_jugador SET activo = FALSE WHERE id_equipo = $1 AND id_jugador = $2 AND activo = TRUE RETURNING id_equipo_jugador`,
      [id, id_jugador]
    );
    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado en el plantel.', 404);
    return respuestaExito(res, null, 'Jugador quitado del plantel correctamente.');
  } catch (error) {
    console.error('[equipo.controller] desasignarJugador error:', error);
    return respuestaError(res, 'Error al quitar el jugador del plantel.', 500, error.message);
  }
};

// POST /api/equipos/transferir-jugador — Pasar o copiar jugador entre equipos del club
const transferirJugador = async (req, res) => {
  try {
    const { id_jugador, id_equipo_origen, id_equipo_destino, accion, numero_camiseta, posicion } = req.body;

    if (!id_jugador || !id_equipo_destino) {
      return respuestaError(res, 'id_jugador y id_equipo_destino son requeridos.', 400);
    }

    // 1. Asignar al nuevo equipo destino
    await query(
      `INSERT INTO public.equipo_jugador (id_equipo, id_jugador, numero_camiseta, posicion, activo)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (id_equipo, id_jugador) DO UPDATE
       SET activo = TRUE,
           numero_camiseta = COALESCE(EXCLUDED.numero_camiseta, public.equipo_jugador.numero_camiseta),
           posicion = COALESCE(EXCLUDED.posicion, public.equipo_jugador.posicion)`,
      [id_equipo_destino, id_jugador, numero_camiseta ? parseInt(numero_camiseta) : null, posicion || null]
    );

    // 2. Si la acción es 'mover' y hay equipo de origen, desasignarlo del origen
    if (accion === 'mover' && id_equipo_origen) {
      await query(
        `UPDATE public.equipo_jugador SET activo = FALSE WHERE id_equipo = $1 AND id_jugador = $2`,
        [id_equipo_origen, id_jugador]
      );
    }

    const msg = accion === 'mover'
      ? 'Jugador transferido exitosamente al nuevo equipo.'
      : 'Jugador asignado en simultáneo al nuevo equipo.';

    return respuestaExito(res, null, msg);
  } catch (error) {
    console.error('[equipo.controller] transferirJugador error:', error);
    return respuestaError(res, 'Error en la transferencia del jugador.', 500, error.message);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerPlantel,
  asignarJugador,
  actualizarJugadorPlantel,
  desasignarJugador,
  transferirJugador,
};
