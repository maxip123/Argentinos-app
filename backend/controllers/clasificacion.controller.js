const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/clasificacion/:id_division — Tabla de posiciones de una división
const obtenerPorDivision = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { rows } = await query(
      `SELECT c.*, e.nombre_equipo, e.nombre_corto, e.logo_url, e.es_argentinos_del_norte
       FROM public.clasificacion c
       INNER JOIN public.equipo e ON e.id_equipo = c.id_equipo
       WHERE c.id_division = $1 AND c.activo = TRUE
       ORDER BY c.puntos DESC, c.diferencia_gol DESC, c.goles_a_favor DESC`,
      [id_division]
    );
    return respuestaExito(res, rows, 'Clasificación obtenida correctamente.');
  } catch (error) {
    console.error('[clasificacion.controller] obtenerPorDivision error:', error);
    return respuestaError(res, 'Error al obtener la clasificación.', 500, error.message);
  }
};

// POST /api/clasificacion/recalcular/:id_division — Fuerza recálculo completo
const recalcular = async (req, res) => {
  try {
    const { id_division } = req.params;
    await query(`SELECT public.recalcular_clasificacion_division($1)`, [id_division]);
    return respuestaExito(res, null, 'Clasificación recalculada correctamente.');
  } catch (error) {
    console.error('[clasificacion.controller] recalcular error:', error);
    return respuestaError(res, 'Error al recalcular la clasificación.', 500, error.message);
  }
};

module.exports = { obtenerPorDivision, recalcular };
