const { query, withTransaction } = require('../config/db');
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

/**
 * POST /api/divisiones/clonar/:id
 * Clona una división/torneo finalizado para iniciar un nuevo torneo (ej. Apertura -> Clausura),
 * copiando equipos y planteles de jugadores (reiniciando goles y tarjetas a 0),
 * y preservando intactos los datos del torneo anterior para historial.
 */
const clonarTorneo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_nuevo_torneo, temporada, marcar_anterior_finalizado = true } = req.body;

    if (!nombre_nuevo_torneo || !nombre_nuevo_torneo.trim()) {
      return respuestaError(res, 'El nombre del nuevo torneo es requerido.', 422);
    }

    // 1. Obtener datos del torneo origen
    const { rows: origenRows } = await query(
      `SELECT * FROM public.division WHERE id_division = $1 AND activo = TRUE`,
      [id]
    );

    if (origenRows.length === 0) {
      return respuestaError(res, 'Torneo o división de origen no encontrada.', 404);
    }

    const origen = origenRows[0];

    const resultado = await withTransaction(async (client) => {
      // 2. Si se solicitó, marcar el torneo anterior como terminado
      if (marcar_anterior_finalizado) {
        await client.query(
          `UPDATE public.division SET terminado = TRUE, updated_at = NOW() WHERE id_division = $1`,
          [id]
        );
      }

      // 3. Crear el nuevo torneo / división
      const { rows: nuevoRows } = await client.query(
        `INSERT INTO public.division
           (nombre_division, categoria, genero, temporada, terminado, fecha_inicio, reglas)
         VALUES ($1, $2, $3, $4, FALSE, NOW(), $5)
         RETURNING *`,
        [
          nombre_nuevo_torneo.trim(),
          origen.categoria,
          origen.genero,
          temporada || origen.temporada,
          origen.reglas || JSON.stringify({ puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 }),
        ]
      );

      const nuevaDivision = nuevoRows[0];
      const nuevoId = nuevaDivision.id_division;

      // 4. Copiar todos los equipos participantes (tanto rivales como de Argentinos del Norte)
      const { rows: equiposOrigen } = await client.query(
        `SELECT * FROM public.equipo WHERE id_division = $1 AND activo = TRUE`,
        [id]
      );

      const mapaEquipos = new Map(); // id_equipo_viejo -> id_equipo_nuevo

      for (const eq of equiposOrigen) {
        const { rows: nuevoEqRows } = await client.query(
          `INSERT INTO public.equipo
             (id_division, nombre_equipo, nombre_corto, logo_url, es_argentinos_del_norte)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id_equipo`,
          [nuevoId, eq.nombre_equipo, eq.nombre_corto, eq.logo_url, eq.es_argentinos_del_norte]
        );
        mapaEquipos.set(eq.id_equipo, nuevoEqRows[0].id_equipo);
      }

      // 5. Copiar planteles (equipo_jugador) EXCLUSIVAMENTE para los equipos de Argentinos del Norte
      // No se crean jugadores duplicados en public.jugador; se vinculan los socios existentes del club al nuevo equipo
      const { rows: jugadoresClub } = await client.query(
        `SELECT ej.id_jugador, ej.numero_camiseta, ej.posicion, ej.es_titular_habitual, eq.id_equipo AS id_equipo_viejo
         FROM public.equipo_jugador ej
         INNER JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo
         WHERE eq.id_division = $1 AND eq.es_argentinos_del_norte = TRUE AND ej.activo = TRUE`,
        [id]
      );

      let jugadoresCopiados = 0;
      for (const jug of jugadoresClub) {
        const nuevoIdEquipo = mapaEquipos.get(jug.id_equipo_viejo);
        if (nuevoIdEquipo) {
          await client.query(
            `INSERT INTO public.equipo_jugador
               (id_equipo, id_jugador, numero_camiseta, posicion, es_titular_habitual, activo)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             ON CONFLICT (id_equipo, id_jugador) DO NOTHING`,
            [
              nuevoIdEquipo,
              jug.id_jugador,
              jug.numero_camiseta,
              jug.posicion,
              jug.es_titular_habitual,
            ]
          );
          jugadoresCopiados++;
        }
      }

      // 6. Copiar cuerpo técnico asignado a los equipos de Argentinos del Norte
      const { rows: staffClub } = await client.query(
        `SELECT ect.id_cuerpo_tecnico, ect.rol_en_equipo, eq.id_equipo AS id_equipo_viejo
         FROM public.equipo_cuerpo_tecnico ect
         INNER JOIN public.equipo eq ON eq.id_equipo = ect.id_equipo
         WHERE eq.id_division = $1 AND eq.es_argentinos_del_norte = TRUE AND ect.activo = TRUE`,
        [id]
      );

      for (const staff of staffClub) {
        const nuevoIdEquipo = mapaEquipos.get(staff.id_equipo_viejo);
        if (nuevoIdEquipo) {
          await client.query(
            `INSERT INTO public.equipo_cuerpo_tecnico
               (id_equipo, id_cuerpo_tecnico, rol_en_equipo, activo)
             VALUES ($1, $2, $3, TRUE)
             ON CONFLICT (id_equipo, id_cuerpo_tecnico) DO NOTHING`,
            [nuevoIdEquipo, staff.id_cuerpo_tecnico, staff.rol_en_equipo]
          );
        }
      }

      return {
        nueva_division: nuevaDivision,
        equipos_copiados: equiposOrigen.length,
        jugadores_copiados: jugadoresCopiados,
      };
    });

    return respuestaExito(
      res,
      resultado,
      `Nuevo torneo '${resultado.nueva_division.nombre_division}' creado con éxito. Se migraron ${resultado.equipos_copiados} equipos y el plantel de Argentinos del Norte (${resultado.jugadores_copiados} jugadores).`,
      201
    );
  } catch (error) {
    console.error('[division.controller] clonarTorneo error:', error);
    return respuestaError(res, 'Error al clonar el torneo.', 500, error.message);
  }
};

