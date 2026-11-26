const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');
const { anularPago } = require('./cobro.controller');
const { exprDeuda } = require('../utils/deudas');

// Categoría de los cobros de cuota del modelo anterior (movimientos viejos de la demo)
const CATEGORIA_CUOTA_ANTERIOR = 'Cuota Socio';

// Los cobros a jugadores entran a la caja solo desde Cobros, vinculados a su pago: una categoría con el nombre de
// un concepto (o la de cuotas anterior) no se carga ni se edita a mano.
const esCategoriaDeCobro = async (categoria) => {
  if (!categoria) return false;
  if (categoria === CATEGORIA_CUOTA_ANTERIOR) return true;
  const { rows } = await query(`SELECT 1 FROM public.concepto_cobro WHERE lower(nombre) = lower($1)`, [categoria]);
  return rows.length > 0;
};

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

// GET /api/gastos/resumen — Ingresos vs egresos del mes, con desglose por categoría y la deuda de los jugadores.
// Todos los cobros a jugadores ya están en la caja (un INGRESO por pago, con id_pago), así que no se suman aparte.
const obtenerResumen = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const mesSel = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anioSel = anio ? parseInt(anio) : new Date().getFullYear();
    const delMes = `activo = TRUE AND EXTRACT(MONTH FROM fecha_gasto) = $1 AND EXTRACT(YEAR FROM fecha_gasto) = $2`;

    const [{ rows: [totales] }, { rows: categoriasRows }, { rows: [deudas] }] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(monto) FILTER (WHERE tipo = 'INGRESO'), 0) AS total_ingresos,
                COUNT(*) FILTER (WHERE tipo = 'INGRESO') AS cantidad_ingresos,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'INGRESO' AND id_pago IS NOT NULL), 0) AS total_cobros,
                COUNT(*) FILTER (WHERE tipo = 'INGRESO' AND id_pago IS NOT NULL) AS cantidad_cobros,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'EGRESO'), 0) AS total_gastos,
                COUNT(*) FILTER (WHERE tipo = 'EGRESO') AS cantidad_gastos
         FROM public.gasto_club WHERE ${delMes}`,
        [mesSel, anioSel]
      ),
      query(
        `SELECT tipo, categoria, COALESCE(SUM(monto), 0) AS subtotal, COUNT(*) AS cantidad
         FROM public.gasto_club WHERE ${delMes}
         GROUP BY tipo, categoria ORDER BY subtotal DESC`,
        [mesSel, anioSel]
      ),
      // Deuda de hoy (no del mes elegido): lo que los jugadores deben en este momento
      query(
        `SELECT COALESCE(SUM(d.total), 0) AS pendiente, COALESCE(SUM(d.vencida), 0) AS vencida,
                COUNT(*) FILTER (WHERE d.vencida > 0) AS jugadores_con_deuda_vencida
         FROM (SELECT ${exprDeuda('j')} AS total, ${exprDeuda('j', true)} AS vencida
               FROM public.jugador j WHERE j.activo) d`
      ),
    ]);

    const totalIngresos = parseFloat(totales.total_ingresos);
    const totalCobros = parseFloat(totales.total_cobros);
    const totalGastos = parseFloat(totales.total_gastos);

    return respuestaExito(res, {
      periodo: { mes: mesSel, anio: anioSel },
      ingresos: {
        total_ingresos: totalIngresos,
        cantidad_ingresos: parseInt(totales.cantidad_ingresos),
        total_cobros: totalCobros,
        cantidad_cobros: parseInt(totales.cantidad_cobros),
        total_otros: totalIngresos - totalCobros,
      },
      egresos: {
        total_gastos: totalGastos,
        cantidad_gastos: parseInt(totales.cantidad_gastos),
      },
      balance: totalIngresos - totalGastos,
      categorias: categoriasRows,
      deudas: {
        pendiente: parseFloat(deudas.pendiente),
        vencida: parseFloat(deudas.vencida),
        jugadores_con_deuda_vencida: parseInt(deudas.jugadores_con_deuda_vencida),
      },
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
    if (await esCategoriaDeCobro(categoria)) {
      return respuestaError(res, 'Los cobros a jugadores se registran desde Cobros, no como movimiento manual.', 400);
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
      `SELECT categoria, id_pago, id_cuota FROM public.gasto_club WHERE id_gasto = $1 AND activo = TRUE`,
      [id]
    );
    if (actuales.length === 0) return respuestaError(res, 'Movimiento no encontrado.', 404);
    const actual = actuales[0];
    if (actual.id_pago || actual.id_cuota || (await esCategoriaDeCobro(actual.categoria)) || (await esCategoriaDeCobro(categoria))) {
      return respuestaError(res, 'Un cobro a un jugador no se edita: anulalo y registrá el cobro correcto desde Cobros.', 409);
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

// POST /api/gastos/:id/anular — Da de baja un movimiento dejando registro de quién, cuándo y por qué.
// Si es el cobro de una deuda, anula también el pago: la deuda del jugador vuelve a tener saldo.
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

      if (movimiento.id_pago) {
        // anularPago da de baja el pago y este mismo movimiento, con el mismo motivo
        await anularPago(client, movimiento.id_pago, motivo, req.usuario.id);
        return { codigo: 200, esCobro: true };
      }

      await client.query(
        `UPDATE public.gasto_club
         SET activo = FALSE, motivo_anulacion = $1, anulado_por = $2, fecha_anulacion = NOW()
         WHERE id_gasto = $3`,
        [motivo, req.usuario.id, id]
      );
      return { codigo: 200, esCobro: false };
    });

    if (resultado.codigo === 404) return respuestaError(res, 'Movimiento no encontrado.', 404);
    return respuestaExito(
      res,
      null,
      resultado.esCobro
        ? 'Cobro anulado. La deuda del jugador vuelve a tener saldo.'
        : 'Movimiento anulado correctamente.'
    );
  } catch (error) {
    console.error('[gasto.controller] anular error:', error);
    return respuestaError(res, 'Error al anular el movimiento.', 500, error.message);
  }
};

module.exports = { obtenerTodos, obtenerResumen, crear, actualizar, anular };
