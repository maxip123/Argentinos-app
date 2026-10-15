const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/cuerpo-tecnico — Padrón general de cuerpo técnico del club
const obtenerTodos = async (req, res) => {
  try {
    const { q, id_equipo } = req.query;

    let sql = `
      SELECT ct.id_cuerpo_tecnico,
             ct.nombre,
             ct.apellido,
             ct.dni,
             ct.telefono,
             ct.email,
             ct.rol_principal,
             ct.es_club,
             ct.activo,
             ct.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id_equipo', eq.id_equipo,
                   'nombre_equipo', eq.nombre_equipo,
                   'rol_en_equipo', ect.rol_en_equipo
                 )
               ) FILTER (WHERE eq.id_equipo IS NOT NULL AND ect.activo = TRUE),
               '[]'
             ) AS equipos_asignados
      FROM public.cuerpo_tecnico ct
      LEFT JOIN public.equipo_cuerpo_tecnico ect ON ect.id_cuerpo_tecnico = ct.id_cuerpo_tecnico AND ect.activo = TRUE
      LEFT JOIN public.equipo eq ON eq.id_equipo = ect.id_equipo AND eq.activo = TRUE
      WHERE ct.activo = TRUE
    `;
    const params = [];

    if (id_equipo) {
      params.push(id_equipo);
      sql += ` AND EXISTS (
        SELECT 1 FROM public.equipo_cuerpo_tecnico ect2
        WHERE ect2.id_cuerpo_tecnico = ct.id_cuerpo_tecnico AND ect2.id_equipo = $${params.length} AND ect2.activo = TRUE
      )`;
    }

    if (q) {
      params.push(`%${q.trim()}%`);
      sql += ` AND (ct.nombre ILIKE $${params.length} OR ct.apellido ILIKE $${params.length} OR ct.dni ILIKE $${params.length})`;
    }

    sql += ` GROUP BY ct.id_cuerpo_tecnico ORDER BY ct.apellido ASC, ct.nombre ASC`;

    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Cuerpo técnico obtenido correctamente.');
  } catch (error) {
    console.error('[cuerpoTecnico.controller] obtenerTodos error:', error);
    return respuestaError(res, 'Error al obtener el cuerpo técnico.', 500, error.message);
  }
};

// GET /api/cuerpo-tecnico/:id
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT * FROM public.cuerpo_tecnico WHERE id_cuerpo_tecnico = $1 AND activo = TRUE`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Integrante de cuerpo técnico no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Integrante obtenido correctamente.');
  } catch (error) {
    console.error('[cuerpoTecnico.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener el integrante.', 500, error.message);
  }
};

// POST /api/cuerpo-tecnico — Crear en el padrón de cuerpo técnico
const crear = async (req, res) => {
  try {
    const { nombre, apellido, dni, telefono, email, rol_principal, id_equipo, rol_en_equipo } = req.body;
    if (!nombre || !apellido) {
      return respuestaError(res, 'Nombre y apellido son obligatorios.', 400);
    }

    const { rows } = await query(
      `INSERT INTO public.cuerpo_tecnico (nombre, apellido, dni, telefono, email, rol_principal, es_club)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [
        nombre.trim(),
        apellido.trim(),
        dni?.trim() || null,
        telefono?.trim() || null,
        email?.toLowerCase() || null,
        rol_principal || 'Director Técnico',
      ]
    );

    const nuevoIntegrante = rows[0];

    // Si se especificó equipo al crear, asignarlo
    if (id_equipo) {
      await query(
        `INSERT INTO public.equipo_cuerpo_tecnico (id_equipo, id_cuerpo_tecnico, rol_en_equipo, activo)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (id_equipo, id_cuerpo_tecnico) DO UPDATE SET activo = TRUE, rol_en_equipo = $3`,
        [id_equipo, nuevoIntegrante.id_cuerpo_tecnico, rol_en_equipo || rol_principal || 'Director Técnico']
      );
    }

    return respuestaExito(res, nuevoIntegrante, 'Integrante de cuerpo técnico registrado exitosamente.', 201);
  } catch (error) {
    console.error('[cuerpoTecnico.controller] crear error:', error);
    return respuestaError(res, 'Error al registrar integrante de cuerpo técnico.', 500, error.message);
  }
};

// PUT /api/cuerpo-tecnico/:id
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, telefono, email, rol_principal } = req.body;

    const { rows } = await query(
      `UPDATE public.cuerpo_tecnico
       SET nombre        = COALESCE($1, nombre),
           apellido      = COALESCE($2, apellido),
           dni           = COALESCE($3, dni),
           telefono      = COALESCE($4, telefono),
           email         = COALESCE($5, email),
           rol_principal = COALESCE($6, rol_principal),
           updated_at    = NOW()
       WHERE id_cuerpo_tecnico = $7 AND activo = TRUE
       RETURNING *`,
      [nombre?.trim(), apellido?.trim(), dni?.trim(), telefono, email?.toLowerCase(), rol_principal, id]
    );

    if (rows.length === 0) return respuestaError(res, 'Integrante no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Integrante de cuerpo técnico actualizado correctamente.');
  } catch (error) {
    console.error('[cuerpoTecnico.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar integrante.', 500, error.message);
  }
};

