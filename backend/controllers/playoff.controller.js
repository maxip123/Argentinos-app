const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

const obtenerPorDivision = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { rows } = await query(
      `SELECT lp.*,
              el.nombre_equipo AS equipo_local_nombre,  el.logo_url AS logo_local,
              ev.nombre_equipo AS equipo_visitante_nombre, ev.logo_url AS logo_visitante,
              eg.nombre_equipo AS equipo_ganador_nombre
       FROM public.llave_playoff lp
       LEFT JOIN public.equipo el ON el.id_equipo = lp.id_equipo_local
       LEFT JOIN public.equipo ev ON ev.id_equipo = lp.id_equipo_visitante
       LEFT JOIN public.equipo eg ON eg.id_equipo = lp.id_equipo_ganador
       WHERE lp.id_division = $1 AND lp.activo = TRUE
       ORDER BY lp.fase ASC, lp.orden ASC`,
      [id_division]
    );
    return respuestaExito(res, rows, 'Llaves de playoff obtenidas correctamente.');
  } catch (error) {
    console.error('[playoff.controller] obtenerPorDivision error:', error);
    return respuestaError(res, 'Error al obtener las llaves de playoff.', 500, error.message);
  }
};

const crear = async (req, res) => {
  try {
    const { id_division, fase, orden, id_equipo_local, id_equipo_visitante, id_llave_siguiente, es_local_siguiente } = req.body;
    const { rows } = await query(
      `INSERT INTO public.llave_playoff (id_division, fase, orden, id_equipo_local, id_equipo_visitante, id_llave_siguiente, es_local_siguiente)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id_division, fase, orden, id_equipo_local || null, id_equipo_visitante || null, id_llave_siguiente || null, es_local_siguiente ?? true]
    );
    return respuestaExito(res, rows[0], 'Llave de playoff creada exitosamente.', 201);
  } catch (error) {
    console.error('[playoff.controller] crear error:', error);
    return respuestaError(res, 'Error al crear la llave de playoff.', 500, error.message);
  }
};

const actualizarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, penales_local, penales_visitante, estado_partido, id_equipo_ganador } = req.body;
    const { rows } = await query(
      `UPDATE public.llave_playoff
       SET id_equipo_local    = COALESCE($1,  id_equipo_local),
           id_equipo_visitante= COALESCE($2,  id_equipo_visitante),
           goles_local        = COALESCE($3,  goles_local),
           goles_visitante    = COALESCE($4,  goles_visitante),
           penales_local      = COALESCE($5,  penales_local),
           penales_visitante  = COALESCE($6,  penales_visitante),
           estado_partido     = COALESCE($7,  estado_partido),
           id_equipo_ganador  = COALESCE($8,  id_equipo_ganador),
           updated_at         = NOW()
       WHERE id_llave = $9 AND activo = TRUE
       RETURNING *`,
      [id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, penales_local, penales_visitante, estado_partido, id_equipo_ganador, id]
    );
    if (rows.length === 0) return respuestaError(res, 'Llave no encontrada.', 404);
    return respuestaExito(res, rows[0], 'Llave actualizada correctamente.');
  } catch (error) {
    console.error('[playoff.controller] actualizarResultado error:', error);
    return respuestaError(res, 'Error al actualizar la llave.', 500, error.message);
  }
};

const eliminar = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE public.llave_playoff SET activo = FALSE, updated_at = NOW() WHERE id_llave = $1 AND activo = TRUE RETURNING id_llave`,
      [req.params.id]
    );
    if (rows.length === 0) return respuestaError(res, 'Llave no encontrada.', 404);
    return respuestaExito(res, null, 'Llave eliminada correctamente.');
  } catch (error) {
    console.error('[playoff.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar la llave.', 500, error.message);
  }
};

module.exports = { obtenerPorDivision, crear, actualizarResultado, eliminar };
