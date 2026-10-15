const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/jugadores — Padrón de jugadores. Filtros: ?id_equipo= ?id_division= ?solo_club= ?q=
const obtenerTodos = async (req, res) => {
  try {
    const { id_equipo, id_division, solo_club, q, estado_cuota } = req.query;

    let sql = `
      SELECT j.id_jugador,
             j.nombre,
             j.apellido,
             j.dni,
             j.fecha_nacimiento,
             j.telefono,
             j.email,
             j.foto_url,
             j.es_jugador_club,
             j.es_inactivo,
             j.fecha_ultimo_pago,
             j.fecha_vencimiento,
             CASE
               WHEN j.es_inactivo = TRUE THEN 'Inactivo'
               WHEN j.fecha_vencimiento IS NOT NULL AND j.fecha_vencimiento >= CURRENT_DATE THEN 'Al dia'
               ELSE 'Pendiente'
             END AS estado_cuota,
             j.goles_totales,
             j.amarillas_totales,
             j.rojas_totales,
             j.partidos_jugados,
             j.activo,
             j.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id_equipo', eq.id_equipo,
                   'nombre_equipo', eq.nombre_equipo,
                   'id_division', eq.id_division,
                   'nombre_division', div.nombre_division,
                   'numero_camiseta', ej.numero_camiseta,
                   'posicion', ej.posicion,
                   'es_titular_habitual', ej.es_titular_habitual
                 )
               ) FILTER (WHERE eq.id_equipo IS NOT NULL AND ej.activo = TRUE),
               '[]'
             ) AS equipos_asignados
      FROM public.jugador j
      LEFT JOIN public.equipo_jugador ej ON ej.id_jugador = j.id_jugador AND ej.activo = TRUE
      LEFT JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo AND eq.activo = TRUE
      LEFT JOIN public.division div ON div.id_division = eq.id_division
      WHERE j.activo = TRUE
    `;

    const params = [];

    if (solo_club === 'true') {
      sql += ` AND j.es_jugador_club = TRUE`;
    }

    if (id_equipo) {
      params.push(id_equipo);
      sql += ` AND EXISTS (
        SELECT 1 FROM public.equipo_jugador ej2 
        WHERE ej2.id_jugador = j.id_jugador AND ej2.id_equipo = $${params.length} AND ej2.activo = TRUE
      )`;
    }

    if (id_division) {
      params.push(id_division);
      sql += ` AND (
        j.id_division = $${params.length} 
        OR EXISTS (
          SELECT 1 FROM public.equipo_jugador ej3
          JOIN public.equipo eq3 ON eq3.id_equipo = ej3.id_equipo
          WHERE ej3.id_jugador = j.id_jugador AND eq3.id_division = $${params.length} AND ej3.activo = TRUE
        )
      )`;
    }

    if (estado_cuota === 'pendiente') {
      sql += ` AND j.es_inactivo = FALSE AND (j.fecha_vencimiento IS NULL OR j.fecha_vencimiento < CURRENT_DATE)`;
    } else if (estado_cuota === 'al_dia') {
      sql += ` AND j.es_inactivo = FALSE AND j.fecha_vencimiento >= CURRENT_DATE`;
    } else if (estado_cuota === 'inactivo') {
      sql += ` AND j.es_inactivo = TRUE`;
    } else if (estado_cuota === 'activos') {
      sql += ` AND j.es_inactivo = FALSE`;
    }

    if (q) {
      params.push(`%${q.trim()}%`);
      sql += ` AND (
        j.nombre ILIKE $${params.length} 
        OR j.apellido ILIKE $${params.length} 
        OR j.dni ILIKE $${params.length}
      )`;
    }

    sql += ` GROUP BY j.id_jugador ORDER BY j.apellido ASC, j.nombre ASC`;

    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Jugadores obtenidos correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerTodos error:', error);
    return respuestaError(res, 'Error al obtener los jugadores.', 500, error.message);
  }
};

