export const ETIQUETA_COPA = { Unica: 'Playoff', Oro: 'Copa Oro', Plata: 'Copa Plata' };

const ORDEN_FASES = {
  '16avos de Final': 1,
  'Octavos de Final': 2,
  'Cuartos de Final': 3,
  'Semifinal': 4,
  'Final': 5,
};

// Los snapshots de historial_torneo guardan los equipos con otros nombres de campo
// y los anteriores a las copas no tienen el campo copa
export const normalizarLlave = (l) => ({
  ...l,
  copa: l.copa || 'Unica',
  equipo_local_nombre: l.equipo_local_nombre ?? l.local_nombre,
  equipo_visitante_nombre: l.equipo_visitante_nombre ?? l.visitante_nombre,
  logo_local: l.logo_local ?? l.local_logo,
  logo_visitante: l.logo_visitante ?? l.visitante_logo,
});

// Copas presentes en el torneo, siempre con Oro antes que Plata
export const copasDe = (llaves) =>
  ['Unica', 'Oro', 'Plata'].filter((copa) => llaves.some((l) => l.copa === copa));

export const agruparPorFase = (llaves) => {
  const fasesMap = {};
  llaves.forEach((llave) => {
    const fase = llave.fase || 'Playoffs';
    if (!fasesMap[fase]) fasesMap[fase] = [];
    fasesMap[fase].push(llave);
  });
  const fasesOrdenadas = Object.keys(fasesMap).sort(
    (a, b) => (ORDEN_FASES[a] || 99) - (ORDEN_FASES[b] || 99)
  );
  return { fasesMap, fasesOrdenadas };
};

export const ganadorDeLlave = (llave) => {
  if (llave.estado_partido !== 2) return null;
  const gl = llave.goles_local;
  const gv = llave.goles_visitante;
  if (gl === null || gv === null) return null;
  if (gl > gv) return Number(llave.id_equipo_local);
  if (gv > gl) return Number(llave.id_equipo_visitante);
  return llave.id_equipo_ganador ? Number(llave.id_equipo_ganador) : null;
};

// ─── Formato de los cruces y partidos reales del cruce ───────────────────────

export const FORMATOS_CRUCE = [
  { valor: 'unico', etiqueta: 'Partido único' },
  { valor: 'ida_vuelta', etiqueta: 'Ida y vuelta' },
];

const NOMBRE_JUEGO = { 1: 'Ida', 2: 'Vuelta' };

// "Semifinal · Ida", "Semifinal · Vuelta" o "Final" (igual que el backend)
export const nombrePartidoCruce = (fase, formato, numeroJuego) =>
  formato === 'ida_vuelta' ? `${fase} · ${NOMBRE_JUEGO[numeroJuego]}` : fase;

const mismo = (a, b) => a !== null && a !== undefined && Number(a) === Number(b);
// Goles de un equipo en un partido, sin importar si jugó de local o visitante
const golesDe = (p, idEquipo) => Number(mismo(p.id_equipo_local, idEquipo) ? p.goles_local : p.goles_visitante);

/**
 * Resumen de un cruce para mostrar: el global (desde el local y el visitante DEL CRUCE),
 * cada partido y el desempate ("(4-3 pen.)" o "(pasa X)").
 * Acepta llaves de snapshots viejos, con los goles y penales cargados en la propia llave.
 */