// DELETE /api/cuerpo-tecnico/:id
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.cuerpo_tecnico SET activo = FALSE, updated_at = NOW() WHERE id_cuerpo_tecnico = $1 AND activo = TRUE RETURNING id_cuerpo_tecnico`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Integrante no encontrado.', 404);

    await query(`UPDATE public.equipo_cuerpo_tecnico SET activo = FALSE WHERE id_cuerpo_tecnico = $1`, [id]);
    return respuestaExito(res, null, 'Integrante dado de baja correctamente.');
  } catch (error) {
    console.error('[cuerpoTecnico.controller] eliminar error:', error);
    return respuestaError(res, 'Error al dar de baja el integrante.', 500, error.message);
  }
};

// GET /api/cuerpo-tecnico/equipo/:id_equipo — Listar cuerpo técnico de un equipo específico
const obtenerPorEquipo = async (req, res) => {
  try {
    const { id_equipo } = req.params;
    const { rows } = await query(
      `SELECT ect.id_equipo_cuerpo_tecnico,
              ect.id_equipo,
              ect.id_cuerpo_tecnico,
              ect.rol_en_equipo,
              ect.fecha_alta,
              ct.nombre,
              ct.apellido,
              ct.dni,
              ct.telefono,
              ct.email
       FROM public.equipo_cuerpo_tecnico ect
       INNER JOIN public.cuerpo_tecnico ct ON ct.id_cuerpo_tecnico = ect.id_cuerpo_tecnico
       WHERE ect.id_equipo = $1 AND ect.activo = TRUE AND ct.activo = TRUE
       ORDER BY ct.apellido ASC`,
      [id_equipo]
    );
    return respuestaExito(res, rows, 'Cuerpo técnico del equipo obtenido correctamente.');
  } catch (error) {
    console.error('[cuerpoTecnico.controller] obtenerPorEquipo error:', error);
    return respuestaError(res, 'Error al obtener cuerpo técnico del equipo.', 500, error.message);
  }
};

// POST /api/cuerpo-tecnico/equipo/:id_equipo — Asignar integrante al equipo
const asignarAEquipo = async (req, res) => {
  try {
    const { id_equipo } = req.params;
    const { id_cuerpo_tecnico, rol_en_equipo } = req.body;

    if (!id_cuerpo_tecnico) {
      return respuestaError(res, 'id_cuerpo_tecnico es requerido.', 400);
    }

    const { rows } = await query(
      `INSERT INTO public.equipo_cuerpo_tecnico (id_equipo, id_cuerpo_tecnico, rol_en_equipo, activo)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (id_equipo, id_cuerpo_tecnico) DO UPDATE
       SET activo = TRUE, rol_en_equipo = COALESCE(EXCLUDED.rol_en_equipo, public.equipo_cuerpo_tecnico.rol_en_equipo)
       RETURNING *`,
      [id_equipo, id_cuerpo_tecnico, rol_en_equipo || 'Director Técnico']
    );

    return respuestaExito(res, rows[0], 'Integrante asignado al cuerpo técnico del equipo.', 201);
  } catch (error) {
    console.error('[cuerpoTecnico.controller] asignarAEquipo error:', error);
    return respuestaError(res, 'Error al asignar integrante al equipo.', 500, error.message);
  }
};

// DELETE /api/cuerpo-tecnico/equipo/:id_equipo/:id_cuerpo_tecnico — Desasignar del equipo
const desasignarDeEquipo = async (req, res) => {
  try {
    const { id_equipo, id_cuerpo_tecnico } = req.params;
    const { rows } = await query(
      `UPDATE public.equipo_cuerpo_tecnico SET activo = FALSE
       WHERE id_equipo = $1 AND id_cuerpo_tecnico = $2 AND activo = TRUE
       RETURNING id_equipo_cuerpo_tecnico`,
      [id_equipo, id_cuerpo_tecnico]
    );
    if (rows.length === 0) return respuestaError(res, 'Asignación no encontrada.', 404);
    return respuestaExito(res, null, 'Integrante removido del cuerpo técnico del equipo.');
  } catch (error) {
    console.error('[cuerpoTecnico.controller] desasignarDeEquipo error:', error);
    return respuestaError(res, 'Error al desasignar integrante.', 500, error.message);
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerPorEquipo,
  asignarAEquipo,
  desasignarDeEquipo,
};
