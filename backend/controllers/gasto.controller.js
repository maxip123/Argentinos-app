const { query } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');

// GET /api/gastos — Movimientos de tesorería (Entradas y Gastos del club).
// Filtros opcionales: ?tipo=INGRESO|EGRESO ?categoria= ?desde= ?hasta= ?q= ?limit= ?offset=
const obtenerTodos = async (req, res) => {
  try {
    const { tipo, categoria, desde, hasta, q, limit, offset } = req.query;
    const limitNum  = Math.min(parseInt(limit)  || 20, 100);
    const offsetNum = Math.max(parseInt(offset) || 0,  0);

    let sql = `SELECT *, COUNT(*) OVER() AS total_count FROM public.gasto_club WHERE activo = TRUE`;
    const params = [];

    if (tipo) {
      params.push(tipo.toUpperCase());
      sql += ` AND tipo = $${params.length}`;
    }
    if (categoria) {
      params.push(categoria);
      sql += ` AND categoria = $${params.length}`;
    }
    if (desde) {
      params.push(desde);
      sql += ` AND fecha_gasto >= $${params.length}`;
    }
    if (hasta) {
      params.push(hasta);
      sql += ` AND fecha_gasto <= $${params.length}`;
    }
    if (q) {
      params.push(`%${q.trim()}%`);
      sql += ` AND concepto ILIKE $${params.length}`;
    }

    sql += ` ORDER BY fecha_gasto DESC, id_gasto DESC`;
    params.push(limitNum, offsetNum);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const movimientos = rows.map(({ total_count, ...rest }) => rest);

    return respuestaExito(res, { movimientos, total, limit: limitNum, offset: offsetNum }, 'Movimientos financieros obtenidos correctamente.');
  } catch (error) {
    console.error('[gasto.controller] obtenerTodos error:', error);
    return respuestaError(res, 'Error al obtener los movimientos.', 500, error.message);
  }
};

// GET /api/gastos/resumen — Resumen integral: Cuotas + Entradas vs Gastos
const obtenerResumen = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const mesTodal = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anioActual = anio ? parseInt(anio) : new Date().getFullYear();

    // 1. Total cobrado de cuotas de jugadores en el período
    const { rows: cuotasRows } = await query(
      `SELECT COALESCE(SUM(monto_abonado), 0) AS total_cuotas,
              COUNT(*) FILTER (WHERE estado_pago = 'Pagado') AS cuotas_pagadas,
              COUNT(*) FILTER (WHERE estado_pago IN ('Pendiente', 'Vencido')) AS cuotas_pendientes
       FROM public.cuota_jugador
       WHERE activo = TRUE
         AND periodo_mes = $1
         AND periodo_anio = $2`,
      [mesTodal, anioActual]
    );

    // 2. Total de Entradas / Ingresos adicionales del club (entradas a partidos, sponsors, buffet, indumentaria, etc.)
    const { rows: entradasRows } = await query(
      `SELECT COALESCE(SUM(monto), 0) AS total_entradas,
              COUNT(*) AS cantidad_entradas
       FROM public.gasto_club
       WHERE activo = TRUE
         AND tipo = 'INGRESO'
         AND EXTRACT(MONTH FROM fecha_gasto) = $1
         AND EXTRACT(YEAR  FROM fecha_gasto) = $2`,
      [mesTodal, anioActual]
    );

    // 3. Total de Gastos / Egresos del club
    const { rows: egresosRows } = await query(
      `SELECT COALESCE(SUM(monto), 0) AS total_gastos,
              COUNT(*) AS cantidad_gastos
       FROM public.gasto_club
       WHERE activo = TRUE
         AND tipo = 'EGRESO'
         AND EXTRACT(MONTH FROM fecha_gasto) = $1
         AND EXTRACT(YEAR  FROM fecha_gasto) = $2`,
      [mesTodal, anioActual]
    );

    // 4. Desglose por categorías en el mes
    const { rows: categoriasRows } = await query(
      `SELECT tipo, categoria, COALESCE(SUM(monto), 0) AS subtotal, COUNT(*) as cantidad
       FROM public.gasto_club
       WHERE activo = TRUE
         AND EXTRACT(MONTH FROM fecha_gasto) = $1
         AND EXTRACT(YEAR  FROM fecha_gasto) = $2
       GROUP BY tipo, categoria
       ORDER BY subtotal DESC`,
      [mesTodal, anioActual]
    );

    const totalCuotas   = parseFloat(cuotasRows[0].total_cuotas || 0);
    const totalEntradas = parseFloat(entradasRows[0].total_entradas || 0);
    const totalIngresos = totalCuotas + totalEntradas;
    const totalGastos   = parseFloat(egresosRows[0].total_gastos || 0);

    return respuestaExito(res, {
      periodo: { mes: mesTodal, anio: anioActual },
      ingresos: {
        total_cuotas: totalCuotas,
        cuotas_pagadas: parseInt(cuotasRows[0].cuotas_pagadas || 0),
        cuotas_pendientes: parseInt(cuotasRows[0].cuotas_pendientes || 0),
        total_entradas: totalEntradas,
        cantidad_entradas: parseInt(entradasRows[0].cantidad_entradas || 0),
        total_ingresos: totalIngresos,
      },
      egresos: {
        total_gastos: totalGastos,
        cantidad_gastos: parseInt(egresosRows[0].cantidad_gastos || 0),
      },
      balance: totalIngresos - totalGastos,
      categorias: categoriasRows,
    }, 'Resumen financiero obtenido correctamente.');
  } catch (error) {
    console.error('[gasto.controller] obtenerResumen error:', error);
    return respuestaError(res, 'Error al obtener el resumen.', 500, error.message);
  }
};

