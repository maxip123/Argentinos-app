const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/cuotas — Todas las cuotas. Filtros: ?id_jugador= ?id_division= ?estado_pago=
const obtenerTodas = async (req, res) => {
  try {
    const { id_jugador, id_division, estado_pago } = req.query;
    let sql = `
      SELECT c.*,
             CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre,
             j.dni, j.telefono,
             COALESCE(e.nombre_equipo, 'Argentinos del Norte') AS nombre_equipo,
             COALESCE(d.nombre_division, 'General') AS nombre_division
      FROM public.cuota_jugador c
      INNER JOIN public.jugador   j ON j.id_jugador   = c.id_jugador
      LEFT JOIN public.equipo     e ON e.id_equipo    = j.id_equipo
      LEFT JOIN public.division   d ON d.id_division  = c.id_division
      WHERE c.activo = TRUE AND j.es_jugador_club = TRUE`;
    
    const params = [];
    if (id_jugador) {
      params.push(id_jugador);
      sql += ` AND c.id_jugador = $${params.length}`;
    }
    if (id_division) {
      params.push(id_division);
      sql += ` AND (
        c.id_division = $${params.length} 
        OR EXISTS (
          SELECT 1 FROM public.equipo_jugador ej
          JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo
          WHERE ej.id_jugador = c.id_jugador AND eq.id_division = $${params.length} AND ej.activo = TRUE
        )
      )`;
    }
    if (estado_pago) {
      params.push(estado_pago);
      sql += ` AND c.estado_pago = $${params.length}`;
    }
    sql += ` ORDER BY c.periodo_anio DESC, c.periodo_mes DESC, j.apellido ASC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Cuotas obtenidas correctamente.');
  } catch (error) {
    console.error('[cuota.controller] obtenerTodas error:', error);
    return respuestaError(res, 'Error al obtener las cuotas.', 500, error.message);
  }
};

// GET /api/cuotas/estado-jugadores — Estado de cuota social de todos los socios del club
// Retorna: jugador + fecha_vencimiento + estado_cuota calculado + equipos donde juega
const obtenerEstadoJugadores = async (req, res) => {
  try {
    const { id_division } = req.query;
    let sql = `
      SELECT
        j.id_jugador,
        CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre,
        j.nombre,
        j.apellido,
        j.dni,
        j.telefono,
        j.foto_url,
        j.es_inactivo,
        j.fecha_ultimo_pago,
        j.fecha_vencimiento,
        CASE
          WHEN j.es_inactivo = TRUE THEN 'Inactivo'
          WHEN j.fecha_vencimiento IS NULL THEN 'Sin cuota'
          WHEN j.fecha_vencimiento >= CURRENT_DATE THEN 'Al dia'
          ELSE 'Pendiente'
        END AS estado_cuota,
        COALESCE(
          json_agg(
            json_build_object(
              'id_equipo', eq.id_equipo,
              'nombre_equipo', eq.nombre_equipo,
              'id_division', div.id_division,
              'nombre_division', div.nombre_division,
              'numero_camiseta', ej.numero_camiseta,
              'posicion', ej.posicion
            )
          ) FILTER (WHERE eq.id_equipo IS NOT NULL AND ej.activo = TRUE),
          '[]'
        ) AS equipos_asignados
      FROM public.jugador j
      LEFT JOIN public.equipo_jugador ej ON ej.id_jugador = j.id_jugador AND ej.activo = TRUE
      LEFT JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo AND eq.activo = TRUE
      LEFT JOIN public.division div ON div.id_division = eq.id_division
      WHERE j.activo = TRUE AND j.es_jugador_club = TRUE`;
    
    const params = [];
    if (id_division) {
      params.push(id_division);
      sql += ` AND (
        j.id_division = $${params.length}
        OR EXISTS (
          SELECT 1 FROM public.equipo_jugador ej2
          JOIN public.equipo eq2 ON eq2.id_equipo = ej2.id_equipo
          WHERE ej2.id_jugador = j.id_jugador AND eq2.id_division = $${params.length} AND ej2.activo = TRUE
        )
      )`;
    }
    sql += ` GROUP BY j.id_jugador ORDER BY j.apellido ASC, j.nombre ASC`;
    const { rows } = await query(sql, params);
    return respuestaExito(res, rows, 'Estado de cuotas de jugadores obtenido correctamente.');
  } catch (error) {
    console.error('[cuota.controller] obtenerEstadoJugadores error:', error);
    return respuestaError(res, 'Error al obtener el estado de cuotas.', 500, error.message);
  }
};

// GET /api/cuotas/morosos/:id_division — Jugadores con cuotas pendientes o vencidas (opcionalmente por división deportiva)
const obtenerMorosos = async (req, res) => {
  try {
    const { id_division } = req.params;
    let sql = `
      SELECT c.*,
             CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre,
             j.dni, j.telefono,
             COALESCE(e.nombre_equipo, 'Argentinos del Norte') AS nombre_equipo
      FROM public.cuota_jugador c
      INNER JOIN public.jugador j ON j.id_jugador = c.id_jugador
      LEFT JOIN public.equipo   e ON e.id_equipo  = j.id_equipo
      WHERE c.estado_pago IN ('Pendiente', 'Vencido', 'Parcial')
        AND c.activo = TRUE
        AND j.activo = TRUE`;
    
    const params = [];
    if (id_division && id_division !== 'todas') {
      params.push(id_division);
      sql += ` AND (
        c.id_division = $${params.length}
        OR EXISTS (
          SELECT 1 FROM public.equipo_jugador ej
          JOIN public.equipo eq ON eq.id_equipo = ej.id_equipo
          WHERE ej.id_jugador = j.id_jugador AND eq.id_division = $${params.length} AND ej.activo = TRUE
        )
      )`;
    }

    sql += ` ORDER BY j.apellido ASC, c.periodo_anio ASC, c.periodo_mes ASC`;
    const { rows } = await query(sql, params);
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
      `SELECT c.*, CONCAT(j.apellido, ', ', j.nombre) AS jugador_nombre, j.dni,
              COALESCE(e.nombre_equipo, 'Argentinos del Norte') AS nombre_equipo,
              COALESCE(d.nombre_division, 'Club') AS nombre_division
       FROM public.cuota_jugador c
       INNER JOIN public.jugador  j ON j.id_jugador  = c.id_jugador
       LEFT JOIN public.equipo    e ON e.id_equipo   = j.id_equipo
       LEFT JOIN public.division  d ON d.id_division = c.id_division
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

// POST /api/cuotas — Crear cuota individual de socio
const crear = async (req, res) => {
  try {
    const {
      id_jugador,
      id_division,
      periodo_mes,
      periodo_anio,
      monto_esperado,
      monto_abonado,
      fecha_vencimiento,
      fecha_pago,
      estado_pago,
      metodo_pago,
      comprobante_url,
      transaccion_id,
      observaciones,
    } = req.body;

    const { rows } = await query(
      `INSERT INTO public.cuota_jugador
         (id_jugador, id_division, periodo_mes, periodo_anio, monto_esperado, monto_abonado,
          fecha_vencimiento, fecha_pago, estado_pago, metodo_pago, comprobante_url, transaccion_id, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id_jugador,
        id_division ? Number(id_division) : null,
        periodo_mes,
        periodo_anio,
        monto_esperado,
        monto_abonado || 0,
        fecha_vencimiento,
        fecha_pago || null,
        estado_pago || 'Pendiente',
        metodo_pago || null,
        comprobante_url || null,
        transaccion_id || null,
        observaciones || null,
      ]
    );
    return respuestaExito(res, rows[0], 'Cuota creada exitosamente.', 201);
  } catch (error) {
    if (error.code === '23505') return respuestaError(res, 'Ya existe una cuota para este socio en el período indicado.', 409);
    console.error('[cuota.controller] crear error:', error);
    return respuestaError(res, 'Error al crear la cuota.', 500, error.message);
  }
};

// POST /api/cuotas/pago-rapido — Registrar pago de socio en un solo paso atómico
// La cuota es por jugador/socio. id_division es opcional.
const pagoRapido = async (req, res) => {
  try {
    const { id_jugador, id_division, monto, metodo_pago, fecha_pago, observaciones } = req.body;

    if (!id_jugador || !monto) {
      return respuestaError(res, 'El ID de socio (id_jugador) y el monto son obligatorios.', 400);
    }

    const divisionId = id_division ? Number(id_division) : null;
    const fechaBase = fecha_pago ? new Date(fecha_pago) : new Date();

    // Próximo vencimiento: fecha del pago + 31 días corridos
    const fechaVencimiento = new Date(fechaBase);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 31);

    const periodoMes = fechaBase.getMonth() + 1;
    const periodoAnio = fechaBase.getFullYear();
    const montoNum = parseFloat(monto);

    if (isNaN(montoNum) || montoNum <= 0) {
      return respuestaError(res, 'El monto abonado debe ser un número positivo.', 400);
    }

    // Ejecutar de forma atómica con transacción
    const resultado = await withTransaction(async (client) => {
      // 1. Upsert de la cuota social del socio para el período
      const { rows: cuotaRows } = await client.query(
        `INSERT INTO public.cuota_jugador
           (id_jugador, id_division, periodo_mes, periodo_anio,
            monto_esperado, monto_abonado, fecha_vencimiento, fecha_pago,
            estado_pago, metodo_pago, observaciones)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'Pagado', $8, $9)
         ON CONFLICT (id_jugador, periodo_mes, periodo_anio)
         DO UPDATE SET
           monto_abonado     = EXCLUDED.monto_abonado,
           monto_esperado    = EXCLUDED.monto_esperado,
           fecha_pago        = EXCLUDED.fecha_pago,
           fecha_vencimiento = EXCLUDED.fecha_vencimiento,
           estado_pago       = 'Pagado',
           metodo_pago       = EXCLUDED.metodo_pago,
           observaciones     = COALESCE(EXCLUDED.observaciones, public.cuota_jugador.observaciones),
           updated_at        = NOW()
         RETURNING *`,
        [id_jugador, divisionId, periodoMes, periodoAnio, montoNum, fechaVencimiento, fechaBase, metodo_pago || 'Efectivo', observaciones || null]
      );

      // 2. Actualizar ficha del socio: fecha de último pago, nuevo vencimiento y reactivarlo
      await client.query(
        `UPDATE public.jugador
         SET fecha_ultimo_pago = $1,
             fecha_vencimiento = $2,
             es_inactivo       = FALSE,
             updated_at        = NOW()
         WHERE id_jugador = $3`,
        [fechaBase, fechaVencimiento, id_jugador]
      );

      return cuotaRows[0];
    });

    return respuestaExito(
      res,
      {
        cuota: resultado,
        fecha_vencimiento: fechaVencimiento,
        periodo: `${periodoMes}/${periodoAnio}`,
      },
      `Pago registrado. Socio habilitado hasta el ${fechaVencimiento.toLocaleDateString('es-AR')}.`,
      201
    );
  } catch (error) {
    console.error('[cuota.controller] pagoRapido error:', error);
    return respuestaError(res, 'Error al registrar el pago rápido.', 500, error.message);
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

    const cuota = rows[0];

    // Si se marcó como Pagado o Exonerado/Becado, habilitar al jugador
    if ((estado_pago === 'Pagado' || estado_pago === 'Exonerado/Becado') && cuota) {
      const fechaPago = fecha_pago ? new Date(fecha_pago) : new Date();
      const fechaVenc = new Date(fechaPago);
      fechaVenc.setDate(fechaVenc.getDate() + 31);
      await query(
        `UPDATE public.jugador
         SET fecha_ultimo_pago = $1, fecha_vencimiento = $2, es_inactivo = FALSE, updated_at = NOW()
         WHERE id_jugador = $3`,
        [fechaPago, fechaVenc, cuota.id_jugador]
      );
    }

    return respuestaExito(res, cuota, 'Cuota actualizada correctamente.');
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

module.exports = {
  obtenerTodas,
  obtenerEstadoJugadores,
  obtenerMorosos,
  obtenerPorId,
  crear,
  pagoRapido,
  actualizar,
  eliminar,
};
