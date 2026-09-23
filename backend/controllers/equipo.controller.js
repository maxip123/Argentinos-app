const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/equipos — Todos los equipos activos (opcionalmente filtrar por division)
const obtenerTodos = async (req, res) => {
  try {
    const { id_division, solo_argentinos } = req.query;
    let sql = `
      SELECT e.*, d.nombre_division, d.temporada
      FROM public.equipo e
      INNER JOIN public.division d ON d.id_division = e.id_division
      WHERE e.activo = TRUE AND d.activo = TRUE`;
    const params = [];
    if (id_division) {
      params.push(id_division);
      sql += ` AND e.id_division = $${params.length}`;
    }
    if (solo_argentinos === 'true') {
      sql += ` AND e.es_argentinos_del_norte = TRUE`;
    }
    sql += ` ORDER BY d.nombre_division ASC, e.nombre_equipo ASC`;
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

module.exports = { obtenerTodos, obtenerPorId, crear, actualizar, eliminar };
