require('dotenv').config();
const { query } = require('../config/db');

async function fix() {
  await query("UPDATE public.division SET nombre_division = 'Femenino Primera', terminado = TRUE WHERE id_division = 8;");
  // Clean duplicate empty divisions 5, 6, 7 if empty
  await query("DELETE FROM public.division WHERE id_division IN (5, 6, 7) AND id_division NOT IN (SELECT DISTINCT id_division FROM equipo) AND id_division NOT IN (SELECT DISTINCT id_division FROM partido);");
  console.log('Divisions cleaned.');
  const { rows } = await query("SELECT id_division, nombre_division, temporada, terminado FROM public.division ORDER BY id_division;");
  console.table(rows);
  process.exit(0);
}

fix();
