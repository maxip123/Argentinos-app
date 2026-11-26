// Cobros y deudas por concepto: constantes y formatos compartidos por Finanzas y la planilla por equipo.

export const METODOS_PAGO = ['Efectivo', 'Transferencia', 'MercadoPago', 'Débito', 'Crédito', 'Otro', 'Canje'];

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function formatearMonto(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

// "Noviembre 2026" para conceptos mensuales; si no, la descripción
export const etiquetaPeriodo = (cargo) =>
  cargo.periodo_mes ? `${MESES[cargo.periodo_mes - 1]} ${cargo.periodo_anio}` : cargo.descripcion || '';

// Concepto + período, para títulos y columnas de la planilla
export const tituloDeuda = (cargo) => [cargo.concepto, etiquetaPeriodo(cargo)].filter(Boolean).join(' · ');

// Estados de una deuda (los calcula el backend)
export const COLOR_ESTADO_DEUDA = {
  Vencida: 'bg-red-50 text-red-700 border border-red-200',
  Parcial: 'bg-amber-50 text-amber-700 border border-amber-200',
  Pendiente: 'bg-slate-100 text-slate-700 border border-slate-200',
  Pagada: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'No corresponde': 'bg-slate-50 text-slate-400 border border-slate-200',
};

// Monto escrito por la persona: acepta "20000", "20000,50" o "20000.50"; null si no es un monto válido.
// No acepta separador de miles ("20.000"), igual que el backend.
export function leerMonto(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 ? limpio : null;
}

// Vencimiento sugerido para un concepto mensual: el día 10 de ese mes
export const vencimientoSugerido = (mes, anio) => `${anio}-${String(mes).padStart(2, '0')}-10`;

export const nombreJugador = (j) => [j.apellido, j.nombre].filter(Boolean).join(', ');

// Resumen para los listados de jugadores y planteles (reemplaza al "vence el ..." de la cuota)
const VERDE = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
export function resumenDeudaJugador(j) {
  if (j.es_inactivo || j.estado_cuota === 'Inactivo') {
    return { badge: 'Inactivo', badgeColor: 'bg-slate-100 text-slate-500', texto: 'Socio inactivo', color: 'text-slate-400' };
  }
  const vencida = Number(j.deuda_vencida) || 0;
  const total = Number(j.deuda_total) || 0;
  if (vencida > 0) {
    return { badge: 'Debe', badgeColor: 'bg-red-50 text-red-700 border border-red-200', texto: `Vencido: ${formatearMonto(vencida)}`, color: 'text-red-600' };
  }
  if (total > 0) return { badge: 'Al día', badgeColor: VERDE, texto: `Por vencer: ${formatearMonto(total)}`, color: 'text-slate-600' };
  return { badge: 'Al día', badgeColor: VERDE, texto: 'Sin deudas', color: 'text-emerald-700' };
}
