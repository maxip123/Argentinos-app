// Deudas por concepto: saldo de cada deuda y estado del jugador, compartido por cobros, jugadores,
// planteles y el resumen de caja. Los canjes también saldan; "no corresponde" deja la deuda en cero.
// Una deuda vence al día siguiente de su fecha de vencimiento (fecha < hoy).

// Fecha de hoy en Argentina: la base corre en UTC y a las 21 h ya sería mañana
const HOY_AR = "(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito', 'Otro', 'Canje'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Deudas activas con lo pagado, el saldo y el estado. Vencida tiene prioridad sobre Parcial: lo que importa
// es que hay plata atrasada.
const SQL_CARGOS_CON_SALDO = `
  SELECT c.*, cc.nombre AS concepto, cc.es_mensual,
         COALESCE(p.pagado, 0) AS pagado,
         CASE WHEN c.no_corresponde THEN 0 ELSE GREATEST(c.monto - COALESCE(p.pagado, 0), 0) END AS saldo,
         COALESCE(p.tiene_canje, FALSE) AS tiene_canje,
         CASE
           WHEN c.no_corresponde THEN 'No corresponde'
           WHEN COALESCE(p.pagado, 0) >= c.monto THEN 'Pagada'
           WHEN c.fecha_vencimiento < ${HOY_AR} THEN 'Vencida'
           WHEN COALESCE(p.pagado, 0) > 0 THEN 'Parcial'
           ELSE 'Pendiente'
         END AS estado
  FROM public.cargo_jugador c
  JOIN public.concepto_cobro cc ON cc.id_concepto = c.id_concepto
  LEFT JOIN LATERAL (
    SELECT SUM(pc.monto) AS pagado, BOOL_OR(pc.metodo_pago = 'Canje') AS tiene_canje
    FROM public.pago_cargo pc
    WHERE pc.id_cargo = c.id_cargo AND pc.activo
  ) p ON TRUE
  WHERE c.activo`;

// Saldo que debe el jugador (alias de la tabla jugador en la consulta), total o solo lo vencido
const exprDeuda = (aliasJugador, soloVencida = false) => `(
    SELECT COALESCE(SUM(GREATEST(c.monto - COALESCE((
             SELECT SUM(pc.monto) FROM public.pago_cargo pc WHERE pc.id_cargo = c.id_cargo AND pc.activo
           ), 0), 0)), 0)
    FROM public.cargo_jugador c
    WHERE c.activo AND NOT c.no_corresponde AND c.id_jugador = ${aliasJugador}.id_jugador
      ${soloVencida ? `AND c.fecha_vencimiento < ${HOY_AR}` : ''}
  )`;

const sqlDeudaJugador = (aliasJugador) =>
  `${exprDeuda(aliasJugador)} AS deuda_total, ${exprDeuda(aliasJugador, true)} AS deuda_vencida`;

const sqlEstadoCuota = (aliasJugador) => `CASE
    WHEN ${aliasJugador}.es_inactivo THEN 'Inactivo'
    WHEN ${exprDeuda(aliasJugador, true)} > 0 THEN 'Pendiente'
    ELSE 'Al dia'
  END`;

// "Noviembre 2026" para conceptos mensuales; si no, la descripción (o nada)
const etiquetaPeriodo = (cargo) =>
  cargo.periodo_mes ? `${MESES[cargo.periodo_mes - 1]} ${cargo.periodo_anio}` : cargo.descripcion || '';

module.exports = { HOY_AR, METODOS_PAGO, SQL_CARGOS_CON_SALDO, exprDeuda, sqlDeudaJugador, sqlEstadoCuota, etiquetaPeriodo };
