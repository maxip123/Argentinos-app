const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

const COPAS = ['Unica', 'Oro', 'Plata'];

/**
 * GET /api/playoff/:id_division
 * Retorna todas las llaves activas de la fase eliminatoria de un torneo.
 */
const obtenerPorDivision = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { rows } = await query(
      `SELECT lp.*,
              el.nombre_equipo AS equipo_local_nombre,  el.logo_url AS logo_local,  el.es_argentinos_del_norte AS local_es_argentinos,
              ev.nombre_equipo AS equipo_visitante_nombre, ev.logo_url AS logo_visitante, ev.es_argentinos_del_norte AS visitante_es_argentinos,
              eg.nombre_equipo AS equipo_ganador_nombre
       FROM public.llave_playoff lp
       LEFT JOIN public.equipo el ON el.id_equipo = lp.id_equipo_local
       LEFT JOIN public.equipo ev ON ev.id_equipo = lp.id_equipo_visitante
       LEFT JOIN public.equipo eg ON eg.id_equipo = lp.id_equipo_ganador
       WHERE lp.id_division = $1 AND lp.activo = TRUE
       ORDER BY lp.copa ASC, lp.id_llave ASC`,
      [id_division]
    );
    return respuestaExito(res, rows, 'Llaves de playoff obtenidas correctamente.');
  } catch (error) {
    console.error('[playoff.controller] obtenerPorDivision error:', error);
    return respuestaError(res, 'Error al obtener las llaves de playoff.', 500, error.message);
  }
};

/**
 * POST /api/playoff/generar
 * Genera la estructura de llaves eliminatorias (Bracket) de una copa del torneo
 * según la cantidad de equipos elegida (2, 4, 8, 16 o 32).
 * Un torneo tiene un cuadro 'Unica' o, si la liga lo define, uno 'Oro' y uno 'Plata'.
 */
const generarBracket = async (req, res) => {
  try {
    const { id_division, cantidad_equipos, copa = 'Unica' } = req.body;

    if (!id_division) {
      return respuestaError(res, 'El ID de la división es obligatorio.', 422);
    }

    const numEquipos = parseInt(cantidad_equipos);
    if (![2, 4, 8, 16, 32].includes(numEquipos)) {
      return respuestaError(res, 'La cantidad de equipos debe ser 2, 4, 8, 16 o 32.', 422);
    }

    if (!COPAS.includes(copa)) {
      return respuestaError(res, 'La copa debe ser Unica, Oro o Plata.', 422);
    }

    // Verificar qué cuadros activos tiene el torneo
    const { rows: existentes } = await query(
      `SELECT DISTINCT copa FROM public.llave_playoff WHERE id_division = $1 AND activo = TRUE`,
      [id_division]
    );
    const copasActivas = existentes.map((e) => e.copa);

    if (copasActivas.includes(copa)) {
      return respuestaError(res, 'Ya existe ese cuadro de playoff para este torneo. Podés reiniciarlo si deseás crear uno nuevo.', 400);
    }

    if (copa === 'Unica' ? copasActivas.length > 0 : copasActivas.includes('Unica')) {
      return respuestaError(res, 'Un torneo no puede combinar un cuadro único con Copa Oro y Plata. Reinicialo para cambiar el formato.', 400);
    }

    // 1. Armar rondas virtuales
    const rondas = {};
    let faseActual = numEquipos / 2;
    let ordenVirtual = 1;

    while (faseActual >= 1) {
      rondas[faseActual] = [];
      let nombreFase = '';
      if (faseActual === 1) nombreFase = 'Final';
      else if (faseActual === 2) nombreFase = 'Semifinal';
      else if (faseActual === 4) nombreFase = 'Cuartos de Final';
      else if (faseActual === 8) nombreFase = 'Octavos de Final';
      else if (faseActual === 16) nombreFase = '16avos de Final';

      for (let i = 0; i < faseActual; i++) {
        rondas[faseActual].push({
          virtual_id: ordenVirtual,
          id_division,
          fase: nombreFase,
          orden: i + 1,
          virtual_siguiente: null,
          es_local_siguiente: true,
        });
        ordenVirtual++;
      }
      faseActual = faseActual / 2;
    }

    // 2. Enlazar partidos hacia la siguiente ronda
    faseActual = numEquipos / 2;
    while (faseActual > 1) {
      const partidosEstaRonda = rondas[faseActual];
      const partidosSiguienteRonda = rondas[faseActual / 2];

      for (let i = 0; i < partidosEstaRonda.length; i++) {
        const partido = partidosEstaRonda[i];
        const indiceSig = Math.floor(i / 2);
        partido.virtual_siguiente = partidosSiguienteRonda[indiceSig].virtual_id;
        partido.es_local_siguiente = (i % 2 === 0);
      }
      faseActual = faseActual / 2;
    }

    // Aplanar y ordenar
    const llavesFinales = [];
    for (const valor of Object.values(rondas)) {
      llavesFinales.push(...valor);
    }
    llavesFinales.sort((a, b) => a.virtual_id - b.virtual_id);

    // 3. Insertar llaves en la base de datos y mapear IDs reales
    const mapaIds = new Map(); // virtual_id -> real id_llave

    await withTransaction(async (client) => {
      for (const l of llavesFinales) {
        const { rows } = await client.query(
          `INSERT INTO public.llave_playoff (id_division, fase, orden, es_local_siguiente, copa)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id_llave`,
          [l.id_division, l.fase, l.orden, l.es_local_siguiente, copa]
        );
        mapaIds.set(l.virtual_id, rows[0].id_llave);
      }

      // 4. Actualizar id_llave_siguiente con los IDs reales
      for (const l of llavesFinales) {
        if (l.virtual_siguiente !== null) {
          const realId = mapaIds.get(l.virtual_id);
          const nextRealId = mapaIds.get(l.virtual_siguiente);
          await client.query(
            `UPDATE public.llave_playoff
             SET id_llave_siguiente = $1, es_local_siguiente = $2
             WHERE id_llave = $3`,
            [nextRealId, l.es_local_siguiente, realId]
          );
        }
      }
    });

    return respuestaExito(
      res,
      { total_llaves: llavesFinales.length },
      `¡Cuadro de Playoff generado con éxito para ${numEquipos} equipos!`,
      201
    );
  } catch (error) {
    console.error('[playoff.controller] generarBracket error:', error);
    return respuestaError(res, 'Error al generar el cuadro de playoff.', 500, error.message);
  }
};