export const resumenCruce = (llaveCruda) => {
  const l = normalizarLlave(llaveCruda);
  const L = l.id_equipo_local;
  const V = l.id_equipo_visitante;
  const nombreDe = (id) => (mismo(id, L) ? l.equipo_local_nombre : mismo(id, V) ? l.equipo_visitante_nombre : null);

  if (!Array.isArray(l.partidos)) {
    const hay = l.goles_local !== null && l.goles_local !== undefined && l.goles_visitante !== null && l.goles_visitante !== undefined;
    const global = hay ? { local: Number(l.goles_local), visitante: Number(l.goles_visitante) } : null;
    let desempate = null;
    if (global && global.local === global.visitante) {
      if (l.penales_local !== null && l.penales_local !== undefined && l.penales_visitante !== null && l.penales_visitante !== undefined) {
        desempate = `(${l.penales_local}-${l.penales_visitante} pen.)`;
      } else if (l.id_equipo_ganador && nombreDe(l.id_equipo_ganador)) {
        desempate = `(pasa ${nombreDe(l.id_equipo_ganador)})`;
      }
    }
    return { global, partidos: [], desempate };
  }

  const ordenados = [...l.partidos].sort((a, b) => Number(a.numero_juego) - Number(b.numero_juego));
  const partidos = ordenados.map((p) => {
    const jugado = Number(p.estado_partido) === 2;
    return {
      ...p,
      etiqueta: l.formato === 'ida_vuelta' ? NOMBRE_JUEGO[p.numero_juego] : '',
      jugado,
      local: jugado ? golesDe(p, L) : null,
      visitante: jugado ? golesDe(p, V) : null,
    };
  });
  const jugados = partidos.filter((p) => p.jugado);
  const global = jugados.length
    ? jugados.reduce((acc, p) => ({ local: acc.local + p.local, visitante: acc.visitante + p.visitante }), { local: 0, visitante: 0 })
    : null;

  let desempate = null;
  const decisivo = jugados.find((p) => Number(p.numero_juego) === (l.formato === 'ida_vuelta' ? 2 : 1));
  if (global && decisivo && global.local === global.visitante) {
    if (decisivo.penales_local !== null && decisivo.penales_local !== undefined
      && decisivo.penales_visitante !== null && decisivo.penales_visitante !== undefined) {
      const deL = mismo(decisivo.id_equipo_local, L);
      desempate = `(${deL ? decisivo.penales_local : decisivo.penales_visitante}-${deL ? decisivo.penales_visitante : decisivo.penales_local} pen.)`;
    } else if (decisivo.id_equipo_desempate && nombreDe(decisivo.id_equipo_desempate)) {
      desempate = `(pasa ${nombreDe(decisivo.id_equipo_desempate)})`;
    }
  }
  return { global, partidos, desempate };
};

/**
 * ¿Al cargar este resultado (gl - gv, desde el local del partido) hay que elegir quién pasa?
 * Usa los campos que agrega GET /partidos: cruce_formato, numero_juego y cruce_otro_partido.
 * Es la misma regla que el backend (utils/cruces.js).
 */
export const necesitaDesempateFront = (partido, golesLocal, golesVisitante) => {
  if (!partido?.id_llave) return false;
  const gl = Number(golesLocal);
  const gv = Number(golesVisitante);
  if (partido.cruce_formato !== 'ida_vuelta') return gl === gv;
  if (Number(partido.numero_juego) !== 2) return false;
  const ida = partido.cruce_otro_partido;
  if (!ida || Number(ida.estado_partido) !== 2) return false;
  const totalLocal = gl + golesDe(ida, partido.id_equipo_local);
  const totalVisitante = gv + golesDe(ida, partido.id_equipo_visitante);
  return totalLocal === totalVisitante;
};

// Valores iniciales del formulario de desempate a partir del partido guardado
export const desempateInicial = (p) => ({
  id_equipo_desempate: p?.id_equipo_desempate ? String(p.id_equipo_desempate) : '',
  penales_local: p?.penales_local ?? '',
  penales_visitante: p?.penales_visitante ?? '',
});

export const campeonDeLlaves = (llaves) => {
  const final = llaves.find((l) => l.fase === 'Final');
  const ganador = final ? ganadorDeLlave(final) : null;
  if (!ganador) return null;
  const esLocal = ganador === Number(final.id_equipo_local);
  return {
    nombre: esLocal ? final.equipo_local_nombre : final.equipo_visitante_nombre,
    esClub: esLocal ? final.local_es_argentinos : final.visitante_es_argentinos,
    logo: esLocal ? final.logo_local : final.logo_visitante,
    nombreCorto: esLocal ? final.nombre_corto_local : final.nombre_corto_visitante,
  };
};
