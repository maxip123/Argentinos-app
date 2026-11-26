const { query, withTransaction } = require('../config/db');
const { respuestaExito, respuestaError } = require('../utils/respuesta');
const { HOY_AR, SQL_CARGOS_CON_SALDO, sqlDeudaJugador, etiquetaPeriodo } = require('../utils/deudas');

// Comparar montos en centavos evita errores de punto flotante (20000.5 - 10000 ...)
const centavos = (v) => Math.round(Number(v) * 100);

// Orden del estado de cuenta: primero lo que hay que cobrar
const ORDEN_ESTADO = `CASE s.estado WHEN 'Vencida' THEN 0 WHEN 'Parcial' THEN 1 WHEN 'Pendiente' THEN 2
                      WHEN 'Pagada' THEN 3 ELSE 4 END`;

/* ─── Conceptos ──────────────────────────────────────────────────────────────── */

// GET /api/cobros/conceptos — Todos, activos primero (la carga de deudas usa solo los activos)
const listarConceptos = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM public.concepto_cobro ORDER BY activo DESC, es_mensual DESC, nombre ASC`
    );
    return respuestaExito(res, rows, 'Conceptos obtenidos correctamente.');
  } catch (error) {
    console.error('[cobro.controller] listarConceptos error:', error);
    return respuestaError(res, 'Error al obtener los conceptos.', 500, error.message);
  }
};

const nombreRepetido = async (nombre, idExcluir = null) => {
  const { rows } = await query(
    `SELECT 1 FROM public.concepto_cobro WHERE lower(nombre) = lower($1) AND ($2::bigint IS NULL OR id_concepto <> $2)`,
    [nombre, idExcluir]
  );
  return rows.length > 0;
};

// POST /api/cobros/conceptos
const crearConcepto = async (req, res) => {
  try {
    const nombre = String(req.body.nombre).trim();
    if (await nombreRepetido(nombre)) return respuestaError(res, 'Ya existe un concepto con ese nombre.', 409);
    const { rows } = await query(
      `INSERT INTO public.concepto_cobro (nombre, monto_sugerido, es_mensual) VALUES ($1, $2, $3) RETURNING *`,
      [nombre, req.body.monto_sugerido ? Number(req.body.monto_sugerido) : null, Boolean(req.body.es_mensual)]
    );
    return respuestaExito(res, rows[0], 'Concepto creado.', 201);
  } catch (error) {
    if (error.code === '23505') return respuestaError(res, 'Ya existe un concepto con ese nombre.', 409);
    console.error('[cobro.controller] crearConcepto error:', error);
    return respuestaError(res, 'Error al crear el concepto.', 500, error.message);
  }
};

// PUT /api/cobros/conceptos/:id — nombre, monto sugerido (null lo borra) y activo. No cambia si es mensual:
// eso define cómo se identifican sus deudas.
const actualizarConcepto = async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = req.body.nombre !== undefined ? String(req.body.nombre).trim() : null;
    if (nombre && (await nombreRepetido(nombre, id))) return respuestaError(res, 'Ya existe un concepto con ese nombre.', 409);
    const cambiaMonto = Object.prototype.hasOwnProperty.call(req.body, 'monto_sugerido');
    const { rows } = await query(
      `UPDATE public.concepto_cobro
       SET nombre = COALESCE($1, nombre),
           monto_sugerido = CASE WHEN $2 THEN $3::numeric ELSE monto_sugerido END,
           activo = COALESCE($4, activo)
       WHERE id_concepto = $5 RETURNING *`,
      [nombre, cambiaMonto, req.body.monto_sugerido ? Number(req.body.monto_sugerido) : null,
        req.body.activo === undefined ? null : Boolean(req.body.activo), id]
    );
    if (rows.length === 0) return respuestaError(res, 'Concepto no encontrado.', 404);
    return respuestaExito(res, rows[0], 'Concepto actualizado.');
  } catch (error) {
    if (error.code === '23505') return respuestaError(res, 'Ya existe un concepto con ese nombre.', 409);
    console.error('[cobro.controller] actualizarConcepto error:', error);
    return respuestaError(res, 'Error al actualizar el concepto.', 500, error.message);
  }
};

/* ─── Deudas ─────────────────────────────────────────────────────────────────── */

// POST /api/cobros/cargos — Carga una deuda a un jugador o a todos los jugadores activos de un equipo.
// Omite a quien ya la tiene (mensual: mismo período; única: misma descripción, sin importar mayúsculas),
// incluso si estaba marcada "no corresponde".
const crearCargos = async (req, res) => {
  try {
    const b = req.body;
    const idJugador = b.id_jugador ? Number(b.id_jugador) : null;
    const idEquipo = b.id_equipo ? Number(b.id_equipo) : null;

    const { rows: conceptos } = await query(
      `SELECT * FROM public.concepto_cobro WHERE id_concepto = $1 AND activo`, [b.id_concepto]
    );
    if (conceptos.length === 0) return respuestaError(res, 'El concepto no existe o está desactivado.', 400);
    const concepto = conceptos[0];
    if (concepto.es_mensual && (!b.periodo_mes || !b.periodo_anio)) {
      return respuestaError(res, `"${concepto.nombre}" es mensual: indicá el mes y el año.`, 400);
    }
    const mes = concepto.es_mensual ? Number(b.periodo_mes) : null;
    const anio = concepto.es_mensual ? Number(b.periodo_anio) : null;
    const descripcion = b.descripcion ? String(b.descripcion).trim() || null : null;

    let jugadores;
    if (idJugador) {
      const { rows } = await query(
        `SELECT id_jugador, nombre, apellido, to_char(fecha_baja, 'DD/MM/YYYY') AS baja,
                (fecha_baja IS NOT NULL AND $2::int IS NOT NULL AND fecha_baja < make_date($3::int, $2::int, 1)) AS baja_anterior
         FROM public.jugador WHERE id_jugador = $1 AND activo`,
        [idJugador, mes, anio]
      );
      if (rows.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
      // Cuota mensual de un mes posterior a la baja: no corresponde cargarla
      if (rows[0].baja_anterior) {
        return respuestaError(
          res,
          `${rows[0].apellido} ${rows[0].nombre} está de baja desde el ${rows[0].baja}: no se le cargan cuotas de meses posteriores.`,
          400
        );
      }
      jugadores = rows.map((r) => r.id_jugador);
    } else {
      // Solo jugadores activos y no marcados inactivos
      const { rows } = await query(
        `SELECT j.id_jugador FROM public.equipo_jugador ej
         JOIN public.jugador j ON j.id_jugador = ej.id_jugador
         WHERE ej.id_equipo = $1 AND ej.activo AND j.activo AND NOT j.es_inactivo`,
        [idEquipo]
      );
      if (rows.length === 0) return respuestaError(res, 'El equipo no tiene jugadores activos en el plantel.', 400);
      jugadores = rows.map((r) => r.id_jugador);
    }

    const { rowCount } = await query(
      `INSERT INTO public.cargo_jugador
         (id_jugador, id_concepto, id_equipo, periodo_mes, periodo_anio, descripcion, monto, fecha_vencimiento, creado_por)
       SELECT j.id, $2::bigint, $3::bigint, $4::int, $5::int, $6::varchar, $7::numeric, $8::date, $9::uuid
       FROM unnest($1::bigint[]) AS j(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.cargo_jugador c
         WHERE c.activo AND c.id_jugador = j.id AND c.id_concepto = $2
           AND CASE WHEN $4::int IS NOT NULL
                    THEN c.periodo_mes = $4::int AND c.periodo_anio = $5::int
                    ELSE c.periodo_mes IS NULL AND lower(coalesce(c.descripcion, '')) = lower(coalesce($6::varchar, '')) END
       )
       ON CONFLICT (id_jugador, id_concepto, periodo_anio, periodo_mes) WHERE activo AND periodo_mes IS NOT NULL
       DO NOTHING`,
      [jugadores, concepto.id_concepto, idEquipo, mes, anio, descripcion, Number(b.monto), b.fecha_vencimiento, req.usuario.id]
    );

    const resultado = { creados: rowCount, omitidos: jugadores.length - rowCount };
    const mensaje = rowCount === 0
      ? 'No se cargó ninguna deuda: ya la tenían todos.'
      : `Deuda cargada a ${rowCount} jugador${rowCount === 1 ? '' : 'es'}` +
        (resultado.omitidos ? ` (${resultado.omitidos} ya la tenía${resultado.omitidos === 1 ? '' : 'n'}).` : '.');
    return respuestaExito(res, resultado, mensaje, rowCount > 0 ? 201 : 200);
  } catch (error) {
    console.error('[cobro.controller] crearCargos error:', error);
    return respuestaError(res, 'Error al cargar la deuda.', 500, error.message);
  }
};

// GET /api/cobros/cargos?id_equipo=&id_jugador=&id_concepto=&estado=
const listarCargos = async (req, res) => {
  try {
    const { id_equipo, id_jugador, id_concepto, estado } = req.query;
    const params = [];
    const filtros = [];
    for (const [campo, valor] of [['id_equipo', id_equipo], ['id_jugador', id_jugador], ['id_concepto', id_concepto]]) {
      if (valor) { params.push(Number(valor)); filtros.push(`s.${campo} = $${params.length}`); }
    }
    if (estado) { params.push(String(estado)); filtros.push(`s.estado = $${params.length}`); }
    const { rows } = await query(
      `SELECT s.*, j.nombre, j.apellido
       FROM (${SQL_CARGOS_CON_SALDO}) s
       JOIN public.jugador j ON j.id_jugador = s.id_jugador
       ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
       ORDER BY s.fecha_vencimiento ASC, s.id_concepto, j.apellido, j.nombre`,
      params
    );
    return respuestaExito(res, rows, 'Deudas obtenidas correctamente.');
  } catch (error) {
    console.error('[cobro.controller] listarCargos error:', error);
    return respuestaError(res, 'Error al obtener las deudas.', 500, error.message);
  }
};

// GET /api/cobros/jugadores/:id/estado-cuenta — Deudas con sus pagos (también los anulados) y totales
const estadoCuenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: jug } = await query(
      `SELECT j.id_jugador, j.nombre, j.apellido, j.es_inactivo, ${sqlDeudaJugador('j')}
       FROM public.jugador j WHERE j.id_jugador = $1 AND j.activo`,
      [id]
    );
    if (jug.length === 0) return respuestaError(res, 'Jugador no encontrado.', 404);
    const { rows: cargos } = await query(
      `SELECT s.*, eq.nombre_equipo,
              COALESCE((
                SELECT json_agg(json_build_object(
                         'id_pago', p.id_pago, 'monto', p.monto, 'fecha_pago', p.fecha_pago,
                         'metodo_pago', p.metodo_pago, 'observaciones', p.observaciones, 'activo', p.activo,
                         'referencia', p.referencia, 'recibido_por', p.recibido_por,
                         'motivo_anulacion', p.motivo_anulacion, 'registrado_por', pu.nombre_completo)
                       ORDER BY p.fecha_pago, p.id_pago)
                FROM public.pago_cargo p
                LEFT JOIN public.perfil_usuario pu ON pu.id_perfil = p.registrado_por
                WHERE p.id_cargo = s.id_cargo
              ), '[]'::json) AS pagos
       FROM (${SQL_CARGOS_CON_SALDO}) s
       LEFT JOIN public.equipo eq ON eq.id_equipo = s.id_equipo
       WHERE s.id_jugador = $1
       ORDER BY ${ORDEN_ESTADO}, s.fecha_vencimiento ASC`,
      [id]
    );
    return respuestaExito(res, { ...jug[0], cargos }, 'Estado de cuenta obtenido correctamente.');
  } catch (error) {
    console.error('[cobro.controller] estadoCuenta error:', error);
    return respuestaError(res, 'Error al obtener el estado de cuenta.', 500, error.message);
  }
};

/* ─── Pagos ──────────────────────────────────────────────────────────────────── */

// POST /api/cobros/cargos/:id/pagos — Pago total o parcial. Si no es canje, entra a la caja en la misma transacción.
const registrarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const monto = Number(req.body.monto);
    const metodo = req.body.metodo_pago;
    const observaciones = String(req.body.observaciones ?? '').trim() || null;
    const referencia = String(req.body.referencia ?? '').trim() || null;
    const recibidoPor = String(req.body.recibido_por ?? '').trim() || null;
    if (metodo === 'Canje' && !observaciones) {
      return respuestaError(res, 'En un canje, indicá en observaciones qué se recibió a cambio.', 400);
    }

    const resultado = await withTransaction(async (client) => {
      // FOR UPDATE: dos cobros simultáneos de la misma deuda se ejecutan uno después del otro
      const { rows } = await client.query(
        `SELECT c.*, cc.nombre AS concepto, j.nombre, j.apellido
         FROM public.cargo_jugador c
         JOIN public.concepto_cobro cc ON cc.id_concepto = c.id_concepto
         JOIN public.jugador j ON j.id_jugador = c.id_jugador
         WHERE c.id_cargo = $1 AND c.activo
         FOR UPDATE OF c`,
        [id]
      );
      if (rows.length === 0) return { codigo: 404 };
      const cargo = rows[0];
      if (cargo.no_corresponde) return { codigo: 409 };

      const { rows: [{ pagado }] } = await client.query(
        `SELECT COALESCE(SUM(monto), 0) AS pagado FROM public.pago_cargo WHERE id_cargo = $1 AND activo`, [id]
      );
      const saldo = centavos(cargo.monto) - centavos(pagado);
      if (centavos(monto) > saldo) return { codigo: 400, saldo: saldo / 100 };

      const { rows: [pago] } = await client.query(
        `INSERT INTO public.pago_cargo
           (id_cargo, monto, fecha_pago, metodo_pago, observaciones, referencia, recibido_por, registrado_por)
         VALUES ($1, $2, COALESCE($3::date, ${HOY_AR}), $4, $5, $6, $7, $8) RETURNING *`,
        [id, monto, req.body.fecha_pago || null, metodo, observaciones, referencia, recibidoPor, req.usuario.id]
      );
      if (metodo !== 'Canje') {
        const periodo = etiquetaPeriodo(cargo);
        const texto = [cargo.concepto, `${cargo.apellido} ${cargo.nombre}`, periodo].filter(Boolean).join(' - ');
        await client.query(
          `INSERT INTO public.gasto_club (concepto, monto, fecha_gasto, categoria, tipo, metodo_pago, id_pago)
           VALUES ($1, $2, $3, $4, 'INGRESO', $5, $6)`,
          [texto.slice(0, 255), monto, pago.fecha_pago, cargo.concepto.slice(0, 50), metodo, pago.id_pago]
        );
      }
      return { codigo: 201, pago, saldo_restante: (saldo - centavos(monto)) / 100 };
    });

    if (resultado.codigo === 404) return respuestaError(res, 'Deuda no encontrada.', 404);
    if (resultado.codigo === 409) return respuestaError(res, 'Esta deuda está marcada como "no corresponde": no se cobra.', 409);
    if (resultado.codigo === 400) {
      return respuestaError(res, `El pago supera lo que falta pagar ($ ${resultado.saldo.toLocaleString('es-AR')}).`, 400);
    }
    return respuestaExito(
      res,
      { pago: resultado.pago, saldo_restante: resultado.saldo_restante },
      resultado.saldo_restante > 0 ? 'Pago registrado. Queda saldo pendiente.' : 'Pago registrado. La deuda quedó saldada.',
      201
    );
  } catch (error) {
    console.error('[cobro.controller] registrarPago error:', error);
    return respuestaError(res, 'Error al registrar el pago.', 500, error.message);
  }
};

// POST /api/cobros/cargos/:id/no-corresponde — La deuda queda en cero con motivo y autor; no se borra.
const marcarNoCorresponde = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM public.cargo_jugador WHERE id_cargo = $1 AND activo FOR UPDATE`, [id]
      );
      if (rows.length === 0) return { codigo: 404 };
      if (rows[0].no_corresponde) return { codigo: 409, mensaje: 'La deuda ya estaba marcada como "no corresponde".' };
      const { rows: pagos } = await client.query(
        `SELECT 1 FROM public.pago_cargo WHERE id_cargo = $1 AND activo LIMIT 1`, [id]
      );
      if (pagos.length > 0) {
        return { codigo: 409, mensaje: 'La deuda tiene pagos: para marcarla "no corresponde", primero anulá los pagos.' };
      }
      await client.query(
        `UPDATE public.cargo_jugador
         SET no_corresponde = TRUE, motivo_no_corresponde = $1, marcado_por = $2, fecha_marcado = NOW()
         WHERE id_cargo = $3`,
        [String(req.body.motivo).trim(), req.usuario.id, id]
      );
      return { codigo: 200 };
    });
    if (resultado.codigo === 404) return respuestaError(res, 'Deuda no encontrada.', 404);
    if (resultado.codigo === 409) return respuestaError(res, resultado.mensaje, 409);
    return respuestaExito(res, null, 'La deuda quedó marcada como "no corresponde".');
  } catch (error) {
    console.error('[cobro.controller] marcarNoCorresponde error:', error);
    return respuestaError(res, 'Error al marcar la deuda.', 500, error.message);
  }
};