/**
 * PUT /api/playoff/:id
 * Actualiza los datos, equipos y resultado de una llave.
 * Si se marca como terminado (estado_partido = 2), avanza automáticamente al ganador a la siguiente ronda.
 */
const actualizarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_equipo_local,
      id_equipo_visitante,
      goles_local,
      goles_visitante,
      penales_local,
      penales_visitante,
      estado_partido,
      id_equipo_ganador,
    } = req.body;

    // 1. Obtener la llave actual para preservar campos no enviados
    const { rows: existente } = await query(
      `SELECT * FROM public.llave_playoff WHERE id_llave = $1 AND activo = TRUE`,
      [id]
    );

    if (existente.length === 0) {
      return respuestaError(res, 'Llave de playoff no encontrada.', 404);
    }

    const actual = existente[0];

    const nuevoLocal = id_equipo_local !== undefined ? (id_equipo_local ? parseInt(id_equipo_local) : null) : actual.id_equipo_local;
    const nuevoVisitante = id_equipo_visitante !== undefined ? (id_equipo_visitante ? parseInt(id_equipo_visitante) : null) : actual.id_equipo_visitante;
    const nuevosGolesLocal = goles_local !== undefined ? (goles_local === '' || goles_local === null ? null : parseInt(goles_local)) : actual.goles_local;
    const nuevosGolesVisitante = goles_visitante !== undefined ? (goles_visitante === '' || goles_visitante === null ? null : parseInt(goles_visitante)) : actual.goles_visitante;
    const nuevosPenalesLocal = penales_local !== undefined ? (penales_local === '' || penales_local === null ? null : parseInt(penales_local)) : actual.penales_local;
    const nuevosPenalesVisitante = penales_visitante !== undefined ? (penales_visitante === '' || penales_visitante === null ? null : parseInt(penales_visitante)) : actual.penales_visitante;
    const nuevoEstado = estado_partido !== undefined ? parseInt(estado_partido) : actual.estado_partido;
    const ganadorElegido = id_equipo_ganador !== undefined ? (id_equipo_ganador ? parseInt(id_equipo_ganador) : null) : actual.id_equipo_ganador;

    // El resultado define al ganador; la elección manual solo vale para desempatar por penales
    const hayResultado = nuevosGolesLocal !== null && nuevosGolesVisitante !== null;
    let nuevoGanador = ganadorElegido;
    if (hayResultado && nuevosGolesLocal !== nuevosGolesVisitante) {
      if (nuevoEstado === 2) {
        nuevoGanador = nuevosGolesLocal > nuevosGolesVisitante ? nuevoLocal : nuevoVisitante;
      } else {
        nuevoGanador = null;
      }
    }

    const { rows } = await query(
      `UPDATE public.llave_playoff
       SET id_equipo_local    = $1,
           id_equipo_visitante= $2,
           goles_local        = $3,
           goles_visitante    = $4,
           penales_local      = $5,
           penales_visitante  = $6,
           estado_partido     = $7,
           id_equipo_ganador  = $8,
           updated_at         = NOW()
       WHERE id_llave = $9 AND activo = TRUE
       RETURNING *`,
      [
        nuevoLocal,
        nuevoVisitante,
        nuevosGolesLocal,
        nuevosGolesVisitante,
        nuevosPenalesLocal,
        nuevosPenalesVisitante,
        nuevoEstado,
        nuevoGanador,
        id,
      ]
    );

    const llave = rows[0];

    // Si el partido está terminado (estado_partido = 2), calcular ganador y avanzar a la siguiente llave
    if (llave.estado_partido === 2 && llave.id_llave_siguiente) {
      const gl = llave.goles_local;
      const gv = llave.goles_visitante;
      let ganadorId = null;

      if (gl !== null && gv !== null) {
        if (gl > gv) {
          ganadorId = llave.id_equipo_local;
        } else if (gv > gl) {
          ganadorId = llave.id_equipo_visitante;
        } else {
          // Empate: ganador por penales
          ganadorId = llave.id_equipo_ganador;
        }
      }

      if (ganadorId) {
        const campoSiguiente = llave.es_local_siguiente ? 'id_equipo_local' : 'id_equipo_visitante';
        await query(
          `UPDATE public.llave_playoff
           SET ${campoSiguiente} = $1, updated_at = NOW()
           WHERE id_llave = $2 AND activo = TRUE`,
          [ganadorId, llave.id_llave_siguiente]
        );
      }
    } else if (actual.estado_partido === 2 && nuevoEstado !== 2 && llave.id_llave_siguiente) {
      // Si se desmarcó de terminado, limpiar el cupo avanzado si la llave siguiente aún no se jugó
      const campoSiguiente = llave.es_local_siguiente ? 'id_equipo_local' : 'id_equipo_visitante';
      await query(
        `UPDATE public.llave_playoff
         SET ${campoSiguiente} = NULL, updated_at = NOW()
         WHERE id_llave = $1 AND activo = TRUE AND estado_partido = 0`,
        [llave.id_llave_siguiente]
      );
    }

    return respuestaExito(res, llave, 'Llave actualizada correctamente.');
  } catch (error) {
    console.error('[playoff.controller] actualizarResultado error:', error);
    return respuestaError(res, 'Error al actualizar la llave.', 500, error.message);
  }
};

/**
 * DELETE /api/playoff/division/:id_division
 * Reinicia / elimina las llaves de playoff de un torneo para poder rearmarlo desde cero.
 * Con ?copa=Oro reinicia solo esa copa; sin el parámetro reinicia todas.
 */
const reiniciarBracket = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { copa } = req.query;

    if (copa !== undefined && !COPAS.includes(copa)) {
      return respuestaError(res, 'La copa debe ser Unica, Oro o Plata.', 422);
    }

    await query(
      `UPDATE public.llave_playoff SET activo = FALSE, updated_at = NOW()
       WHERE id_division = $1 AND activo = TRUE AND ($2::varchar IS NULL OR copa = $2)`,
      [id_division, copa ?? null]
    );
    return respuestaExito(res, null, 'Cuadro de playoff reiniciado correctamente.');
  } catch (error) {
    console.error('[playoff.controller] reiniciarBracket error:', error);
    return respuestaError(res, 'Error al reiniciar el playoff.', 500, error.message);
  }
};

/**
 * DELETE /api/playoff/:id
 * Soft delete de una llave específica
 */
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

module.exports = {
  obtenerPorDivision,
  generarBracket,
  actualizarResultado,
  reiniciarBracket,
  eliminar,
};
