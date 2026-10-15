require('dotenv').config();
const { getPool } = require('../config/db');

async function checkDiff() {
  const pool = getPool();
  try {
    const requiredTables = [
      'sede', 'division', 'equipo', 'jugador', 'equipo_jugador',
      'cuerpo_tecnico', 'equipo_cuerpo_tecnico', 'partido',
      'partido_estadistica_jugador', 'sancion_jugador', 'clasificacion',
      'llave_playoff', 'perfil_usuario', 'cuota_jugador', 'gasto_club', 'historial_torneo'
    ];

    console.log('--- REVISANDO TABLAS ---');
    for (const table of requiredTables) {
      const { rows } = await pool.query(`SELECT to_regclass('public.${table}') as t;`);
      const exists = !!rows[0].t;
      console.log(`Tabla [${table}]: ${exists ? '✅ EXISTE' : '❌ FALTA'}`);
    }

    console.log('\n--- REVISANDO COLUMNAS CRÍTICAS ---');
    const { rows: cuotaCols } = await pool.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'cuota_jugador' AND column_name IN ('id_division', 'id_jugador', 'periodo_mes', 'periodo_anio');
    `);
    console.log('Columnas cuota_jugador:', cuotaCols);

    const { rows: constraints } = await pool.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'public.cuota_jugador'::regclass;
    `);
    console.log('Constraints cuota_jugador:', constraints.map(c => c.conname));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDiff();
