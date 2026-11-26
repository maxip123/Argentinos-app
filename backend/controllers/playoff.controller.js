const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

const COPAS = ['Unica', 'Oro', 'Plata'];
const FORMATOS = ['unico', 'ida_vuelta'];

// Da de baja los partidos de las llaves indicadas y resincroniza lo que dependía de ellos
async function bajaPartidosDeLlaves(client, idsLlave) {
  if (idsLlave.length === 0) return;
  const { rows: partidos } = await client.query(
    `UPDATE public.partido SET activo = FALSE, updated_at = NOW()
     WHERE id_llave = ANY($1::bigint[]) AND activo
     RETURNING id_partido, id_division`,
    [idsLlave]
  );
  if (partidos.length === 0) return;
  const { rows: jugadores } = await client.query(
    `SELECT DISTINCT id_jugador FROM public.partido_estadistica_jugador WHERE id_partido = ANY($1::bigint[])`,
    [partidos.map((p) => p.id_partido)]
  );
  for (const j of jugadores) {
    await client.query(`SELECT public.sincronizar_estadisticas_jugador($1)`, [j.id_jugador]);
  }
  // Los partidos de cruce no suman a la tabla, pero se recalcula por las dudas
  for (const idDivision of new Set(partidos.map((p) => p.id_division))) {
    await client.query(`SELECT public.recalcular_clasificacion_division($1)`, [idDivision]);
  }
}

/**
 * GET /api/playoff/:id_division
 * Retorna todas las llaves activas de la fase eliminatoria de un torneo.
 */
const obtenerPorDivision = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { rows } = await query(
      `SELECT lp.*,
              el.nombre_equipo AS equipo_local_nombre,  el.nombre_corto AS nombre_corto_local,  el.logo_url AS logo_local,  el.es_argentinos_del_norte AS local_es_argentinos,
              ev.nombre_equipo AS equipo_visitante_nombre, ev.nombre_corto AS nombre_corto_visitante, ev.logo_url AS logo_visitante, ev.es_argentinos_del_norte AS visitante_es_argentinos,
              eg.nombre_equipo AS equipo_ganador_nombre,
              COALESCE((
                SELECT json_agg(json_build_object(
                         'id_partido', p.id_partido, 'numero_juego', p.numero_juego, 'fecha_partido', p.fecha_partido,
                         'nombre_sede', s.nombre_sede, 'id_equipo_local', p.id_equipo_local,
                         'id_equipo_visitante', p.id_equipo_visitante, 'goles_local', p.goles_local,
                         'goles_visitante', p.goles_visitante, 'penales_local', p.penales_local,
                         'penales_visitante', p.penales_visitante, 'id_equipo_desempate', p.id_equipo_desempate,
                         'estado_partido', p.estado_partido)
                       ORDER BY p.numero_juego)
                FROM public.partido p
                JOIN public.sede s ON s.id_sede = p.id_sede
                WHERE p.id_llave = lp.id_llave AND p.activo
              ), '[]'::json) AS partidos
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
    // Formato de cada ronda: { 'Cuartos de Final': 'ida_vuelta', ... }; lo que no viene es partido único
    const formatos = req.body.formatos && typeof req.body.formatos === 'object' ? req.body.formatos : {};
    if (Object.values(formatos).some((f) => !FORMATOS.includes(f))) {
      return respuestaError(res, 'El formato de cada ronda debe ser partido único o ida y vuelta.', 422);
    }

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
          `INSERT INTO public.llave_playoff (id_division, fase, orden, es_local_siguiente, copa, formato)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id_llave`,
          [l.id_division, l.fase, l.orden, l.es_local_siguiente, copa, formatos[l.fase] || 'unico']
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
 * Edita los equipos o el formato de un cruce. El resultado ya no se carga acá: sale de sus partidos
 * (ver utils/cruces.js). Equipos y formato solo se pueden cambiar mientras el cruce no tenga partidos.
 */
const actualizarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_equipo_local, id_equipo_visitante, formato } = req.body;
    if (formato !== undefined && !FORMATOS.includes(formato)) {
      return respuestaError(res, 'El formato debe ser partido único o ida y vuelta.', 422);
    }

    const resultado = await withTransaction(async (client) => {
      const { rows: [actual] } = await client.query(
        `SELECT * FROM public.llave_playoff WHERE id_llave = $1 AND activo = TRUE FOR UPDATE`, [id]
      );
      if (!actual) return { codigo: 404 };

      const aId = (v, previo) => (v === undefined ? (previo ? Number(previo) : null) : (v ? parseInt(v, 10) : null));
      const nuevoLocal = aId(id_equipo_local, actual.id_equipo_local);
      const nuevoVisitante = aId(id_equipo_visitante, actual.id_equipo_visitante);
      const nuevoFormato = formato ?? actual.formato;
      const cambia = nuevoLocal !== (actual.id_equipo_local ? Number(actual.id_equipo_local) : null)
        || nuevoVisitante !== (actual.id_equipo_visitante ? Number(actual.id_equipo_visitante) : null)
        || nuevoFormato !== actual.formato;
      if (!cambia) return { codigo: 200, llave: actual };

      if (nuevoLocal && nuevoLocal === nuevoVisitante) return { codigo: 400, mensaje: 'Un equipo no puede jugar contra sí mismo.' };
      const { rows: [{ partidos }] } = await client.query(
        `SELECT count(*)::int AS partidos FROM public.partido WHERE id_llave = $1 AND activo`, [id]
      );
      if (partidos > 0) {
        return { codigo: 400, mensaje: 'El cruce ya tiene partidos cargados: para cambiar los equipos o el formato, primero eliminá esos partidos.' };
      }
      for (const idEquipo of [nuevoLocal, nuevoVisitante].filter(Boolean)) {
        const { rows } = await client.query(
          `SELECT 1 FROM public.equipo WHERE id_equipo = $1 AND id_division = $2 AND activo`, [idEquipo, actual.id_division]
        );
        if (rows.length === 0) return { codigo: 400, mensaje: 'Los equipos del cruce tienen que ser de este torneo.' };
      }
      const { rows: [llave] } = await client.query(
        `UPDATE public.llave_playoff
         SET id_equipo_local = $1, id_equipo_visitante = $2, formato = $3, updated_at = NOW()
         WHERE id_llave = $4 RETURNING *`,
        [nuevoLocal, nuevoVisitante, nuevoFormato, id]
      );
      return { codigo: 200, llave };
    });

    if (resultado.codigo === 404) return respuestaError(res, 'Llave de playoff no encontrada.', 404);
    if (resultado.codigo === 400) return respuestaError(res, resultado.mensaje, 400);
    return respuestaExito(res, resultado.llave, 'Llave actualizada correctamente.');
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

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE public.llave_playoff SET activo = FALSE, updated_at = NOW()
         WHERE id_division = $1 AND activo = TRUE AND ($2::varchar IS NULL OR copa = $2)
         RETURNING id_llave`,
        [id_division, copa ?? null]
      );
      // Los partidos de esos cruces también se dan de baja
      await bajaPartidosDeLlaves(client, rows.map((r) => r.id_llave));
    });
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
    const rows = await withTransaction(async (client) => {
      const { rows: bajas } = await client.query(
        `UPDATE public.llave_playoff SET activo = FALSE, updated_at = NOW() WHERE id_llave = $1 AND activo = TRUE RETURNING id_llave`,
        [req.params.id]
      );
      await bajaPartidosDeLlaves(client, bajas.map((r) => r.id_llave));
      return bajas;
    });
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
