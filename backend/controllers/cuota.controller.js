const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/cuotas — Todas las cuotas. Filtros: ?id_jugador= ?id_division= ?estado_pago=
const obtenerTodas = async (req, res) => {
  try {
    const { id_jugador, id_division, estado_pago } = req.query;
    let sql = `
      SELECT c.*,
             CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre,
             j.dni, j.telefono,
             e.nombre_equipo,
             d.nombre_division
      FROM public.cuota_jugador c
      INNER JOIN public.jugador   j ON j.id_jugador   = c.id_jugador
      INNER JOIN public.equipo    e ON e.id_equipo    = j.id_equipo
      INNER JOIN public.division  d ON d.id_division  = c.id_division
      WHERE c.activo = TRUE AND j.es_jugador_club = TRUE`;
    const params = [];
    if (id_jugador)   { params.push(id_jugador);  sql += ` AND c.id_jugador  = $${params.length}`; }
    if (id_division)  { params.push(id_division); sql += ` AND c.id_division = $${params.length}`; }
    if (estado_pago)  { params.push(estado_pago); sql += ` AND c.estado_pago = $${params.length}`; }
    sql += ` ORDER BY c.periodo_anio DESC, c.periodo_mes DESC, j.apellido ASC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Cuotas obtenidas correctamente.');
  } catch (error) {
    console.error('[cuota.controller] obtenerTodas error:', error);
    return respuestaError(res, 'Error al obtener las cuotas.', 500, error.message);
  }
};

// GET /api/cuotas/morosos/:id_division — Jugadores con cuotas pendientes o vencidas
const obtenerMorosos = async (req, res) => {
  try {
    const { id_division } = req.params;
    const { rows } = await query(
      `SELECT c.*, CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre, j.dni, j.telefono, e.nombre_equipo
       FROM public.cuota_jugador c
       INNER JOIN public.jugador  j ON j.id_jugador  = c.id_jugador
       INNER JOIN public.equipo   e ON e.id_equipo   = j.id_equipo
       WHERE c.id_division = $1 AND c.estado_pago IN ('Pendiente', 'Vencido', 'Parcial') AND c.activo = TRUE
       ORDER BY j.apellido ASC, c.periodo_anio ASC, c.periodo_mes ASC`,
      [id_division]
    );
    return respuestaExito(res, rows, 'Morosos obtenidos correctamente.');
  } catch (error) {
    console.error('[cuota.controller] obtenerMorosos error:', error);
    return respuestaError(res, 'Error al obtener morosos.', 500, error.message);
  }
};

// GET /api/cuotas/:id
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT c.*, CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre, j.dni, e.nombre_equipo, d.nombre_division
       FROM public.cuota_jugador c
       INNER JOIN public.jugador  j ON j.id_jugador  = c.id_jugador
       INNER JOIN public.equipo   e ON e.id_equipo   = j.id_equipo
       INNER JOIN public.division d ON d.id_division = c.id_division
       WHERE c.id_cuota = $1 AND c.activo = TRUE`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Cuota no encontrada.', 404);
    return respuestaExito(res, rows[0], 'Cuota obtenida correctamente.');
  } catch (error) {
    console.error('[cuota.controller] obtenerPorId error:', error);
    return respuestaError(res, 'Error al obtener la cuota.', 500, error.message);
  }
};

// POST /api/cuotas
const crear = async (req, res) => {
  try {
    const { id_jugador, id_division, periodo_mes, periodo_anio, monto_esperado, monto_abonado, fecha_vencimiento, fecha_pago, estado_pago, metodo_pago, comprobante_url, transaccion_id, observaciones } = req.body;
    const { rows } = await query(
      `INSERT INTO public.cuota_jugador
         (id_jugador, id_division, periodo_mes, periodo_anio, monto_esperado, monto_abonado,
          fecha_vencimiento, fecha_pago, estado_pago, metodo_pago, comprobante_url, transaccion_id, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [id_jugador, id_division, periodo_mes, periodo_anio, monto_esperado, monto_abonado || 0, fecha_vencimiento, fecha_pago || null, estado_pago || 'Pendiente', metodo_pago || null, comprobante_url || null, transaccion_id || null, observaciones || null]
    );
    return respuestaExito(res, rows[0], 'Cuota creada exitosamente.', 201);
  } catch (error) {
    if (error.code === '23505') return respuestaError(res, 'Ya existe una cuota para este jugador en el período indicado.', 409);
    console.error('[cuota.controller] crear error:', error);
    return respuestaError(res, 'Error al crear la cuota.', 500, error.message);
  }
};

// PUT /api/cuotas/:id — Actualizar pago o estado
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto_abonado, fecha_pago, estado_pago, metodo_pago, comprobante_url, transaccion_id, observaciones, monto_esperado } = req.body;
    const { rows } = await query(
      `UPDATE public.cuota_jugador
       SET monto_esperado   = COALESCE($1,  monto_esperado),
           monto_abonado    = COALESCE($2,  monto_abonado),
           fecha_pago       = COALESCE($3,  fecha_pago),
           estado_pago      = COALESCE($4,  estado_pago),
           metodo_pago      = COALESCE($5,  metodo_pago),
           comprobante_url  = COALESCE($6,  comprobante_url),
           transaccion_id   = COALESCE($7,  transaccion_id),
           observaciones    = COALESCE($8,  observaciones),
           updated_at       = NOW()
       WHERE id_cuota = $9 AND activo = TRUE
       RETURNING *`,
      [monto_esperado, monto_abonado, fecha_pago, estado_pago, metodo_pago, comprobante_url, transaccion_id, observaciones, id]
    );
    if (rows.length === 0) return respuestaError(res, 'Cuota no encontrada.', 404);
    return respuestaExito(res, rows[0], 'Cuota actualizada correctamente.');
  } catch (error) {
    console.error('[cuota.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar la cuota.', 500, error.message);
  }
};

// DELETE /api/cuotas/:id (soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.cuota_jugador SET activo = FALSE, updated_at = NOW() WHERE id_cuota = $1 AND activo = TRUE RETURNING id_cuota`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Cuota no encontrada.', 404);
    return respuestaExito(res, null, 'Cuota eliminada correctamente.');
  } catch (error) {
    console.error('[cuota.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar la cuota.', 500, error.message);
  }
};

module.exports = { obtenerTodas, obtenerMorosos, obtenerPorId, crear, actualizar, eliminar };
