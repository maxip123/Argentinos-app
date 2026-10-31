const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');
const { CATEGORIA_CUOTA, calcularVencimiento } = require('../utils/cobrosCuota');

// GET /api/gastos — Movimientos de tesorería (Entradas y Gastos del club).
// Filtros opcionales: ?tipo=INGRESO|EGRESO ?categoria= ?desde= ?hasta= ?q= ?limit= ?offset= ?anulados=true
const obtenerTodos = async (req, res) => {
  try {
    const { tipo, categoria, desde, hasta, q, limit, offset, anulados } = req.query;
    const limitNum  = Math.min(parseInt(limit)  || 20, 100);
    const offsetNum = Math.max(parseInt(offset) || 0,  0);

    let sql = `SELECT g.*, u.nombre_completo AS anulado_por_nombre, COUNT(*) OVER() AS total_count
               FROM public.gasto_club g
               LEFT JOIN public.perfil_usuario u ON u.id_perfil = g.anulado_por
               WHERE g.activo = ${anulados === 'true' ? 'FALSE' : 'TRUE'}`;
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
    // Los cobros de cuotas también entran a la caja como 'Cuota Socio', pero ya se suman en el punto 1.
    const { rows: entradasRows } = await query(
      `SELECT COALESCE(SUM(monto), 0) AS total_entradas,
              COUNT(*) AS cantidad_entradas
       FROM public.gasto_club
       WHERE activo = TRUE
         AND tipo = 'INGRESO'
         AND categoria IS DISTINCT FROM $3
         AND EXTRACT(MONTH FROM fecha_gasto) = $1
         AND EXTRACT(YEAR  FROM fecha_gasto) = $2`,
      [mesTodal, anioActual, CATEGORIA_CUOTA]
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
    if (categoria === CATEGORIA_CUOTA) {
      return respuestaError(res, 'Las cuotas se registran desde el cobro al socio, no como movimiento manual.', 400);
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

    const { rows: actuales } = await query(
      `SELECT categoria FROM public.gasto_club WHERE id_gasto = $1 AND activo = TRUE`,
      [id]
    );
    if (actuales.length === 0) return respuestaError(res, 'Movimiento no encontrado.', 404);
    if (actuales[0].categoria === CATEGORIA_CUOTA || categoria === CATEGORIA_CUOTA) {
      return respuestaError(res, 'Un cobro de cuota no se edita: anulalo y registrá el cobro correcto.', 409);
    }

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

// Revierte en la cuota y en la ficha del socio el cobro que generó este movimiento
const revertirCobroCuota = async (client, movimiento) => {
  const { rows: cuotas } = await client.query(
    `SELECT * FROM public.cuota_jugador WHERE id_cuota = $1 FOR UPDATE`,
    [movimiento.id_cuota]
  );
  const cuota = cuotas[0];

  // Una cuota puede tener varios cobros en el mismo período
  const { rows: restantes } = await client.query(
    `SELECT fecha_gasto, metodo_pago FROM public.gasto_club
     WHERE id_cuota = $1 AND activo = TRUE AND id_gasto <> $2
     ORDER BY fecha_gasto DESC, id_gasto DESC`,
    [movimiento.id_cuota, movimiento.id_gasto]
  );

  if (restantes.length > 0) {
    await client.query(
      `UPDATE public.cuota_jugador
       SET monto_abonado     = GREATEST(monto_abonado - $1, 0),
           monto_esperado    = GREATEST(monto_esperado - $1, 0),
           fecha_pago        = $2,
           fecha_vencimiento = $3,
           metodo_pago       = $4,
           updated_at        = NOW()
       WHERE id_cuota = $5`,
      [movimiento.monto, restantes[0].fecha_gasto, calcularVencimiento(restantes[0].fecha_gasto), restantes[0].metodo_pago, cuota.id_cuota]
    );
  } else {
    await client.query(
      `UPDATE public.cuota_jugador
       SET activo = FALSE, monto_abonado = 0, monto_esperado = 0,
           fecha_pago = NULL, estado_pago = 'Pendiente', updated_at = NOW()
       WHERE id_cuota = $1`,
      [cuota.id_cuota]
    );
  }

  // La ficha vuelve al último pago que sigue siendo válido
  const { rows: pagos } = await client.query(
    `SELECT fecha_pago, fecha_vencimiento FROM public.cuota_jugador
     WHERE id_jugador = $1 AND activo = TRUE AND fecha_pago IS NOT NULL
       AND estado_pago IN ('Pagado', 'Exonerado/Becado')
     ORDER BY fecha_pago DESC LIMIT 1`,
    [cuota.id_jugador]
  );
  await client.query(
    `UPDATE public.jugador
     SET fecha_ultimo_pago = $1, fecha_vencimiento = $2, updated_at = NOW()
     WHERE id_jugador = $3`,
    [pagos[0]?.fecha_pago ?? null, pagos[0]?.fecha_vencimiento ?? null, cuota.id_jugador]
  );
};

// POST /api/gastos/:id/anular — Da de baja un movimiento dejando registro de quién, cuándo y por qué.
// Si es un cobro de cuota, también revierte la cuota y el vencimiento del socio.
const anular = async (req, res) => {
  try {
    const { id } = req.params;
    const motivo = String(req.body?.motivo ?? '').trim();
    if (!motivo) return respuestaError(res, 'El motivo de la anulación es obligatorio.', 400);

    const resultado = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM public.gasto_club WHERE id_gasto = $1 AND activo = TRUE FOR UPDATE`,
        [id]
      );
      if (rows.length === 0) return { codigo: 404 };

      const movimiento = rows[0];
      if (movimiento.categoria === CATEGORIA_CUOTA) {
        if (!movimiento.id_cuota) return { codigo: 409 };
        await revertirCobroCuota(client, movimiento);
      }

      await client.query(
        `UPDATE public.gasto_club
         SET activo = FALSE, motivo_anulacion = $1, anulado_por = $2, fecha_anulacion = NOW()
         WHERE id_gasto = $3`,
        [motivo, req.usuario.id, id]
      );
      return { codigo: 200, esCuota: movimiento.categoria === CATEGORIA_CUOTA };
    });

    if (resultado.codigo === 404) return respuestaError(res, 'Movimiento no encontrado.', 404);
    if (resultado.codigo === 409) {
      return respuestaError(res, 'Este cobro no está vinculado a una cuota, así que no se puede revertir automáticamente.', 409);
    }

    return respuestaExito(
      res,
      null,
      resultado.esCuota
        ? 'Cobro anulado. La cuota y el vencimiento del socio se revirtieron.'
        : 'Movimiento anulado correctamente.'
    );
  } catch (error) {
    console.error('[gasto.controller] anular error:', error);
    return respuestaError(res, 'Error al anular el movimiento.', 500, error.message);
  }
};

module.exports = { obtenerTodos, obtenerResumen, crear, actualizar, anular };
