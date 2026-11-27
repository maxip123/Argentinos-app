// Zonas de un torneo (equipo.zona). Sin zonas, el torneo tiene una sola tabla.

const clave = (zona) => String(zona ?? '').trim().toLowerCase() || null;

/**
 * Agrupa filas (de tabla o de equipos) por su campo `zona`.
 * Sin ninguna zona: un solo grupo { zona: null, titulo: null }.
 * Con zonas: un grupo por zona ("Zona A"...), ordenados por nombre, y "Sin zona" al final si hace falta.
 * No distingue mayúsculas; el título usa la primera escritura encontrada.
 */
export function agruparPorZona(filas = []) {
  if (!filas.some((f) => clave(f.zona))) return [{ zona: null, titulo: null, filas: [...filas] }];
  const grupos = new Map();
  const sinZona = [];
  filas.forEach((f) => {
    const k = clave(f.zona);
    if (!k) return sinZona.push(f);
    if (!grupos.has(k)) grupos.set(k, { zona: String(f.zona).trim(), titulo: `Zona ${String(f.zona).trim()}`, filas: [] });
    grupos.get(k).filas.push(f);
  });
  const ordenados = [...grupos.values()].sort((a, b) => a.zona.localeCompare(b.zona, 'es', { numeric: true }));
  if (sinZona.length) ordenados.push({ zona: null, titulo: 'Sin zona', filas: sinZona });
  return ordenados;
}

// Partido de fase de grupos entre equipos de zonas distintas (los de un cruce del cuadro no cuentan)
export const esInterzonal = (p) => {
  if (p.id_llave) return false;
  const a = clave(p.zona_local);
  const b = clave(p.zona_visitante);
  return Boolean(a && b && a !== b);
};

// Zonas distintas ya usadas (para sugerir al cargar un equipo)
export const zonasExistentes = (equipos = []) =>
  agruparPorZona(equipos).filter((g) => g.zona).map((g) => g.zona);
