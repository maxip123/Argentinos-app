const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/jugadores — Todos los jugadores activos. Filtros: ?id_equipo= ?id_division= ?solo_club=true
const obtenerTodos = async (req, res) => {
  try {
    const { id_equipo, id_division, solo_club } = req.query;
    let sql = `
      SELECT j.*,
             e.nombre_equipo,
             e.es_argentinos_del_norte,
             d.nombre_division
      FROM public.jugador j
      INNER JOIN public.equipo   e ON e.id_equipo   = j.id_equipo
      INNER JOIN public.division d ON d.id_division = j.id_division
      WHERE j.activo = TRUE`;
    const params = [];
    if (id_equipo) { params.push(id_equipo); sql += ` AND j.id_equipo = $${params.length}`; }
    if (id_division) { params.push(id_division); sql += ` AND j.id_division = $${params.length}`; }
    if (solo_club === 'true') sql += ` AND j.es_jugador_club = TRUE`;
    sql += ` ORDER BY j.apellido ASC, j.nombre ASC`;
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
      `SELECT j.*, e.nombre_equipo, e.es_argentinos_del_norte, d.nombre_division
       FROM public.jugador j
       INNER JOIN public.equipo   e ON e.id_equipo   = j.id_equipo
       INNER JOIN public.division d ON d.id_division = j.id_division
       WHERE j.id_jugador = $1 AND j.activo = TRUE`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Jugador obtenido correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener el jugador.', 500, error.message);
  }
};

// GET /api/jugadores/goleadores/:id_division — Top goleadores de una división
const obtenerGoleadores = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { solo_club } = req.query;
    let sql = `
      SELECT j.id_jugador, j.nombre, j.apellido, j.foto_url, j.goles_totales AS goles,
             j.es_jugador_club, e.nombre_equipo, e.es_argentinos_del_norte, d.nombre_division
      FROM public.jugador j
      INNER JOIN public.equipo   e ON e.id_equipo   = j.id_equipo
      INNER JOIN public.division d ON d.id_division = j.id_division
      WHERE j.id_division = $1 AND j.activo = TRUE AND j.goles_totales > 0`;
    const params = [id_division];
    if (solo_club === 'true') sql += ` AND j.es_jugador_club = TRUE`;
    sql += ` ORDER BY j.goles_totales DESC LIMIT 50`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Goleadores obtenidos correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerGoleadores error:', error);
    return respuestaError(res, 'Error al obtener los goleadores.', 500, error.message);
  }
};

// GET /api/jugadores/tarjetas/:id_division — Jugadores con tarjetas de una división
const obtenerTarjetas = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { solo_club } = req.query;
    let sql = `
      SELECT j.id_jugador, j.nombre, j.apellido, j.foto_url,
             j.amarillas_totales AS amarillas, j.rojas_totales AS rojas,
             j.es_jugador_club, e.nombre_equipo, e.es_argentinos_del_norte, d.nombre_division
      FROM public.jugador j
      INNER JOIN public.equipo   e ON e.id_equipo   = j.id_equipo
      INNER JOIN public.division d ON d.id_division = j.id_division
      WHERE j.id_division = $1 AND j.activo = TRUE
        AND (j.amarillas_totales > 0 OR j.rojas_totales > 0)`;
    const params = [id_division];
    if (solo_club === 'true') sql += ` AND j.es_jugador_club = TRUE`;
    sql += ` ORDER BY j.rojas_totales DESC, j.amarillas_totales DESC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Tarjetas obtenidas correctamente.');
  } catch (error) {
    console.error('[jugador.controller] obtenerTarjetas error:', error);
    return respuestaError(res, 'Error al obtener las tarjetas.', 500, error.message);
  }
};

// POST /api/jugadores
const crear = async (req, res) => {
  try {
    const { id_equipo, id_division, nombre, apellido, dni, fecha_nacimiento, telefono, email, foto_url, es_jugador_club } = req.body;
    const { rows } = await query(
      `INSERT INTO public.jugador
         (id_equipo, id_division, nombre, apellido, dni, fecha_nacimiento, telefono, email, foto_url, es_jugador_club)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id_equipo, id_division, nombre.trim(), apellido.trim(), dni.trim(), fecha_nacimiento || null, telefono || null, email?.toLowerCase() || null, foto_url || null, es_jugador_club ?? true]
    );
    return respuestaExito(res, rows[0], 'Jugador creado exitosamente.', 201);
  } catch (error) {
    if (error.code === '23505') return respuestaError(res, 'Ya existe un jugador con ese DNI en esta división.', 409);
    console.error('[jugador.controller] crear error:', error);
    return respuestaError(res, 'Error al crear el jugador.', 500, error.message);
  }
};

// PUT /api/jugadores/:id
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_equipo, id_division, nombre, apellido, dni, fecha_nacimiento, telefono, email, foto_url, es_jugador_club } = req.body;
    const { rows } = await query(
      `UPDATE public.jugador
       SET id_equipo        = COALESCE($1,  id_equipo),
           id_division      = COALESCE($2,  id_division),
           nombre           = COALESCE($3,  nombre),
           apellido         = COALESCE($4,  apellido),
           dni              = COALESCE($5,  dni),
           fecha_nacimiento = COALESCE($6,  fecha_nacimiento),
           telefono         = COALESCE($7,  telefono),
           email            = COALESCE($8,  email),
           foto_url         = COALESCE($9,  foto_url),
           es_jugador_club  = COALESCE($10, es_jugador_club),
           updated_at       = NOW()
       WHERE id_jugador = $11 AND activo = TRUE
       RETURNING *`,
      [id_equipo, id_division, nombre?.trim(), apellido?.trim(), dni?.trim(), fecha_nacimiento, telefono, email?.toLowerCase(), foto_url, es_jugador_club, id]
    );
    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Jugador actualizado correctamente.');
  } catch (error) {
    console.error('[jugador.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar el jugador.', 500, error.message);
  }
};

// DELETE /api/jugadores/:id (soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.jugador SET activo = FALSE, updated_at = NOW() WHERE id_jugador = $1 AND activo = TRUE RETURNING id_jugador`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
    return respuestaExito(res, null, 'Jugador eliminado correctamente.');
  } catch (error) {
    console.error('[jugador.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar el jugador.', 500, error.message);
  }
};

module.exports = { obtenerTodos, obtenerPorId, obtenerGoleadores, obtenerTarjetas, crear, actualizar, eliminar };
