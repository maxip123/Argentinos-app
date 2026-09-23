const { query } = require('../config/db');
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
    const { id_sede, fecha_partido, jornada_numero, nombre_partido, goles_local, goles_visitante, estado_partido, afecta_clasificacion, datos_adicionales, observaciones } = req.body;
    const { rows } = await query(
      `UPDATE public.partido
       SET id_sede              = COALESCE($1,  id_sede),
           fecha_partido        = COALESCE($2,  fecha_partido),
           jornada_numero       = COALESCE($3,  jornada_numero),
           nombre_partido       = COALESCE($4,  nombre_partido),
           goles_local          = COALESCE($5,  goles_local),
           goles_visitante      = COALESCE($6,  goles_visitante),
           estado_partido       = COALESCE($7,  estado_partido),
           afecta_clasificacion = COALESCE($8,  afecta_clasificacion),
           datos_adicionales    = COALESCE($9,  datos_adicionales),
           observaciones        = COALESCE($10, observaciones),
           updated_at           = NOW()
       WHERE id_partido = $11 AND activo = TRUE
       RETURNING *`,
      [id_sede, fecha_partido, jornada_numero, nombre_partido, goles_local, goles_visitante, estado_partido, afecta_clasificacion, datos_adicionales ? JSON.stringify(datos_adicionales) : null, observaciones, id]
    );
    if (rows.length === 0) return respuestaError(res, 'Partido no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Partido actualizado correctamente.');
  } catch (error) {
    console.error('[partido.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar el partido.', 500, error.message);
  }
};

// DELETE /api/partidos/:id (soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.partido SET activo = FALSE, updated_at = NOW() WHERE id_partido = $1 AND activo = TRUE RETURNING id_partido`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Partido no encontrado.', 404);
    return respuestaExito(res, null, 'Partido eliminado correctamente.');
  } catch (error) {
    console.error('[partido.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar el partido.', 500, error.message);
  }
};

module.exports = { obtenerTodos, obtenerProximos, obtenerPorId, crear, actualizar, eliminar };
