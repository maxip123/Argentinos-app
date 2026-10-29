// Todas las fechas se muestran en hora del club, sin importar la zona horaria del dispositivo.
export const ZONA_CLUB = 'America/Argentina/Tucuman';
const OFFSET_CLUB = '-03:00';
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const FORMATO_CORTO = { day: '2-digit', month: '2-digit', year: 'numeric' };

export function formatFecha(valor, opciones = FORMATO_CORTO) {
  if (!valor) return '—';
  // Columnas DATE llegan como 'YYYY-MM-DD': son fechas civiles, no instantes.
  if (typeof valor === 'string' && SOLO_FECHA.test(valor)) {
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-AR', { ...opciones, timeZone: 'UTC' });
  }
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-AR', { ...opciones, timeZone: ZONA_CLUB });
}

export function formatHora(valor) {
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA_CLUB });
}

/** Fecha civil 'YYYY-MM-DD' del instante dado, en hora del club (hoy por defecto). */
export function fechaClub(valor = new Date()) {
  if (typeof valor === 'string' && SOLO_FECHA.test(valor)) return valor;
  return new Date(valor).toLocaleDateString('en-CA', { timeZone: ZONA_CLUB });
}

/** Valor para un <input type="datetime-local"> expresado en hora del club. */
export function aInputFechaHora(valor) {
  if (!valor || isNaN(new Date(valor).getTime())) return '';
  return `${fechaClub(valor)}T${formatHora(valor)}`;
}

/** Convierte lo tipeado en un datetime-local (hora del club) a ISO con offset. */
export function desdeInputFechaHora(valor) {
  return valor ? `${valor}:00${OFFSET_CLUB}` : null;
}

/** Fecha civil a instante (mediodía del club), para columnas TIMESTAMPTZ cargadas solo con día. */
export function mediodiaClub(fecha) {
  return fecha ? `${fecha}T12:00:00${OFFSET_CLUB}` : null;
}
