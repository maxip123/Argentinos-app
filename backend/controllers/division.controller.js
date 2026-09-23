const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

/**
 * GET /api/divisiones
 * Retorna todas las divisiones activas del torneo.
 */
const obtenerTodas = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM public.division WHERE activo = TRUE ORDER BY temporada DESC, nombre_division ASC`
    );
    return respuestaExito(res, rows, 'Divisiones obtenidas correctamente.');
  } catch (error) {
    console.error('[division.controller] obtenerTodas error:', error);
    return respuestaError(res, 'Error al obtener las divisiones.', 500, error.message);
  }
};

/**
 * GET /api/divisiones/:id
 * Retorna una división por su ID.
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT * FROM public.division WHERE id_division = $1 AND activo = TRUE`,
      [id]
    );
    if (rows.length === 0) {
      return respuestaError(res, 'División no encontrada.', 404);
    }
    return respuestaExito(res, rows[0], 'División obtenida correctamente.');
  } catch (error) {
    console.error('[division.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener la división.', 500, error.message);
  }
};

/**
 * POST /api/divisiones
 * Crea una nueva división. Solo roles de administración.
 */
const crear = async (req, res) => {
  try {
    const { nombre_division, categoria, genero, temporada, fecha_inicio, fecha_fin, reglas } = req.body;
    const { rows } = await query(
      `INSERT INTO public.division (nombre_division, categoria, genero, temporada, fecha_inicio, fecha_fin, reglas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        nombre_division.trim(),
        categoria || 'Libre',
        genero,
        temporada || new Date().getFullYear(),
        fecha_inicio || null,
        fecha_fin || null,
        reglas ? JSON.stringify(reglas) : JSON.stringify({ puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 }),
      ]
    );
    return respuestaExito(res, rows[0], 'División creada exitosamente.', 201);
  } catch (error) {
    console.error('[division.controller] crear error:', error);
    return respuestaError(res, 'Error al crear la división.', 500, error.message);
  }
};

/**
 * PUT /api/divisiones/:id
 * Actualiza los datos de una división existente.
 */
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_division, categoria, genero, temporada, terminado, fecha_inicio, fecha_fin, id_equipo_campeon, reglas } = req.body;
    const { rows } = await query(
      `UPDATE public.division
       SET nombre_division = COALESCE($1, nombre_division),
           categoria       = COALESCE($2, categoria),
           genero          = COALESCE($3, genero),
           temporada       = COALESCE($4, temporada),
           terminado       = COALESCE($5, terminado),
           fecha_inicio    = COALESCE($6, fecha_inicio),
           fecha_fin       = COALESCE($7, fecha_fin),
           id_equipo_campeon = COALESCE($8, id_equipo_campeon),
           reglas          = COALESCE($9, reglas),
           updated_at      = NOW()
       WHERE id_division = $10 AND activo = TRUE
       RETURNING *`,
      [nombre_division, categoria, genero, temporada, terminado, fecha_inicio, fecha_fin, id_equipo_campeon, reglas ? JSON.stringify(reglas) : null, id]
    );
    if (rows.length === 0) {
      return respuestaError(res, 'División no encontrada.', 404);
    }
    return respuestaExito(res, rows[0], 'División actualizada correctamente.');
  } catch (error) {
    console.error('[division.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar la división.', 500, error.message);
  }
};

/**
 * DELETE /api/divisiones/:id
 * Soft delete de una división (activo = FALSE).
 */
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.division SET activo = FALSE, updated_at = NOW() WHERE id_division = $1 AND activo = TRUE RETURNING id_division`,
      [id]
    );
    if (rows.length === 0) {
      return respuestaError(res, 'División no encontrada.', 404);
    }
    return respuestaExito(res, null, 'División eliminada correctamente.');
  } catch (error) {
    console.error('[division.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar la división.', 500, error.message);
  }
};

module.exports = { obtenerTodas, obtenerPorId, crear, actualizar, eliminar };