// GET /api/jugadores/:id
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT j.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id_equipo', eq.id_equipo,
                    'nombre_equipo', eq.nombre_equipo,
                    'id_division', eq.id_division,
                    'nombre_division', div.nombre_division,
                    'numero_camiseta', ej.numero_camiseta,
                    'posicion', ej.posicion,
                    'es_titular_habitual', ej.es_titular_habitual
                  )
                ) FILTER (WHERE eq.id_equipo IS NOT NULL AND ej.activo = TRUE),
                '[]'
              ) AS equipos_asignados
       FROM public.jugador j
       LEFT JOIN public.equipo_jugador ej ON ej.id_jugador = j.id_jugador AND ej.activo = TRUE
       LEFT JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo AND eq.activo = TRUE
       LEFT JOIN public.division div ON div.id_division = eq.id_division
       WHERE j.id_jugador = $1 AND j.activo = TRUE
       GROUP BY j.id_jugador`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Jugador obtenido correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener el jugador.', 500, error.message);
  }
};

// GET /api/jugadores/goleadores/:id_division — Tabla exclusiva de goleadores de Argentinos del Norte
const obtenerGoleadores = async (req, res) => {
  try {
    const { id_division } = req.params;
    const sql = `
      SELECT DISTINCT ON (j.id_jugador)
             j.id_jugador, j.nombre, j.apellido, j.foto_url, j.goles_totales AS goles,
             j.es_jugador_club,
             COALESCE(eq.nombre_equipo, 'Argentinos del Norte') AS nombre_equipo, 
             COALESCE(eq.es_argentinos_del_norte, TRUE) AS es_argentinos_del_norte,
             COALESCE(d.nombre_division, '') AS nombre_division
      FROM public.jugador j
      LEFT JOIN public.equipo_jugador ej ON ej.id_jugador = j.id_jugador AND ej.activo = TRUE
      LEFT JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo
      LEFT JOIN public.division d ON d.id_division = COALESCE(eq.id_division, j.id_division)
      WHERE (eq.id_division = $1 OR j.id_division = $1)
        AND j.activo = TRUE
        AND (j.es_jugador_club = TRUE OR eq.es_argentinos_del_norte = TRUE)
        AND j.goles_totales > 0
      ORDER BY j.id_jugador, j.goles_totales DESC`;

    const { rows } = await query(sql, [id_division]);
    // Ordenar de mayor a menor goleador
    rows.sort((a, b) => b.goles - a.goles);
    return respuestaExito(res, rows.slice(0, 50), 'Goleadores obtenidos correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerGoleadores error:', error);
    return respuestaError(res, 'Error al obtener los goleadores.', 500, error.message);
  }
};

// GET /api/jugadores/tarjetas/:id_division — Tabla disciplinaria exclusiva de Argentinos del Norte
const obtenerTarjetas = async (req, res) => {
  try {
    const { id_division } = req.params;
    const sql = `
      SELECT DISTINCT ON (j.id_jugador)
             j.id_jugador, j.nombre, j.apellido, j.foto_url,
             j.amarillas_totales AS amarillas, j.rojas_totales AS rojas,
             j.es_jugador_club,
             COALESCE(eq.nombre_equipo, 'Argentinos del Norte') AS nombre_equipo,
             COALESCE(eq.es_argentinos_del_norte, TRUE) AS es_argentinos_del_norte,
             COALESCE(d.nombre_division, '') AS nombre_division
      FROM public.jugador j
      LEFT JOIN public.equipo_jugador ej ON ej.id_jugador = j.id_jugador AND ej.activo = TRUE
      LEFT JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo
      LEFT JOIN public.division d ON d.id_division = COALESCE(eq.id_division, j.id_division)
      WHERE (eq.id_division = $1 OR j.id_division = $1)
        AND j.activo = TRUE
        AND (j.es_jugador_club = TRUE OR eq.es_argentinos_del_norte = TRUE)
        AND (j.amarillas_totales > 0 OR j.rojas_totales > 0)
      ORDER BY j.id_jugador, j.rojas_totales DESC, j.amarillas_totales DESC`;

    const { rows } = await query(sql, [id_division]);
    // Ordenar por rojas y luego amarillas
    rows.sort((a, b) => {
      if (b.rojas !== a.rojas) return b.rojas - a.rojas;
      return b.amarillas - a.amarillas;
    });
    return respuestaExito(res, rows.slice(0, 50), 'Tarjetas obtenidas correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerTarjetas error:', error);
    return respuestaError(res, 'Error al obtener las tarjetas.', 500, error.message);
  }
};

// POST /api/jugadores — Crear jugador en el Padrón (y opcionalmente asignarlo a un equipo inicial)
const crear = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      telefono,
      email,
      foto_url,
      id_equipo,
      id_division,
      numero_camiseta,
      posicion,
    } = req.body;

    if (!nombre || !apellido || !dni) {
      return respuestaError(res, 'Nombre, apellido y DNI son obligatorios.', 400);
    }

    // Validar si ya existe el DNI en el padrón activo
    const { rows: existente } = await query(
      `SELECT id_jugador, nombre, apellido FROM public.jugador WHERE dni = $1 AND activo = TRUE`,
      [dni.trim()]
    );
    if (existente.length > 0) {
      return respuestaError(
        res,
        `Ya existe un jugador registrado con el DNI ${dni.trim()} (${existente[0].nombre} ${existente[0].apellido}). Usá el botón 'Agregar Jugador Existente'.`,
        409
      );
    }

    // Si viene id_equipo, validar que exista
    if (id_equipo) {
      const { rows: eqRows } = await query(
        `SELECT id_equipo, id_division FROM public.equipo WHERE id_equipo = $1 AND activo = TRUE`,
        [id_equipo]
      );
      if (eqRows.length === 0) {
        return respuestaError(res, 'El equipo seleccionado no existe o no está activo.', 404);
      }
    }

    // Insertar en el padrón
    const { rows: jugRows } = await query(
      `INSERT INTO public.jugador
         (nombre, apellido, dni, fecha_nacimiento, telefono, email, foto_url, id_equipo, id_division, es_jugador_club)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING *`,
      [
        nombre.trim(),
        apellido.trim(),
        dni.trim(),
        fecha_nacimiento || null,
        telefono || null,
        email?.toLowerCase() || null,
        foto_url || null,
        id_equipo || null,
        id_division || null,
      ]
    );

    const nuevoJugador = jugRows[0];

    // Si se especificó equipo, asignarlo automáticamente a equipo_jugador
    if (id_equipo) {
      await query(
        `INSERT INTO public.equipo_jugador (id_equipo, id_jugador, numero_camiseta, posicion, activo)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id_equipo, id_jugador) DO UPDATE SET activo = TRUE, numero_camiseta = $3, posicion = $4`,
        [id_equipo, nuevoJugador.id_jugador, numero_camiseta ? parseInt(numero_camiseta) : null, posicion || null]
      );
    }

    return respuestaExito(res, nuevoJugador, 'Jugador registrado en el padrón exitosamente.', 201);
  } catch (error) {
    console.error('[jugador.controller] crear error:', error);
    return respuestaError(res, 'Error al crear el jugador.', 500, error.message);
  }
};

// PUT /api/jugadores/:id — Actualizar ficha personal en el Padrón
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, fecha_nacimiento, telefono, email, foto_url, es_inactivo } = req.body;

    const { rows } = await query(
      `UPDATE public.jugador
       SET nombre           = COALESCE($1, nombre),
           apellido         = COALESCE($2, apellido),
           dni              = COALESCE($3, dni),
           fecha_nacimiento = COALESCE($4, fecha_nacimiento),
           telefono         = COALESCE($5, telefono),
           email            = COALESCE($6, email),
           foto_url         = COALESCE($7, foto_url),
           es_inactivo      = COALESCE($8, es_inactivo),
           updated_at       = NOW()
       WHERE id_jugador = $9 AND activo = TRUE
       RETURNING *`,
      [
        nombre?.trim(),
        apellido?.trim(),
        dni?.trim(),
        fecha_nacimiento,
        telefono,
        email?.toLowerCase(),
        foto_url,
        es_inactivo !== undefined ? Boolean(es_inactivo) : null,
        id,
      ]
    );

    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Ficha del jugador actualizada correctamente.');
  } catch (error) {
    console.error('[jugador.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar el jugador.', 500, error.message);
  }
};

// DELETE /api/jugadores/:id (baja del padrón)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.jugador SET activo = FALSE, updated_at = NOW() WHERE id_jugador = $1 AND activo = TRUE RETURNING id_jugador`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);

    // Desactivar también de todos los planteles
    await query(`UPDATE public.equipo_jugador SET activo = FALSE WHERE id_jugador = $1`, [id]);

    return respuestaExito(res, null, 'Jugador dado de baja del padrón correctamente.');
  } catch (error) {
    console.error('[jugador.controller] eliminar error:', error);
    return respuestaError(res, 'Error al dar de baja el jugador.', 500, error.message);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  obtenerGoleadores,
  obtenerTarjetas,
  crear,
  actualizar,
  eliminar,
};
