// Cruces del cuadro (llave_playoff) jugados con partidos reales (partido.id_llave).
// decidirCruce es pura; recalcularLlave la aplica dentro de una transacción y mueve al ganador
// a la ronda siguiente. La llaman todos los handlers que tocan un partido de cruce.

const MENSAJE_EMPATE = 'El cruce está empatado: elegí quién pasa.';

class ErrorCruce extends Error {
  constructor(mensaje, status = 409) {
    super(mensaje);
    this.status = status;
  }
}

const golesDe = (partido, idEquipo) =>
  Number(partido.id_equipo_local) === Number(idEquipo) ? Number(partido.goles_local) : Number(partido.goles_visitante);

// Goles de L y V (local y visitante del cruce) sumados sobre los partidos dados
function sumar(llave, partidos) {
  return partidos.reduce(
    (acc, p) => ({
      local: acc.local + golesDe(p, llave.id_equipo_local),
      visitante: acc.visitante + golesDe(p, llave.id_equipo_visitante),
    }),
    { local: 0, visitante: 0 }
  );
}

// El partido que define el cruce: el único, o la vuelta (con la ida ya jugada)
function partidoDecisivo(llave, finalizados) {
  if (llave.formato === 'ida_vuelta') {
    const ida = finalizados.find((p) => Number(p.numero_juego) === 1);
    const vuelta = finalizados.find((p) => Number(p.numero_juego) === 2);
    return ida && vuelta ? vuelta : null;
  }
  return finalizados.find((p) => Number(p.numero_juego) === 1) || null;
}

/**
 * Decide el cruce a partir de sus partidos activos.
 * Devuelve los goles desde el punto de vista del local y el visitante DEL CRUCE (no de cada partido).
 * estado_partido: 0 sin partidos jugados, 1 en curso o sin definir, 2 definido.
 * error: el partido decisivo terminó empatado sin elegir quién pasa.
 */
function decidirCruce(llave, partidos) {
  const finalizados = partidos.filter((p) => Number(p.estado_partido) === 2);
  if (finalizados.length === 0) {
    return { goles_local: null, goles_visitante: null, id_equipo_ganador: null, estado_partido: 0, error: null };
  }
  const global = sumar(llave, finalizados);
  const base = { goles_local: global.local, goles_visitante: global.visitante, id_equipo_ganador: null, estado_partido: 1, error: null };
  const decisivo = partidoDecisivo(llave, finalizados);
  if (!decisivo) return base;

  if (global.local !== global.visitante) {
    const ganador = global.local > global.visitante ? llave.id_equipo_local : llave.id_equipo_visitante;
    return { ...base, id_equipo_ganador: Number(ganador), estado_partido: 2 };
  }
  const elegido = Number(decisivo.id_equipo_desempate);
  if (elegido && [Number(llave.id_equipo_local), Number(llave.id_equipo_visitante)].includes(elegido)) {
    return { ...base, id_equipo_ganador: elegido, estado_partido: 2 };
  }
  return { ...base, error: MENSAJE_EMPATE };
}

/**
 * ¿El partido editado es el que define el cruce y, con sus goles, el cruce queda empatado?
 * partidos: los OTROS partidos activos del cruce.
 */
function necesitaDesempate(llave, partidos, editado) {
  if (llave.formato === 'ida_vuelta') {
    if (Number(editado.numero_juego) !== 2) return false;
    const ida = partidos.find((p) => Number(p.numero_juego) === 1 && Number(p.estado_partido) === 2);
    if (!ida) return false;
    const global = sumar(llave, [ida, editado]);
    return global.local === global.visitante;
  }
  return Number(editado.goles_local) === Number(editado.goles_visitante);
}

/**
 * Recalcula el cruce (bloqueado con FOR UPDATE), guarda goles/ganador/estado y lleva al ganador
 * al cupo de la ronda siguiente. Si ese cupo cambia y la ronda siguiente ya tiene partidos jugados,
 * lanza ErrorCruce 409; si solo tenía partidos programados, los da de baja.
 */
async function recalcularLlave(client, idLlave) {
  const { rows: [llave] } = await client.query(
    `SELECT * FROM public.llave_playoff WHERE id_llave = $1 AND activo FOR UPDATE`, [idLlave]
  );
  if (!llave) throw new ErrorCruce('Cruce no encontrado.', 404);
  const { rows: partidos } = await client.query(
    `SELECT * FROM public.partido WHERE id_llave = $1 AND activo`, [idLlave]
  );
  const r = decidirCruce(llave, partidos);

  const { rows: [actualizada] } = await client.query(
    `UPDATE public.llave_playoff
     SET goles_local = $1, goles_visitante = $2, id_equipo_ganador = $3, estado_partido = $4, updated_at = NOW()
     WHERE id_llave = $5 RETURNING *`,
    [r.goles_local, r.goles_visitante, r.id_equipo_ganador, r.estado_partido, idLlave]
  );

  if (llave.id_llave_siguiente) {
    const campo = llave.es_local_siguiente ? 'id_equipo_local' : 'id_equipo_visitante';
    const { rows: [siguiente] } = await client.query(
      `SELECT * FROM public.llave_playoff WHERE id_llave = $1 AND activo FOR UPDATE`, [llave.id_llave_siguiente]
    );
    const nuevo = r.id_equipo_ganador ? Number(r.id_equipo_ganador) : null;
    const actual = siguiente && siguiente[campo] ? Number(siguiente[campo]) : null;
    if (siguiente && actual !== nuevo) {
      const { rows: [{ jugados }] } = await client.query(
        `SELECT count(*)::int AS jugados FROM public.partido WHERE id_llave = $1 AND activo AND estado_partido = 2`,
        [siguiente.id_llave]
      );
      if (jugados > 0) {
        throw new ErrorCruce('La ronda siguiente ya se jugó con el ganador anterior. Anulá primero esos partidos.');
      }
      // Los partidos programados de la ronda siguiente eran con otro equipo: ya no corresponden
      await client.query(
        `UPDATE public.partido SET activo = FALSE, updated_at = NOW() WHERE id_llave = $1 AND activo`, [siguiente.id_llave]
      );
      await client.query(
        `UPDATE public.llave_playoff SET ${campo} = $1, updated_at = NOW() WHERE id_llave = $2`, [nuevo, siguiente.id_llave]
      );
      await recalcularLlave(client, siguiente.id_llave);
    }
  }
  return actualizada;
}

module.exports = { decidirCruce, necesitaDesempate, recalcularLlave, ErrorCruce, MENSAJE_EMPATE };
