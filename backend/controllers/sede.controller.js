const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

const obtenerTodas = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM public.sede WHERE activo = TRUE ORDER BY nombre_sede ASC`);
    return respuestaExito(res, rows, 'Sedes obtenidas correctamente.');
  } catch (error) {
    console.error('[sede.controller] obtenerTodas error:', error);
    return respuestaError(res, 'Error al obtener las sedes.', 500, error.message);
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM public.sede WHERE id_sede = $1 AND activo = TRUE`, [req.params.id]);
    if (rows.length === 0) return respuestaError(res, 'Sede no encontrada.', 404);
    return respuestaExito(res, rows[0], 'Sede obtenida correctamente.');
  } catch (error) {
    console.error('[sede.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener la sede.', 500, error.message);
  }
};

const crear = async (req, res) => {
  try {
    const { nombre_sede, direccion, google_maps_url, es_sede_propia } = req.body;
    const { rows } = await query(
      `INSERT INTO public.sede (nombre_sede, direccion, google_maps_url, es_sede_propia)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [nombre_sede.trim(), direccion.trim(), google_maps_url || null, es_sede_propia ?? false]
    );
    return respuestaExito(res, rows[0], 'Sede creada exitosamente.', 201);
  } catch (error) {
    console.error('[sede.controller] crear error:', error);
    return respuestaError(res, 'Error al crear la sede.', 500, error.message);
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_sede, direccion, google_maps_url, es_sede_propia } = req.body;
    const { rows } = await query(
      `UPDATE public.sede
       SET nombre_sede    = COALESCE($1, nombre_sede),
           direccion      = COALESCE($2, direccion),
           google_maps_url= COALESCE($3, google_maps_url),
           es_sede_propia = COALESCE($4, es_sede_propia),
           updated_at     = NOW()
       WHERE id_sede = $5 AND activo = TRUE RETURNING *`,
      [nombre_sede?.trim(), direccion?.trim(), google_maps_url, es_sede_propia, id]
    );
    if (rows.length === 0) return respuestaError(res, 'Sede no encontrada.', 404);
    return respuestaExito(res, rows[0], 'Sede actualizada correctamente.');
  } catch (error) {
    console.error('[sede.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar la sede.', 500, error.message);
  }
};

const eliminar = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE public.sede SET activo = FALSE, updated_at = NOW() WHERE id_sede = $1 AND activo = TRUE RETURNING id_sede`,
      [req.params.id]
    );
    if (rows.length === 0) return respuestaError(res, 'Sede no encontrada.', 404);
    return respuestaExito(res, null, 'Sede eliminada correctamente.');
  } catch (error) {
    console.error('[sede.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar la sede.', 500, error.message);
  }
};

module.exports = { obtenerTodas, obtenerPorId, crear, actualizar, eliminar };