// POST /api/gastos — Crear un movimiento (INGRESO o EGRESO)
const crear = async (req, res) => {
  try {
    const { concepto, monto, fecha_gasto, categoria, tipo, metodo_pago, comprobante_url } = req.body;
    if (!concepto || !monto) {
      return respuestaError(res, 'Concepto y monto son requeridos.', 400);
    }

    const tipoNormalizado = (tipo && tipo.toUpperCase() === 'INGRESO') ? 'INGRESO' : 'EGRESO';
    const categoriaDefecto = tipoNormalizado === 'INGRESO' ? 'Entradas Partido' : 'General';

    const { rows } = await query(
      `INSERT INTO public.gasto_club (concepto, monto, fecha_gasto, categoria, tipo, metodo_pago, comprobante_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        concepto.trim(),
        parseFloat(monto),
        fecha_gasto ? new Date(fecha_gasto) : new Date(),
        categoria || categoriaDefecto,
        tipoNormalizado,
        metodo_pago || 'Efectivo',
        comprobante_url || null,
      ]
    );

    const accionMsg = tipoNormalizado === 'INGRESO' ? 'Entrada del club registrada' : 'Gasto registrado';
    return respuestaExito(res, rows[0], `${accionMsg} exitosamente.`, 201);
  } catch (error) {
    console.error('[gasto.controller] crear error:', error);
    return respuestaError(res, 'Error al registrar el movimiento financiero.', 500, error.message);
  }
};

// PUT /api/gastos/:id — Actualizar un movimiento
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { concepto, monto, fecha_gasto, categoria, tipo, metodo_pago, comprobante_url } = req.body;

    const tipoNormalizado = tipo ? (tipo.toUpperCase() === 'INGRESO' ? 'INGRESO' : 'EGRESO') : null;

    const { rows } = await query(
      `UPDATE public.gasto_club
       SET concepto        = COALESCE($1, concepto),
           monto           = COALESCE($2, monto),
           fecha_gasto     = COALESCE($3, fecha_gasto),
           categoria       = COALESCE($4, categoria),
           tipo            = COALESCE($5, tipo),
           metodo_pago     = COALESCE($6, metodo_pago),
           comprobante_url = COALESCE($7, comprobante_url)
       WHERE id_gasto = $8 AND activo = TRUE
       RETURNING *`,
      [
        concepto?.trim(),
        monto ? parseFloat(monto) : null,
        fecha_gasto ? new Date(fecha_gasto) : null,
        categoria,
        tipoNormalizado,
        metodo_pago,
        comprobante_url,
        id,
      ]
    );

    if (rows.length === 0) return respuestaError(res, 'Movimiento no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Movimiento actualizado correctamente.');
  } catch (error) {
    console.error('[gasto.controller] actualizar error:', error);
    return respuestaError(res, 'Error al actualizar el movimiento.', 500, error.message);
  }
};

// DELETE /api/gastos/:id (soft delete)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE public.gasto_club SET activo = FALSE WHERE id_gasto = $1 AND activo = TRUE RETURNING id_gasto`,
      [id]
    );
    if (rows.length === 0) return respuestaError(res, 'Movimiento no encontrado.', 404);
    return respuestaExito(res, null, 'Movimiento eliminado correctamente.');
  } catch (error) {
    console.error('[gasto.controller] eliminar error:', error);
    return respuestaError(res, 'Error al eliminar el movimiento.', 500, error.message);
  }
};

module.exports = { obtenerTodos, obtenerResumen, crear, actualizar, eliminar };
