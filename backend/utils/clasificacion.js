// Tabla de posiciones de una división tal como se publica: endpoint público y snapshot del historial.
// No incluye quién corrigió la tabla ni el motivo (eso es auditoría del panel), ni equipos dados de baja.
const SQL_TABLA_PUBLICA = `
  SELECT c.id_clasificacion, c.id_division, c.id_equipo,
         c.puntos, c.partidos_jugados, c.partidos_ganados, c.partidos_empatados, c.partidos_perdidos,
         c.goles_a_favor, c.goles_en_contra, c.diferencia_gol,
         e.nombre_equipo, e.nombre_corto, e.logo_url, e.es_argentinos_del_norte
  FROM public.clasificacion c
  INNER JOIN public.equipo e ON e.id_equipo = c.id_equipo AND e.activo = TRUE
  WHERE c.id_division = $1 AND c.activo = TRUE
  ORDER BY c.puntos DESC, c.diferencia_gol DESC, c.goles_a_favor DESC`;

module.exports = { SQL_TABLA_PUBLICA };
