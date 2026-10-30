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

export const campeonDeLlaves = (llaves) => {
  const final = llaves.find((l) => l.fase === 'Final');
  const ganador = final ? ganadorDeLlave(final) : null;
  if (!ganador) return null;
  const esLocal = ganador === Number(final.id_equipo_local);
  return {
    nombre: esLocal ? final.equipo_local_nombre : final.equipo_visitante_nombre,
    esClub: esLocal ? final.local_es_argentinos : final.visitante_es_argentinos,
  };
};