/**
 * POST /api/divisiones/finalizar-y-archivar/:id
 * Saca una "foto histórica" completa del torneo finalizado (resultados de partidos,
 * tabla final, cruces de playoff, goleadores y tarjetas de Argentinos del Norte)
 * y la guarda en public.historial_torneo.
 * Luego resetea la tabla y fixture para la nueva edición, dejando a los equipos
 * y jugadores intactos en su división.
 */
const finalizarYArchivarTorneo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_torneo,
      temporada,
      id_equipo_campeon,
      nombre_siguiente_torneo,
      nueva_temporada,
      observaciones,
    } = req.body;

    // 1. Obtener división activa
    const { rows: divRows } = await query(
      `SELECT * FROM public.division WHERE id_division = $1 AND activo = TRUE`,
      [id]
    );
    if (divRows.length === 0) {
      return respuestaError(res, 'División o categoría no encontrada.', 404);
    }
    const div = divRows[0];
    const nombreTorneoFinalizado = (nombre_torneo && nombre_torneo.trim()) || div.nombre_division;
    const temporadaFinalizada = temporada ? parseInt(temporada) : div.temporada;

    const snapshot = await withTransaction(async (client) => {
      // 2. Tabla final de posiciones
      const { rows: tablaPosiciones } = await client.query(
        `SELECT c.*, e.nombre_equipo, e.nombre_corto, e.logo_url, e.es_argentinos_del_norte
         FROM public.clasificacion c
         INNER JOIN public.equipo e ON e.id_equipo = c.id_equipo
         WHERE c.id_division = $1 AND c.activo = TRUE
         ORDER BY c.puntos DESC, c.diferencia_gol DESC, c.goles_a_favor DESC`,
        [id]
      );

      // 3. Resultados de los partidos del torneo
      const { rows: partidosResultados } = await client.query(
        `SELECT p.id_partido, p.jornada_numero, p.nombre_partido, p.fecha_partido,
                p.goles_local, p.goles_visitante, p.estado_partido,
                el.nombre_equipo AS local_nombre, el.logo_url AS local_logo, el.es_argentinos_del_norte AS local_es_club,
                ev.nombre_equipo AS visitante_nombre, ev.logo_url AS visitante_logo, ev.es_argentinos_del_norte AS visitante_es_club,
                s.nombre_sede
         FROM public.partido p
         INNER JOIN public.equipo el ON el.id_equipo = p.id_equipo_local
         INNER JOIN public.equipo ev ON ev.id_equipo = p.id_equipo_visitante
         LEFT JOIN public.sede s ON s.id_sede = p.id_sede
         WHERE p.id_division = $1 AND p.activo = TRUE
         ORDER BY p.jornada_numero ASC NULLS LAST, p.fecha_partido ASC`,
        [id]
      );

      // 4. Llaves de Playoff
      const { rows: playoffs } = await client.query(
        `SELECT lp.*,
                el.nombre_equipo AS local_nombre, el.logo_url AS local_logo,
                ev.nombre_equipo AS visitante_nombre, ev.logo_url AS visitante_logo,
                eg.nombre_equipo AS ganador_nombre
         FROM public.llave_playoff lp
         LEFT JOIN public.equipo el ON el.id_equipo = lp.id_equipo_local
         LEFT JOIN public.equipo ev ON ev.id_equipo = lp.id_equipo_visitante
         LEFT JOIN public.equipo eg ON eg.id_equipo = lp.id_equipo_ganador
         WHERE lp.id_division = $1 AND lp.activo = TRUE
         ORDER BY lp.id_llave ASC`,
        [id]
      );

      // 5. Goleadores de Argentinos del Norte en este torneo
      const { rows: goleadoresClub } = await client.query(
        `SELECT j.id_jugador, j.nombre, j.apellido, j.foto_url,
                SUM(pe.goles) AS goles,
                eq.nombre_equipo
         FROM public.partido_estadistica_jugador pe
         INNER JOIN public.partido p ON p.id_partido = pe.id_partido
         INNER JOIN public.jugador j ON j.id_jugador = pe.id_jugador
         INNER JOIN public.equipo eq ON eq.id_equipo = pe.id_equipo
         WHERE p.id_division = $1 AND p.activo = TRUE AND (j.es_jugador_club = TRUE OR eq.es_argentinos_del_norte = TRUE)
         GROUP BY j.id_jugador, j.nombre, j.apellido, j.foto_url, eq.nombre_equipo
         HAVING SUM(pe.goles) > 0
         ORDER BY SUM(pe.goles) DESC`,
        [id]
      );

      // 6. Tarjetas de Argentinos del Norte en este torneo
      const { rows: tarjetasClub } = await client.query(
        `SELECT j.id_jugador, j.nombre, j.apellido, j.foto_url,
                SUM(pe.tarjetas_amarillas) AS amarillas,
                SUM(pe.tarjetas_rojas) AS rojas,
                eq.nombre_equipo
         FROM public.partido_estadistica_jugador pe
         INNER JOIN public.partido p ON p.id_partido = pe.id_partido
         INNER JOIN public.jugador j ON j.id_jugador = pe.id_jugador
         INNER JOIN public.equipo eq ON eq.id_equipo = pe.id_equipo
         WHERE p.id_division = $1 AND p.activo = TRUE AND (j.es_jugador_club = TRUE OR eq.es_argentinos_del_norte = TRUE)
         GROUP BY j.id_jugador, j.nombre, j.apellido, j.foto_url, eq.nombre_equipo
         HAVING (SUM(pe.tarjetas_amarillas) > 0 OR SUM(pe.tarjetas_rojas) > 0)
         ORDER BY SUM(pe.tarjetas_rojas) DESC, SUM(pe.tarjetas_amarillas) DESC`,
        [id]
      );

      // 7. Determinar Campeón
      let campeonEquipoId = id_equipo_campeon ? parseInt(id_equipo_campeon) : null;
      let campeonNombre = null;
      let campeonLogo = null;
      let esCampeonClub = false;

      if (!campeonEquipoId) {
        // Chequear ganador de la final de playoff
        const finalPlayoff = playoffs.find(l => l.fase === 'Final' && l.estado_partido === 2 && l.id_equipo_ganador);
        if (finalPlayoff) {
          campeonEquipoId = finalPlayoff.id_equipo_ganador;
          campeonNombre = finalPlayoff.ganador_nombre;
        } else if (tablaPosiciones.length > 0) {
          // Ganador por tabla regular
          campeonEquipoId = tablaPosiciones[0].id_equipo;
          campeonNombre = tablaPosiciones[0].nombre_equipo;
          campeonLogo = tablaPosiciones[0].logo_url;
          esCampeonClub = Boolean(tablaPosiciones[0].es_argentinos_del_norte);
        }
      }

      if (campeonEquipoId && !campeonNombre) {
        const { rows: campRows } = await client.query(
          `SELECT nombre_equipo, logo_url, es_argentinos_del_norte FROM public.equipo WHERE id_equipo = $1`,
          [campeonEquipoId]
        );
        if (campRows.length > 0) {
          campeonNombre = campRows[0].nombre_equipo;
          campeonLogo = campRows[0].logo_url;
          esCampeonClub = Boolean(campRows[0].es_argentinos_del_norte);
        }
      }

      const totalPartidos = partidosResultados.filter(p => p.estado_partido === 2).length;
      const totalGoles = partidosResultados
        .filter(p => p.estado_partido === 2)
        .reduce((acc, p) => acc + (p.goles_local || 0) + (p.goles_visitante || 0), 0);

      // 8. Insertar en historial_torneo el snapshot completo
      const { rows: histRows } = await client.query(
        `INSERT INTO public.historial_torneo
           (id_division, nombre_torneo, temporada, genero, categoria,
            id_equipo_campeon, nombre_equipo_campeon, logo_campeon_url, es_campeon_argentinos,
            tabla_posiciones, partidos_resultados, playoffs, goleadores_club, tarjetas_club,
            resumen_estadisticas, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          id,
          nombreTorneoFinalizado,
          temporadaFinalizada,
          div.genero,
          div.categoria,
          campeonEquipoId,
          campeonNombre,
          campeonLogo,
          esCampeonClub,
          JSON.stringify(tablaPosiciones),
          JSON.stringify(partidosResultados),
          JSON.stringify(playoffs),
          JSON.stringify(goleadoresClub),
          JSON.stringify(tarjetasClub),
          JSON.stringify({ total_partidos: totalPartidos, total_goles: totalGoles, total_equipos: tablaPosiciones.length }),
          observaciones || null,
        ]
      );

      // 9. Marcar la división como Finalizada y asociar su campeón
      await client.query(
        `UPDATE public.division
         SET terminado = TRUE,
             id_equipo_campeon = COALESCE($1, id_equipo_campeon),
             updated_at = NOW()
         WHERE id_division = $2`,
        [campeonEquipoId, id]
      );

      return histRows[0];
    });

    return respuestaExito(
      res,
      snapshot,
      `Torneo '${nombreTorneoFinalizado}' finalizado y guardado en el Historial con éxito.`,
      201
    );
  } catch (error) {
    console.error('[division.controller] finalizarYArchivarTorneo error:', error);
    return respuestaError(res, 'Error al finalizar y archivar el torneo.', 500, error.message);
  }
};

/**
 * GET /api/divisiones/historial
 * Retorna las ediciones finalizadas de torneos a partir de los snapshots ricos de public.historial_torneo
 * y mantiene compatibilidad con torneos legacy.
 */
const obtenerHistorialTorneos = async (req, res) => {
  try {
    // 1. Obtener los snapshots ricos de historial_torneo
    const { rows: snapshots } = await query(
      `SELECT h.*,
              json_build_object(
                'id_equipo', h.id_equipo_campeon,
                'nombre_equipo', h.nombre_equipo_campeon,
                'logo_url', h.logo_campeon_url,
                'es_argentinos_del_norte', h.es_campeon_argentinos
              ) AS campeon_definitivo
       FROM public.historial_torneo h
       WHERE h.activo = TRUE
       ORDER BY h.fecha_finalizacion DESC, h.temporada DESC`
    );

    const listaHistorial = snapshots.map((s) => {
      const tabla = Array.isArray(s.tabla_posiciones) ? s.tabla_posiciones : [];
      return {
        id_historial: s.id_historial,
        id_division: s.id_division,
        nombre_division: s.nombre_torneo,
        temporada: s.temporada,
        genero: s.genero,
        categoria: s.categoria,
        fecha_finalizacion: s.fecha_finalizacion,
        cantidad_equipos: s.resumen_estadisticas?.total_equipos || tabla.length,
        partidos_jugados: s.resumen_estadisticas?.total_partidos || 0,
        total_goles: s.resumen_estadisticas?.total_goles || 0,
        campeon_definitivo: s.campeon_definitivo?.nombre_equipo ? s.campeon_definitivo : (tabla[0] || null),
        campeon_tabla: tabla[0] || null,
        subcampeon_tabla: tabla[1] || null,
        tercer_puesto_tabla: tabla[2] || null,
        // Snapshots ricos estructurados
        tabla_posiciones: tabla,
        partidos: Array.isArray(s.partidos_resultados) ? s.partidos_resultados : [],
        playoffs: Array.isArray(s.playoffs) ? s.playoffs : [],
        goleadores_club: Array.isArray(s.goleadores_club) ? s.goleadores_club : [],
        tarjetas_club: Array.isArray(s.tarjetas_club) ? s.tarjetas_club : [],
        es_snapshot_rico: true,
      };
    });

    // 2. Si hay torneos antiguos en 'division' con terminado = TRUE que aún no tienen snapshot, incluirlos
    const { rows: legacyDivisiones } = await query(
      `SELECT d.* FROM public.division d
       WHERE d.activo = TRUE AND d.terminado = TRUE
         AND d.id_division NOT IN (SELECT COALESCE(id_division, -1) FROM public.historial_torneo WHERE activo = TRUE)`
    );

    for (const div of legacyDivisiones) {
      listaHistorial.push({
        id_division: div.id_division,
        nombre_division: div.nombre_division,
        temporada: div.temporada,
        genero: div.genero,
        categoria: div.categoria,
        cantidad_equipos: 0,
        partidos_jugados: 0,
        total_goles: 0,
        es_snapshot_rico: false,
      });
    }

    return respuestaExito(res, listaHistorial, 'Historial de torneos obtenido correctamente.');
  } catch (error) {
    console.error('[division.controller] obtenerHistorialTorneos error:', error);
    return respuestaError(res, 'Error al obtener historial de torneos.', 500, error.message);
  }
};

/**
 * DELETE /api/divisiones/historial/:id
 * Elimina un registro de torneo del archivo histórico.
 */
const eliminarHistorialTorneo = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.historial_torneo SET activo = FALSE WHERE id_historial = $1 RETURNING id_historial`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Registro histórico no encontrado.', 404);
    return respuestaExito(res, null, 'Registro del torneo eliminado del archivo histórico.');
  } catch (error) {
    console.error('[division.controller] eliminarHistorialTorneo error:', error);
    return respuestaError(res, 'Error al eliminar historial.', 500, error.message);
  }
};

/**
 * POST /api/divisiones/iniciar-nueva-edicion/:id
 * Inicia una nueva edición en una división finalizada:
 * - Pone terminado = FALSE e id_equipo_campeon = NULL.
 * - Desactiva partidos y llaves de playoff del torneo anterior.
 * - Resetea los puntos y estadísticas de la tabla de posiciones a 0.
 * - Permite opcionalmente actualizar el nombre del torneo (ej: Clausura) y temporada (año).
 * - Mantiene los equipos y los planteles de jugadores intactos.
 */
const iniciarNuevaEdicion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_division, temporada } = req.body;

    const { rows: divRows } = await query(
      `SELECT * FROM public.division WHERE id_division = $1 AND activo = TRUE`,
      [id]
    );
    if (divRows.length === 0) {
      return respuestaError(res, 'División no encontrada.', 404);
    }

    await withTransaction(async (client) => {
      // 1. Desactivar partidos del torneo anterior
      await client.query(`UPDATE public.partido SET activo = FALSE, updated_at = NOW() WHERE id_division = $1`, [id]);

      // 2. Desactivar llaves de playoff del torneo anterior
      await client.query(`UPDATE public.llave_playoff SET activo = FALSE, updated_at = NOW() WHERE id_division = $1`, [id]);

      // 3. Resetear tabla de clasificacion a 0 puntos
      await client.query(
        `UPDATE public.clasificacion
         SET puntos = 0, partidos_jugados = 0, partidos_ganados = 0, partidos_empatados = 0,
             partidos_perdidos = 0, goles_a_favor = 0, goles_en_contra = 0, updated_at = NOW()
         WHERE id_division = $1`,
        [id]
      );

      // 4. Reactivar división con terminado = FALSE y nombre/temporada actualizado
      await client.query(
        `UPDATE public.division
         SET terminado = FALSE,
             id_equipo_campeon = NULL,
             nombre_division = COALESCE($1, nombre_division),
             temporada = COALESCE($2, temporada),
             updated_at = NOW()
         WHERE id_division = $3`,
        [nombre_division ? nombre_division.trim() : null, temporada ? parseInt(temporada) : null, id]
      );
    });

    const { rows: updated } = await query(`SELECT * FROM public.division WHERE id_division = $1`, [id]);

    return respuestaExito(
      res,
      updated[0],
      `Nueva edición iniciada para '${updated[0].nombre_division}'. Los planteles y equipos permanecen intactos y las posiciones se reiniciaron a 0.`
    );
  } catch (error) {
    console.error('[division.controller] iniciarNuevaEdicion error:', error);
    return respuestaError(res, 'Error al iniciar nueva edición.', 500, error.message);
  }
};

module.exports = {
  obtenerTodas,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  clonarTorneo,
  finalizarYArchivarTorneo,
  iniciarNuevaEdicion,
  obtenerHistorialTorneos,
  eliminarHistorialTorneo,
};

