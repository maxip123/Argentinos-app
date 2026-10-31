// Categoría de los movimientos de caja generados al cobrar una cuota
const CATEGORIA_CUOTA = 'Cuota Socio';

const calcularVencimiento = (fechaPago) => {
  const vencimiento = new Date(fechaPago);
  vencimiento.setDate(vencimiento.getDate() + 31);
  return vencimiento;
};

// Vincula cada cobro con su cuota a partir del concepto ('Cuota - Apellido Nombre - Oct 2026').
// Solo vincula cuando coincide exactamente una cuota.
const SQL_VINCULAR_COBROS = `
  WITH meses(n, m) AS (
    VALUES (1,'Ene'),(2,'Feb'),(3,'Mar'),(4,'Abr'),(5,'May'),(6,'Jun'),
           (7,'Jul'),(8,'Ago'),(9,'Sep'),(10,'Oct'),(11,'Nov'),(12,'Dic')
  ),
  candidatos AS (
    SELECT g.id_gasto, MIN(c.id_cuota) AS id_cuota, COUNT(*) AS coincidencias
    FROM public.gasto_club g
    JOIN public.jugador j ON TRUE
    JOIN public.cuota_jugador c ON c.id_jugador = j.id_jugador
    JOIN meses ON meses.n = c.periodo_mes
    WHERE g.categoria = '${CATEGORIA_CUOTA}'
      AND g.id_cuota IS NULL
      AND g.concepto = 'Cuota - ' || j.apellido || ' ' || j.nombre || ' - ' || meses.m || ' ' || c.periodo_anio
    GROUP BY g.id_gasto
  )
  UPDATE public.gasto_club g
  SET id_cuota = candidatos.id_cuota
  FROM candidatos
  WHERE g.id_gasto = candidatos.id_gasto AND candidatos.coincidencias = 1`;

module.exports = { CATEGORIA_CUOTA, SQL_VINCULAR_COBROS, calcularVencimiento };
