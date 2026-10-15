require('dotenv').config();
const { query } = require('../config/db');

async function checkDivs() {
  for (let id = 1; id <= 8; id++) {
    const teams = await query('SELECT count(*) FROM equipo WHERE id_division = $1', [id]);
    const matches = await query('SELECT count(*) FROM partido WHERE id_division = $1', [id]);
    const d = await query('SELECT id_division, nombre_division, activo, terminado FROM division WHERE id_division = $1', [id]);
    if (d.rows.length) {
      console.log(`Division ${id}: ${d.rows[0].nombre_division} (equipos: ${teams.rows[0].count}, partidos: ${matches.rows[0].count}, activo: ${d.rows[0].activo}, terminado: ${d.rows[0].terminado})`);
    }
  }
  process.exit(0);
}

checkDivs();