// Anula un pago y su movimiento de caja (si tiene). Se usa desde el estado de cuenta y desde la caja.
// Devuelve 'ok' o 'no_encontrado'.
const anularPago = async (client, idPago, motivo, idUsuario) => {
  const { rows } = await client.query(
    `UPDATE public.pago_cargo
     SET activo = FALSE, motivo_anulacion = $1, anulado_por = $2, fecha_anulacion = NOW()
     WHERE id_pago = $3 AND activo
     RETURNING id_pago`,
    [motivo, idUsuario, idPago]
  );
  if (rows.length === 0) return 'no_encontrado';
  await client.query(
    `UPDATE public.gasto_club
     SET activo = FALSE, motivo_anulacion = $1, anulado_por = $2, fecha_anulacion = NOW()
     WHERE id_pago = $3 AND activo`,
    [motivo, idUsuario, idPago]
  );
  return 'ok';
};

// POST /api/cobros/pagos/:id/anular
const anularPagoHandler = async (req, res) => {
  try {
    const estado = await withTransaction((client) =>
      anularPago(client, req.params.id, String(req.body.motivo).trim(), req.usuario.id)
    );
    if (estado === 'no_encontrado') return respuestaError(res, 'Pago no encontrado o ya anulado.', 404);
    return respuestaExito(res, null, 'Pago anulado. La deuda vuelve a tener saldo.');
  } catch (error) {
    console.error('[cobro.controller] anularPago error:', error);
    return respuestaError(res, 'Error al anular el pago.', 500, error.message);
  }
};

module.exports = {
  listarConceptos,
  crearConcepto,
  actualizarConcepto,
  crearCargos,
  listarCargos,
  estadoCuenta,
  registrarPago,
  marcarNoCorresponde,
  anularPago,
  anularPagoHandler,
};
