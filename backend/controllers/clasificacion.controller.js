const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');
const { SQL_TABLA_PUBLICA } = require('../utils/clasificacion');

// Columnas editables a mano. Cada una tiene su ajuste_<columna>, que el recálculo suma a lo que sale de los partidos.
// partidos_jugados y diferencia_gol no se editan: se derivan de las demás.
const COLUMNAS_EDITABLES = [
  'puntos',
  'partidos_ganados',
  'partidos_empatados',
  'partidos_perdidos',
  'goles_a_favor',
  'goles_en_contra',
];

// GET /api/clasificacion/:id_division — Tabla de posiciones de una división
const obtenerPorDivision = async (req, res) => {
  try {
    const { rows } = await query(SQL_TABLA_PUBLICA, [req.params.id_division]);
    return respuestaExito(res, rows, 'Clasificación obtenida correctamente.');
  } catch (error) {
    console.error('[clasificacion.controller] obtenerPorDivision error:', error);
    return respuestaError(res, 'Error al obtener la clasificación.', 500, error.message);
  }
};

// GET /api/clasificacion/:id_division/detalle — Tabla con los ajustes manuales, su motivo y quién los cargó (panel)
const obtenerDetallePorDivision = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, e.nombre_equipo, e.nombre_corto, e.logo_url, e.es_argentinos_del_norte,
              pu.nombre_completo AS ajustado_por_nombre
       FROM public.clasificacion c
       INNER JOIN public.equipo e ON e.id_equipo = c.id_equipo AND e.activo = TRUE
       LEFT JOIN public.perfil_usuario pu ON pu.id_perfil = c.ajustado_por
       WHERE c.id_division = $1 AND c.activo = TRUE
       ORDER BY c.puntos DESC, c.diferencia_gol DESC, c.goles_a_favor DESC`,
      [req.params.id_division]
    );
    return respuestaExito(res, rows, 'Clasificación obtenida correctamente.');
  } catch (error) {
    console.error('[clasificacion.controller] obtenerDetallePorDivision error:', error);
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

// PUT /api/clasificacion/:id — Corrige a mano una fila (sanciones, puntos de mesa, partidos no cargados).
// Recibe los valores finales; guarda la diferencia con lo que dicen los partidos como ajuste, con motivo y autor.
const actualizarFila = async (req, res) => {
  try {
    const { id } = req.params;
    const motivo = String(req.body?.motivo ?? '').trim();

    const resultado = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM public.clasificacion WHERE id_clasificacion = $1 AND activo = TRUE FOR UPDATE`,
        [id]
      );
      if (rows.length === 0) return { codigo: 404 };
      const fila = rows[0];

      // Lo que dicen los partidos = valor actual menos el ajuste que ya tenía.
      // Si no coincide con lo que vio el formulario (base), un partido cambió mientras se editaba:
      // guardar igual convertiría ese resultado en parte del ajuste manual.
      const ajustes = {};
      for (const col of COLUMNAS_EDITABLES) {
        const segunPartidos = fila[col] - fila[`ajuste_${col}`];
        if (Number(req.body.base[col]) !== segunPartidos) return { codigo: 409 };
        ajustes[col] = Number(req.body[col]) - segunPartidos;
      }
      const hayAjuste = Object.values(ajustes).some((a) => a !== 0);
      if (hayAjuste && !motivo) return { codigo: 400 };

      const { rows: actualizada } = await client.query(
        `UPDATE public.clasificacion
         SET ${COLUMNAS_EDITABLES.map((col, i) => `${col} = $${i + 1}, ajuste_${col} = $${i + 7}`).join(', ')},
             partidos_jugados = $2::int + $3::int + $4::int,
             motivo_ajuste = $13, ajustado_por = $14, fecha_ajuste = $15
         WHERE id_clasificacion = $16
         RETURNING *`,
        [
          ...COLUMNAS_EDITABLES.map((col) => Number(req.body[col])),
          ...COLUMNAS_EDITABLES.map((col) => ajustes[col]),
          hayAjuste ? motivo : null,
          hayAjuste ? req.usuario.id : null,
          hayAjuste ? new Date() : null,
          id,
        ]
      );
      return { codigo: 200, fila: actualizada[0], hayAjuste };
    });

    if (resultado.codigo === 404) return respuestaError(res, 'Fila de la tabla no encontrada.', 404);
    if (resultado.codigo === 409) {
      return respuestaError(
        res,
        'La tabla cambió mientras editabas (se cargó o modificó un partido). Volvé a abrir la fila y cargá la corrección de nuevo.',
        409
      );
    }
    if (resultado.codigo === 400) {
      return respuestaError(res, 'Indicá el motivo del cambio: queda registrado junto con el ajuste.', 400);
    }
    return respuestaExito(
      res,
      resultado.fila,
      resultado.hayAjuste ? 'Tabla corregida. El ajuste se mantiene aunque se recalcule.' : 'La fila volvió a lo que dicen los partidos.'
    );
  } catch (error) {
    console.error('[clasificacion.controller] actualizarFila error:', error);
    return respuestaError(res, 'Error al corregir la tabla de posiciones.', 500, error.message);
  }
};

module.exports = { obtenerPorDivision, obtenerDetallePorDivision, recalcular, actualizarFila };
